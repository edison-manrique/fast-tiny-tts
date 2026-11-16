/**
 * Test tiny-voca library in Bun
 */

import { TinyVoca } from './dist/node/node/index.js';

async function main() {
  console.log('Loading tiny-voca...');
  
  const tts = await TinyVoca.create({
    modelPath: './dist/models/tiny-voca/model.onnx',
    phonemizerPath: './dist/models/tiny-voca/phonemizer/lexicon.tsv',
    configPath: './dist/models/tiny-voca/config.json',
  });

  console.log('Model loaded. Testing synthesis...');
  
  const testCases = [
    { text: 'Hello! This is tiny voca.', voice: 'F2' },
    { text: 'The meeting moved to 3:30 pm on March 14th.', voice: 'M2' },
    { text: 'They misuse it! Instead of elevating the... let us be honest.', voice: 'F2' },
    { text: 'I evaluate the technical nuances of speech synthesis.', voice: 'M2' },
  ];

  for (const tc of testCases) {
    console.log(`\n--- ${tc.voice}: "${tc.text.slice(0, 50)}..." ---`);
    const result = await tts.synthesize(tc);
    console.log(`  Audio: ${result.audioSeconds.toFixed(2)}s`);
    console.log(`  Inference: ${result.inferenceMs.toFixed(1)}ms`);
    console.log(`  RTF: ${result.rtf.toFixed(4)}`);
    console.log(`  Unknown: ${result.unknownWords.join(', ') || 'none'}`);
  }

  // Test warmup
  console.log('\nWarmup test...');
  await tts.warmup();
  console.log('Warmup complete.');

  tts.dispose();
  console.log('\nAll tests passed!');
}

main().catch(console.error);