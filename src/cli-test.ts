/**
 * fast-tiny-tts — Prueba CLI del TTS (inglés, voces F2 y M2, 24 kHz).
 */

import { TinyVoca } from './node/index.js';
import { Phonemizer } from './phonemizer.js';
import { join } from 'path';
import { readFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { encodeWav } from './wav.js';

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

function sanitizeFilename(str: string): string {
  return str
    .slice(0, 30)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

async function main() {
  console.log('fast-tiny-tts — prueba local');
  console.log('==============================');

  mkdirSync(OUT_DIR, { recursive: true });

  const tts = await TinyVoca.load(MODEL_DIR, phonemizer);
  console.log('Modelo cargado en ONNX Runtime (CPU).\n');

  const results: Array<{
    text: string;
    voice: string;
    dur: number;
    inf: number;
    rtf: number;
  }> = [];

  for (const tc of TEST_CASES) {
    const res = await tts.synthesize({
      text: tc.text,
      voice: tc.voice,
      speed: tc.speed ?? 1.0,
    });

    const wavBytes = encodeWav(res.audio, { sampleRate: res.sampleRate });
    const fn = `test_${tc.voice}_${sanitizeFilename(tc.text)}_${tc.voice}.wav`;
    const outPath = join(OUT_DIR, fn);
    writeFileSync(outPath, wavBytes);

    results.push({
      text: tc.text,
      voice: tc.voice,
      dur: res.audioSeconds,
      inf: res.inferenceMs,
      rtf: res.rtf,
    });

    const unkInfo = res.unknownWords.length > 0 ? `\n       Palabras fuera de léxico: ${res.unknownWords.join(', ')}` : '';
    console.log(
      `[OK] ${tc.voice} | "${tc.text.slice(0, 56)}..."\n` +
      `       audio ${res.audioSeconds.toFixed(2)}s | inferencia ${res.inferenceMs.toFixed(1)} ms | RTF ${res.rtf.toFixed(3)} -> ${outPath}${unkInfo}`
    );
  }

  const avgRtf = results.reduce((acc, r) => acc + r.rtf, 0) / results.length;
  const avgInf = results.reduce((acc, r) => acc + r.inf, 0) / results.length;

  console.log('\nResumen de eficiencia');
  console.log('======================');
  console.log(`RTF medio:       ${avgRtf.toFixed(3)}  (1.0 = real time; menor = más eficiente)`);
  console.log(`Inferencia media: ${avgInf.toFixed(1)} ms`);
}

main().catch(console.error);

