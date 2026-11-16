/**
 * fast-tiny-tts — Web/Browser Platform Entry Point
 * Bundled by esbuild with onnxruntime-web as external.
 */

import * as ort from 'onnxruntime-web';
import { Phonemizer } from '../phonemizer.js';
import { TinyVocaCore } from '../core.js';
import { encodeWav, toWavBlob, toPcm16 } from '../wav.js';
import type { TinyVocaConfig, TinyVocaInstance, SynthesisOptions, SynthesisResult } from '../types.js';

export interface FastTinyTTSConfig extends TinyVocaConfig {
  modelPath?: string;
  phonemizerPath?: string;
  configPath?: string;
  wasmPath?: string;
  executionProviders?: ('webgpu' | 'wasm')[];
}

export type WebTinyVocaConfig = FastTinyTTSConfig;

interface TensorLike {
  data: any;
  dims: number[];
}

interface SessionLike {
  run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
  release?: () => void;
}

class FastTinyTTS extends TinyVocaCore implements TinyVocaInstance {
  private ortSession: ort.InferenceSession;

  private constructor(ortSession: ort.InferenceSession, phonemizer: Phonemizer) {
    const session: SessionLike = {
      run: async (feeds: Record<string, any>) => {
        const ortFeeds: Record<string, ort.Tensor> = {};
        for (const [key, tensor] of Object.entries(feeds)) {
          ortFeeds[key] = tensor.data instanceof BigInt64Array
            ? new ort.Tensor('int64', tensor.data, [...tensor.dims])
            : new ort.Tensor('float32', tensor.data, [...tensor.dims]);
        }
        const results = await ortSession.run(ortFeeds);
        const output: Record<string, any> = {};
        for (const [key, tensor] of Object.entries(results)) {
          output[key] = {
            data: tensor.data,
            dims: [...tensor.dims],
          };
        }
        return output;
      },
      release: () => {
        ortSession.release();
      },
    };
    super(session, phonemizer);
    this.ortSession = ortSession;
  }

  static async create(config: FastTinyTTSConfig = {}): Promise<FastTinyTTS> {
    const loc = typeof window !== 'undefined' ? window.location.href : typeof self !== 'undefined' ? self.location.href : 'http://localhost/';

    // Resolve model URL relative to document location
    const rawModelPath = config.modelPath ?? 'dist/models/tiny-voca/model.onnx';
    const modelUrl = new URL(rawModelPath, loc).href;
    const modelDir = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);

    const configPath = config.configPath 
      ? new URL(config.configPath, loc).href 
      : modelDir + 'config.json';

    const phonemizerPath = config.phonemizerPath 
      ? new URL(config.phonemizerPath, loc).href 
      : modelDir + 'phonemizer/lexicon.tsv';

    const isStatic = loc.includes('github.io') || loc.startsWith('file:');
    const defaultWasm = isStatic
      ? 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/'
      : 'dist/onnxruntime-web/';
    const rawWasmPath = config.wasmPath ?? defaultWasm;
    const wasmUrl = rawWasmPath.startsWith('http') ? rawWasmPath : new URL(rawWasmPath, loc).href;
    const localWasmPath = wasmUrl.endsWith('/') ? wasmUrl : wasmUrl + '/';
    
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.wasmPaths = localWasmPath;
      ort.env.wasm.numThreads = 1; // Single-threaded for maximum browser stability
    }

    const modelPath = modelUrl;

    // Load config and lexicon in parallel
    const [cfgResp, lexResp] = await Promise.all([
      fetch(configPath),
      fetch(phonemizerPath),
    ]);
    const cfg = await cfgResp.json();
    const lexiconTsv = await lexResp.text();

    const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);

    // Create ONNX session
    const sessionOptions: any = {
      executionProviders: config.executionProviders ?? ['wasm'],
      graphOptimizationLevel: 'all',
    };

    const ortSession = await ort.InferenceSession.create(modelPath, sessionOptions);

    return new FastTinyTTS(ortSession, phonemizer);
  }

  dispose(): void {
    this.ortSession.release();
  }
}

export {
  FastTinyTTS,
  FastTinyTTS as TinyVoca,
  FastTinyTTS as WebTinyVoca,
  Phonemizer,
  TinyVocaCore,
  encodeWav,
  toWavBlob,
  toPcm16,
};
export type {
  FastTinyTTSConfig as TinyVocaConfig,
  SynthesisOptions,
  SynthesisResult,
};
export * from '../types.js';

