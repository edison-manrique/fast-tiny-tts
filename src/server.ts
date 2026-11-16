/**
 * tiny-voca — Servidor Bun + API TTS (ONNX, inglés, voces F2/M2, 24 kHz).
 *
 * El modelo se carga UNA VEZ en memoria al iniciar. Expone:
 *   GET  /              -> web app (fullscreen)
 *   GET  /api/voices    -> lista de voces
 *   POST /api/synthesize-> genera WAV (audio/wav) con headers de métricas
 *
 * Ejecutar:  bun run src/server.ts
 */

import { serve } from 'bun';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { TinyVoca } from './tts.js';
import { Phonemizer } from './phonemizer.js';
import { toPcm16 } from './wav.js';

const PORT = 3000;
const MODEL_DIR = join(process.cwd(), 'models', 'tiny-voca');
const PUBLIC_DIR = join(process.cwd(), 'public');

/* ------------------------------------------------------------------ */
/* Cargar el modelo una sola vez (singleton)                          */
/* ------------------------------------------------------------------ */

const config = JSON.parse(readFileSync(join(MODEL_DIR, 'config.json'), 'utf8'));

const phonemizer = new Phonemizer(
  join(MODEL_DIR, 'phonemizer', 'lexicon.tsv'),
  config.vocab
);

const tts = await TinyVoca.load(MODEL_DIR, phonemizer);
console.log(`[fast-tiny-tts] Modelo cargado en ${MODEL_DIR}`);
console.log(`[fast-tiny-tts] Escuchando en http://localhost:${PORT}`);

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const html = () => {
  const indexPath = join(PUBLIC_DIR, 'index.html');
  if (!existsSync(indexPath)) {
    return new Response('<h1>public/index.html no encontrado</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  return new Response(readFileSync(indexPath, 'utf8'), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

function cors(headers: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Inference-Ms, X-Audio-Seconds, X-RTF, X-Voice, X-Unknown-Words, Content-Length',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    ...headers,
  };
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    js: 'application/javascript',
    mjs: 'application/javascript',
    wasm: 'application/wasm',
    json: 'application/json',
    onnx: 'application/octet-stream',
    tsv: 'text/tab-separated-values',
    html: 'text/html',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return types[ext ?? ''] ?? 'application/octet-stream';
}

/* ------------------------------------------------------------------ */
/* Servidor                                                           */
/* ------------------------------------------------------------------ */

serve({
  port: PORT,
  development: true,

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    // ── Página web -------------------------------------------------
    if (path === '/' || path === '/index.html') {
      return html();
    }

    // ── Archivos estáticos (dist, modelos para web) ----------------
    if (path.startsWith('/dist/')) {
      const rootPath = join(process.cwd(), path);
      const publicPath = join(PUBLIC_DIR, path);
      let filePath: string | null = existsSync(rootPath) ? rootPath : existsSync(publicPath) ? publicPath : null;

      // Fallbacks inteligentes para modelos y runtime
      if (!filePath && path.includes('/models/tiny-voca/model.onnx')) {
        const altModel = join(process.cwd(), 'models', 'tiny-voca', 'onnx', 'model.onnx');
        if (existsSync(altModel)) filePath = altModel;
      }
      if (!filePath && path.includes('/models/tiny-voca/config.json')) {
        const altConfig = join(process.cwd(), 'models', 'tiny-voca', 'config.json');
        if (existsSync(altConfig)) filePath = altConfig;
      }
      if (!filePath && (path.includes('/lexicon.tsv') || path.includes('/phonemizer/lexicon.tsv'))) {
        const altLex = join(process.cwd(), 'models', 'tiny-voca', 'phonemizer', 'lexicon.tsv');
        if (existsSync(altLex)) filePath = altLex;
      }
      if (!filePath && path.startsWith('/dist/onnxruntime-web/')) {
        const sub = path.replace('/dist/onnxruntime-web/', '');
        const altOrt = join(process.cwd(), 'node_modules', 'onnxruntime-web', 'dist', sub);
        if (existsSync(altOrt)) filePath = altOrt;
      }

      if (filePath) {
        const file = Bun.file(filePath);
        const mime = getMimeType(filePath);
        return new Response(file, {
          headers: cors({ 'Content-Type': mime }),
        });
      }
      return new Response('Not found', { status: 404, headers: cors() });
    }

    // ── Voces disponibles ------------------------------------------
    if (path === '/api/voices' && req.method === 'GET') {
      return Response.json(
        { voices: ['F2', 'M2'], default: 'F2', sampleRate: tts.sampleRate },
        { headers: cors() }
      );
    }

    // ── Síntesis TTS -----------------------------------------------
    if (path === '/api/synthesize' && req.method === 'POST') {
      try {
        const body = (await req.json()) as {
          text?: string;
          voice?: 'F2' | 'M2';
          speed?: number;
          pitch_shift?: number;
          pitch_range?: number;
        };

        if (!body.text || typeof body.text !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Falta el campo "text"' }),
            { status: 400, headers: cors({ 'Content-Type': 'application/json' }) }
          );
        }

        const result = await tts.synthesize({
          text: body.text,
          voice: body.voice ?? 'F2',
          speed: body.speed ?? 1.0,
          pitchShift: body.pitch_shift ?? 0.0,
          pitchRange: body.pitch_range ?? 1.0,
        });

        const wav = toPcm16(result.audio, {
          sampleRate: result.sampleRate,
          peak: 0.95,
        });

        return new Response(wav as unknown as Uint8Array, {
          status: 200,
          headers: cors({
            'Content-Type': 'audio/wav',
            'Content-Length': String(wav.length),
            'X-Inference-Ms': String(result.inferenceMs.toFixed(2)),
            'X-Audio-Seconds': String(result.audioSeconds.toFixed(3)),
            'X-RTF': String(result.rtf.toFixed(4)),
            'X-Voice': result.voice,
            'X-Unknown-Words': JSON.stringify(result.unknownWords),
          }),
        });
      } catch (err: any) {
        console.error('[synthesize] error:', err);
        return new Response(
          JSON.stringify({ error: err?.message ?? 'Error interno de síntesis' }),
          { status: 500, headers: cors({ 'Content-Type': 'application/json' }) }
        );
      }
    }

    // ── 404 --------------------------------------------------------
    return new Response('Not found', { status: 404, headers: cors() });
  },
});