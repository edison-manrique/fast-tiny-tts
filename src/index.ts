/**
 * fast-tiny-tts — Universal TTS library entry point
 * Platform-specific implementations in ./node/index.ts and ./web/index.ts
 */

export type {
  Voice,
  SynthesisOptions,
  SynthesisResult,
  TinyVocaConfig,
  TinyVocaInstance,
  FastTinyTTSInstance,
} from './types.js';

export { Phonemizer } from './phonemizer.js';
export { TinyVocaCore } from './core.js';
export { encodeWav, toWavBlob, toPcm16 } from './wav.js';
