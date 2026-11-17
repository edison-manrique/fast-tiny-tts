/* fast-tiny-tts in-browser engine — Web Worker.
 *
 * Phonemizer: the official dizione package running under Pyodide
 * (the exact official engine from tiny-voca-studio).
 *
 * Synthesizer: onnx/model.onnx via onnxruntime-web, WebGPU with WASM fallback.
 */
"use strict";

const CACHE_VERSION = "fast-tiny-tts-engine-v10";
const HF_REPO = "https://huggingface.co/n4ze3m/tiny-voca/resolve/main";
const DIZIONE_COMMIT = "8cd889e4de7be6bd1dd2e6891344a0729fa14dd4";
const DIZIONE_CDN = `https://cdn.jsdelivr.net/gh/n4ze3m/dizione@${DIZIONE_COMMIT}/src/dizione`;
const DIZIONE_RAW = `https://raw.githubusercontent.com/n4ze3m/dizione/${DIZIONE_COMMIT}/src/dizione`;
const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

const SAMPLE_RATE = 24000;
const PEAK = 0.99;
const MAX_TOKENS = 512;
const TOKEN_LIMIT = MAX_TOKENS - 12;
const ENGLISH_ONLY = "fast-tiny-tts only reads English for now";

// The dizione package files (src/dizione/**), loaded into Pyodide's virtual FS.
const DIZIONE_FILES = [
  "__init__.py", "__main__.py", "align.py", "convert.py", "engine.py", "g2p.py",
  "homographs.py", "morphology.py", "normalize.py", "sentence.py", "symbols.py", "tables.py",
  "data/abbreviations.txt", "data/chat.txt", "data/endings.txt", "data/exceptions.txt",
  "data/function_words.txt", "data/homograph_fixes.txt", "data/homograph_rules.txt",
  "data/letters.txt", "data/phrases.txt", "data/units.txt",
];

// The model repo's phonemizer/ directory (DIZIONE_DATA).
const DATA_FILES = [
  "lexicon.tsv", "lexicon.json", "align.json", "g2p.json", "g2p.npz",
  "homographs.json", "sources.json",
];

importScripts(PYODIDE_BASE + "pyodide.js", ORT_BASE + "ort.webgpu.min.js");
ort.env.wasm.wasmPaths = ORT_BASE;
ort.env.wasm.numThreads = 1;

let pyodide = null;
let phonemize = null;
let session = null;
let ep = "wasm";
let config = null;

function status(message, progress) {
  self.postMessage({ type: "status", message, progress });
}

/* Fetch with Cache Storage (local first, fallback to CDN/HF) */
async function cached(urls, onProgress) {
  const store = await caches.open(CACHE_VERSION);
  const list = Array.isArray(urls) ? urls : [urls];

  for (const u of list) {
    try {
      const hit = await store.match(u);
      if (hit) return new Uint8Array(await hit.arrayBuffer());
    } catch (_) {}
  }

  let lastError = null;
  for (const url of list) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
      const total = +resp.headers.get("content-length") || 0;
      const reader = resp.body.getReader();
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (onProgress) onProgress(received, total);
      }
      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      store.put(url, new Response(bytes.slice(0))).catch(() => {});
      return bytes;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to load ${list[0]}`);
}

async function fetchText(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return await resp.text();
      lastError = new Error(`HTTP ${resp.status}: ${url}`);
    } catch (err) { lastError = err; }
  }
  throw lastError;
}

/* --- Sentence Splitting (mirrored from tiny_voca/infer.py) --- */

const ABBREVIATIONS = /(?:\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|no|inc|ltd|co|e\.g|i\.e|a\.m|p\.m)|\b[A-Z])\.$/i;
const SENTENCE_END = /(?<=[.!?…]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/;
const CLAUSE_END = /(?<=[,;:—])\s+/;
const CLOSING = /["'”’)\]»]+$/;

function sentences(text) {
  const parts = [];
  let current = "";
  for (const piece of text.replace(/[\s\uFEFF]+/g, " ").trim().split(SENTENCE_END)) {
    current = current ? current + " " + piece : piece;
    if (!ABBREVIATIONS.test(current)) { parts.push(current); current = ""; }
  }
  if (current) parts.push(current);
  return parts.filter((part) => /[\p{L}\p{N}]/u.test(part));
}

function finished(text) {
  const body = text.replace(/[\s\uFEFF]+$/, "");
  if (!body) return text;
  const last = body.split(/[\s\uFEFF]+/).pop();
  let marked;
  if (/[\p{L}\p{N}]/u.test(last)) {
    marked = /[.!?…,;:]/.test(last.replace(CLOSING, "").slice(-1));
  } else {
    marked = /[.!?…]/.test(last) || last === "," || last === ";" || last === ":";
  }
  return marked ? text : body + ".";
}

function shorter(piece) {
  const clauses = piece.split(CLAUSE_END);
  if (clauses.length > 1) return clauses;
  const words = piece.split(" ");
  if (words.length < 2) return [];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
}

function limitPeak(samples) {
  let loudest = 0;
  for (let i = 0; i < samples.length; i++) loudest = Math.max(loudest, Math.abs(samples[i]));
  if (loudest > PEAK) for (let i = 0; i < samples.length; i++) samples[i] *= PEAK / loudest;
  return samples;
}

/* --- Engine & Synthesis --- */

function phonemizePiece(piece) {
  try {
    return JSON.parse(phonemize(piece));
  } catch (err) {
    return null;
  }
}

async function synthesize(phones, voiceId, speed, pitchShift, pitchRange) {
  const count = phones.ids.length;
  const integers = (values) => new ort.Tensor("int64", BigInt64Array.from(values, BigInt), [1, count]);
  const scalar = (value) => new ort.Tensor("float32", Float32Array.from([value]), [1]);
  const output = await session.run({
    tokens: integers(phones.ids),
    stress: integers(phones.stress),
    voice: new ort.Tensor("int64", BigInt64Array.from([BigInt(voiceId)]), [1]),
    speed: scalar(speed),
    pitch_shift: scalar(pitchShift),
    pitch_range: scalar(pitchRange),
  });
  const audio = output.audio.data;
  for (let i = 0; i < audio.length; i++) {
    if (!Number.isFinite(audio[i])) throw new Error("model produced non-finite audio");
  }
  return audio;
}

async function makeSession(modelBytes) {
  const warmup = async () => {
    const phones = phonemizePiece("Hello!");
    if (phones) await synthesize(phones, 0, 1.0, 0.0, 1.0);
  };
  if (typeof navigator !== "undefined" && navigator.gpu) {
    try {
      status("Iniciando aceleración WebGPU…", 0.92);
      session = await ort.InferenceSession.create(modelBytes, { executionProviders: ["webgpu", "wasm"] });
      ep = "webgpu";
      await warmup();
      return;
    } catch (err) {
      console.warn("WebGPU session failed, falling back to WASM:", err);
      session = null;
    }
  }
  status("Iniciando modelo con WASM…", 0.92);
  session = await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"] });
  ep = "wasm";
  await warmup();
}

async function load() {
  status("Descargando modelo ONNX…", 0.05);
  const [, modelBytes] = await Promise.all([
    (async () => {
      const cfgBytes = await cached([`./dist/models/tiny-voca/config.json`, `${HF_REPO}/config.json`]);
      config = JSON.parse(new TextDecoder().decode(cfgBytes));
    })(),
    cached([`./dist/models/tiny-voca/model.onnx`, `${HF_REPO}/onnx/model.onnx`], (received, total) => {
      const frac = total ? received / total : 0;
      status(`Descargando modelo ONNX… ${(received / 1e6).toFixed(1)} MB`, 0.05 + 0.45 * frac);
    }),
  ]);

  status("Cargando datos del fonemizador dizione…", 0.52);
  const dataBytes = [];
  for (let i = 0; i < DATA_FILES.length; i++) {
    const name = DATA_FILES[i];
    dataBytes.push(await cached([
      `./dist/models/tiny-voca/phonemizer/${name}`,
      `${HF_REPO}/phonemizer/${name}`
    ]));
    status("Cargando datos de dizione…", 0.52 + 0.14 * ((i + 1) / DATA_FILES.length));
  }

  status("Cargando módulos de dizione…", 0.68);
  const sourceTexts = [];
  for (let i = 0; i < DIZIONE_FILES.length; i++) {
    const name = DIZIONE_FILES[i];
    sourceTexts.push(await fetchText([
      `./dizione/${name}`,
      `${DIZIONE_CDN}/${name}`,
      `${DIZIONE_RAW}/${name}`
    ]));
  }

  status("Iniciando Python en WebAssembly (Pyodide)…", 0.74);
  pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
  status("Cargando NumPy en WebAssembly…", 0.82);
  await pyodide.loadPackage("numpy");

  pyodide.FS.mkdirTree("/dizione-data");
  DATA_FILES.forEach((name, i) => pyodide.FS.writeFile("/dizione-data/" + name, dataBytes[i]));
  pyodide.FS.mkdirTree("/dizione-src/dizione/data");
  DIZIONE_FILES.forEach((name, i) =>
    pyodide.FS.writeFile("/dizione-src/dizione/" + name, sourceTexts[i]));

  status("Calentando fonemizador dizione…", 0.88);
  pyodide.runPython(`
import json, os, sys
os.environ["DIZIONE_DATA"] = "/dizione-data"
sys.path.insert(0, "/dizione-src")
import dizione

def phonemize_json(text):
    try:
        result = dizione.phonemize(text)
    except ValueError:
        if any(word for mark, words in dizione.pieces(text) if not mark for word in words):
            raise
        return "null"
    return json.dumps({"ids": list(result.ids), "stress": list(result.stress), "text": str(result)})

phonemize_json("Warm up.")
`);
  phonemize = pyodide.globals.get("phonemize_json");

  await makeSession(modelBytes);
}

function collectPieces(piece, out) {
  const phones = phonemizePiece(piece);
  if (!phones) return;
  if (phones.ids.length <= TOKEN_LIMIT) {
    out.push(phones);
    return;
  }
  const pieces = shorter(piece);
  if (!pieces.length) throw new Error(`Palabra demasiado larga para sintetizar: ${piece.slice(0, 40)}`);
  for (const part of pieces) collectPieces(part, out);
}

async function speak(msg) {
  const t0 = performance.now();
  const pieces = [];
  for (const sentence of sentences(finished(msg.text))) collectPieces(sentence, pieces);
  if (!pieces.length) throw new Error(`El texto no contiene palabras legibles en inglés.`);

  const voiceId = Math.max(0, (config?.voices || ["F2", "M2"]).indexOf(msg.voice));
  const all = [];
  for (let i = 0; i < pieces.length; i++) {
    if (msg.id !== latestSpeakId) return;
    const audio = limitPeak(await synthesize(pieces[i], voiceId, msg.speed, msg.pitchShift, msg.pitchRange));
    all.push(audio.slice(0));
    self.postMessage(
      { type: "sentence", id: msg.id, index: i, total: pieces.length, phonemes: pieces[i].text, audio },
      [audio.buffer],
    );
  }
  const totalSamples = all.reduce((n, a) => n + a.length, 0);
  const full = new Float32Array(totalSamples);
  let offset = 0;
  for (const audio of all) { full.set(audio, offset); offset += audio.length; }
  limitPeak(full);
  const durationSec = (performance.now() - t0) / 1000;
  const audioSec = full.length / SAMPLE_RATE;
  const rtf = audioSec > 0 ? durationSec / audioSec : 0;

  self.postMessage(
    {
      type: "done",
      id: msg.id,
      audio: full,
      utterances: pieces.length,
      seconds: durationSec,
      audioSeconds: audioSec,
      rtf: rtf
    },
    [full.buffer],
  );
}

let latestSpeakId = 0;

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === "load") {
      await load();
      self.postMessage({ type: "ready", ep, voices: config?.voices || ["F2", "M2"], sampleRate: SAMPLE_RATE });
    } else if (msg.type === "speak") {
      latestSpeakId = msg.id;
      await speak(msg);
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      id: msg.id,
      where: msg.type,
      message: String((err && err.message) || err)
    });
  }
};
