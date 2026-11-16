/**
 * tiny-voca — prueba CLI del TTS (inglés, voces F2 y M2, 24 kHz).
 *
 * Genera WAVs de prueba en ./output y muestra métricas de eficiencia.
 */

import { TinyVoca } from './tts.js';
import { Phonemizer } from './phonemizer.js';
import { join } from 'path';
import { readFileSync, mkdirSync, readdirSync, statSync } from 'fs';

const MODEL_DIR = join('models', 'tiny-voca');
const OUT_DIR = 'output';

const config = JSON.parse(readFileSync(join(MODEL_DIR, 'config.json'), 'utf8'));
const phonemizer = new Phonemizer(
  join(MODEL_DIR, 'phonemizer', 'lexicon.tsv'),
  config.vocab
);

const TEST_CASES: Array<{
  text: string;
  voice: 'F2' | 'M2';
  speed?: number;
}> = [
  { text: 'Hello! This is tiny voca, a small text to speech model.', voice: 'F2' },
  { text: 'Hello! This is tiny voca, a small text to speech model.', voice: 'M2' },
  { text: 'I evaluate the technical nuances of speech synthesis to provide a comprehensive analysis.', voice: 'F2' },
  { text: 'I evaluate the technical nuances of speech synthesis to provide a comprehensive analysis.', voice: 'M2' },
  { text: 'The meeting moved to 3:30 pm on March 14th, so we have about 45 minutes left.', voice: 'F2' },
  { text: 'The total cost was $1,250.50 and the temperature dropped to -5 degrees.', voice: 'M2' },
  { text: 'Did you really think I would forget your birthday?', voice: 'M2' },
  { text: 'She had never seen the sea before, and for a long while she stood at the edge of the water without saying a word.', voice: 'F2' },
  { text: 'Good morning, how are you today? My name is John Doe.', voice: 'M2' },
  { text: 'Testing the speed and quality of this lightweight English TTS model.', voice: 'F2' },
];

function getDirSize(dir: string): number {
  let size = 0;
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else size += statSync(p).size;
    }
  };
  walk(dir);
  return size;
}

function pad(n: number, w = 6): string {
  return n.toFixed(2).padStart(w);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const modelSize = getDirSize(MODEL_DIR);
  console.log('tiny-voca TTS — prueba local');
  console.log('==============================');
  console.log(`Modelo:      n4ze3m/tiny-voca (ONNX, inglés, 24 kHz mono)`);
  console.log(`Voces:       F2 (femenina), M2 (masculino)`);
  console.log(`Parámetros:  4,537,291`);
  console.log(`Tamaño ONNX: ${(modelSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Directorio:  ${MODEL_DIR}`);
  console.log('');

  const tts = await TinyVoca.load(MODEL_DIR, phonemizer);
  console.log(`Modelo cargado en ONNX Runtime (CPU).\n`);

  const results: Array<{ name: string; voice: string; r: any; path: string }> = [];

  for (const tc of TEST_CASES) {
    const safe = tc.text.slice(0, 20).replace(/[^a-z0-9]/gi, '_');
    const base = `test_${tc.voice}_${safe}`;
    const r = await tts.synthesize({ text: tc.text, voice: tc.voice, speed: tc.speed });
    const path = await saveWav(r, OUT_DIR, base);
    results.push({ name: tc.text, voice: tc.voice, r, path });
    console.log(`[OK] ${tc.voice} | "${tc.text.slice(0, 60)}..."`);
    console.log(
      `       audio ${r.audioSeconds.toFixed(2)}s | inferencia ${r.inferenceMs.toFixed(1)} ms | RTF ${r.rtf.toFixed(3)} -> ${path}`
    );
    if (r.unknownWords.length > 0) {
      console.log(`       Palabras fuera de léxico: ${r.unknownWords.join(', ')}`);
    }
  }

  console.log('\nResumen de eficiencia');
  console.log('======================');
  console.log(
    `${'texto'.padEnd(44)} ${'voz'.padEnd(5)} ${'audio(s)'.padEnd(9)} ${'infer(ms)'.padEnd(10)} ${'RTF'.padEnd(7)}`
  );
  for (const { name, voice, r } of results) {
    console.log(
      `${name.padEnd(44)} ${voice.padEnd(5)} ${pad(r.audioSeconds).padEnd(9)} ${pad(
        r.inferenceMs
      ).padEnd(10)} ${r.rtf.toFixed(3).padEnd(7)}`
    );
  }

  const meanRtf = results.reduce((a, b) => a + b.r.rtf, 0) / results.length;
  const meanInf = results.reduce((a, b) => a + b.r.inferenceMs, 0) / results.length;
  console.log(`\nRTF medio:       ${meanRtf.toFixed(3)}  (1.0 = real time; menor = más eficiente)`);
  console.log(`Inferencia media: ${meanInf.toFixed(1)} ms`);
  console.log(`\nArchivos WAV generados en ./${OUT_DIR}/ - escúchalos para juzgar la calidad.`);
}

function saveWav(result: any, outDir: string, baseName: string): string {
  const { join } = require('path');
  const { writeFileSync } = require('fs');
  const { toPcm16 } = require('./wav.js');
  const fileName = `${baseName}_${result.voice}.wav`;
  const path = join(outDir, fileName);
  const pcm = toPcm16(result.audio, { sampleRate: result.sampleRate, peak: 0.95 });
  writeFileSync(path, pcm);
  return path;
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});