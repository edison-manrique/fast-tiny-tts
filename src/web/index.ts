/**
 * fast-tiny-tts — Web/Browser Platform Entry Point
 * Bundled by esbuild with onnxruntime-web as external.
 */

import * as ort from 'onnxruntime-web';
import { Phonemizer } from '../phonemizer.js';
import { TinyVocaCore } from '../core.js';
import { encodeWav, toWavBlob, toPcm16 } from '../wav.js';
import type { TinyVocaConfig, TinyVocaInstance, SynthesisOptions, SynthesisResult } from '../types.js';

export interface WebTinyVocaConfig extends TinyVocaConfig {
  modelPath?: string;
  phonemizerPath?: string;
  configPath?: string;
  wasmPath?: string;
  executionProviders?: ('webgpu' | 'wasm')[];
}

interface TensorLike {
  data: any;
  dims: number[];
}

interface SessionLike {
  run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
  release?: () => void;
}

class WebTinyVoca extends TinyVocaCore implements TinyVocaInstance {
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

  static async create(config: WebTinyVocaConfig = {}): Promise<WebTinyVoca> {
    const loc = typeof window !== 'undefined' ? window.location.href : typeof self !== 'undefined' ? self.location.href : 'http://localhost/';
    const baseUrl = config.modelPath 
      ? new URL(config.modelPath, loc).origin + '/' 
      : '';
    const localWasmPath = config.wasmPath ?? baseUrl + 'dist/onnxruntime-web/';
    
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.wasmPaths = localWasmPath;
      ort.env.wasm.numThreads = 1; // Single-threaded for maximum browser stability
    }

    const configPath = config.configPath ?? baseUrl + 'config.json';
    const phonemizerPath = config.phonemizerPath ?? baseUrl + 'lexicon.tsv';
    const modelPath = config.modelPath ?? baseUrl + 'model.onnx';

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

    return new WebTinyVoca(ortSession, phonemizer);
  }

  dispose(): void {
    this.ortSession.release();
  }
}

export { WebTinyVoca as TinyVoca, Phonemizer, TinyVocaCore, encodeWav, toWavBlob, toPcm16 };
export type { WebTinyVocaConfig as TinyVocaConfig, SynthesisOptions, SynthesisResult };
export * from '../types.js';

