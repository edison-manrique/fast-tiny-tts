/**
 * Benchmark de eficiencia del tiny-voca ONNX: repite la inferencia varias veces
 * para promediar RTF (tiempo de inferencia / duración del audio generado).
 */

import { TinyVoca } from './node/index.js';
import { Phonemizer } from './phonemizer.js';
import { join } from 'path';
import { readFileSync } from 'fs';

const MODEL_DIR = join('models', 'tiny-voca');

const config = JSON.parse(readFileSync(join(MODEL_DIR, 'config.json'), 'utf8'));
const phonemizer = new Phonemizer(
  join(MODEL_DIR, 'phonemizer', 'lexicon.tsv'),
  config.vocab
);

const CASES = [
  { text: 'Hello! This is tiny voca, a small text to speech model.', voice: 'F2' as const },
  { text: 'The meeting moved to 3:30 pm on March 14th, so we have about 45 minutes left.', voice: 'M2' as const },
  { text: 'She had never seen the sea before, and for a long while she stood at the edge of the water.', voice: 'F2' as const },
];

async function main() {
  const tts = await TinyVoca.load(MODEL_DIR, phonemizer);

  console.log('Benchmark tiny-voca (ONNX, CPU)');
  console.log('===============================');
  console.log(`${'texto'.padEnd(50)} ${'voz'.padEnd(5)} ${'audio(s)'.padEnd(9)} ${'infer(ms)'.padEnd(10)} ${'RTF'.padEnd(7)} ${'xReal'.padEnd(7)}`);

  for (const c of CASES) {
    const rtfArr: number[] = [];
    const infArr: number[] = [];
    let dur = 0;
    // calentamiento
    await tts.synthesize({ text: c.text, voice: c.voice });
    for (let i = 0; i < 5; i++) {
      const r = await tts.synthesize({ text: c.text, voice: c.voice });
      rtfArr.push(r.rtf);
      infArr.push(r.inferenceMs);
      dur = r.audioSeconds;
    }
    const avgRtf = rtfArr.reduce((a, b) => a + b, 0) / rtfArr.length;
    const avgInf = infArr.reduce((a, b) => a + b, 0) / infArr.length;
    console.log(
      `${c.text.padEnd(50)} ${c.voice.padEnd(5)} ${dur.toFixed(2).padEnd(9)} ${avgInf.toFixed(1).padEnd(10)} ${avgRtf.toFixed(3).padEnd(7)} ${(1 / avgRtf).toFixed(1).padEnd(7)}`
    );
  }

  console.log('\nRTF = segundos de inferencia / segundos de audio generado.');
  console.log('RTF 0.014 ≈ 70x más rápido que real time (según la ficha del modelo, 4 hilos CPU).');
  console.log('xReal = cuántas veces más rápido que real time genera audio.');
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
