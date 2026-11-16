/**
 * tiny-voca — Universal TTS library entry point
 * 
 * This file is the main export. Platform-specific implementations
 * are in ./node/index.ts (Node/Bun) and ./web/index.ts (Browser).
 * 
 * The package.json "exports" field handles platform resolution automatically.
 * 
 * Usage:
 *   // Auto-detects platform via package.json exports
 *   import { TinyVoca } from 'tiny-voca';
 *   const tts = await TinyVoca.create({ modelPath: '/model.onnx' });
 * 
 *   // Or explicitly:
 *   import { TinyVoca } from 'tiny-voca/node';  // Node/Bun
 *   import { TinyVoca } from 'tiny-voca/web';   // Browser
 */

// Re-export types
export type {
  Voice,
  SynthesisOptions,
  SynthesisResult,
  TinyVocaConfig,
  TinyVocaInstance,
  Phoneme,
  PhonemizeResult,
} from './types.js';

// Re-export core utilities
export { Phonemizer } from './phonemizer.js';
export { TinyVocaCore } from './core.js';
export { encodeWav, toWavBlob } from './wav.js';