/**
 * fast-tiny-tts — Shared types for TTS library
 * Works in Browser (via onnxruntime-web) and Node/Bun (via onnxruntime-node).
 */

export type Voice = 'F2' | 'M2';

export interface SynthesisOptions {
  text: string;
  voice?: Voice;
  speed?: number;        // 0.5 - 2.0 (default: 1.0)
  pitchShift?: number;   // -1.0 - 1.0 semitones (default: 0)
  pitchRange?: number;   // 0.0 - 2.0 expressiveness (default: 1.0)
}

export interface SynthesisResult {
  audio: Float32Array;   // 24 kHz mono samples
  sampleRate: number;    // 24000
  durations: Int32Array; // frames per token (256 samples/frame = 10.7ms)
  inferenceMs: number;
  audioSeconds: number;
  rtf: number;           // inference / audio duration
  unknownWords: string[];
  voice?: Voice;
  text?: string;
  toWav?: (peak?: number) => Uint8Array;
  toBlob?: (peak?: number) => Blob;
}

export interface TinyVocaConfig {
  modelPath?: string;    // path or URL to model.onnx
  phonemizerPath?: string; // path or URL to lexicon.tsv
  configPath?: string;   // path or URL to config.json
  wasmPath?: string;     // path to onnxruntime-web WASM (browser only)
  executionProviders?: ('webgpu' | 'wasm')[];
}

export interface TinyVocaInstance {
  synthesize(options: SynthesisOptions): Promise<SynthesisResult>;
  warmup(): Promise<void>;
  dispose(): void;
  readonly sampleRate: number;
  readonly voices: Voice[];
}

export type FastTinyTTSInstance = TinyVocaInstance;

