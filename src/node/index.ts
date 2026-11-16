/**
 * fast-tiny-tts — Node/Bun Platform Entry Point (onnxruntime-node)
 */

import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';
import { Phonemizer } from '../phonemizer.js';
import { TinyVocaCore } from '../core.js';
import { encodeWav, toWavBlob, toPcm16 } from '../wav.js';
import type { TinyVocaConfig, TinyVocaInstance, SynthesisOptions, SynthesisResult } from '../types.js';

export interface NodeTinyVocaConfig extends TinyVocaConfig {
  modelPath?: string;
  phonemizerPath?: string;
  configPath?: string;
}

class NodeTinyVoca extends TinyVocaCore implements TinyVocaInstance {
  private ortSession: ort.InferenceSession;

  private constructor(ortSession: ort.InferenceSession, phonemizer: Phonemizer) {
    const session = {
      run: async (feeds: Record<string, any>) => {
        const ortFeeds: Record<string, ort.Tensor> = {};
        for (const [key, tensor] of Object.entries(feeds)) {
          ortFeeds[key] = tensor.data instanceof BigInt64Array
            ? new ort.Tensor('int64', tensor.data, tensor.dims)
            : new ort.Tensor('float32', tensor.data, tensor.dims);
        }
        const results = await ortSession.run(ortFeeds);
        const output: Record<string, any> = {};
        for (const [key, tensor] of Object.entries(results)) {
          output[key] = { data: tensor.data, dims: tensor.dims };
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

  static async create(config: NodeTinyVocaConfig = {}): Promise<NodeTinyVoca> {
    const baseDir = config.modelPath ? path.dirname(config.modelPath) : process.cwd();

    const configPath = config.configPath ?? path.join(baseDir, 'config.json');
    const phonemizerPath = config.phonemizerPath ?? path.join(baseDir, 'phonemizer', 'lexicon.tsv');
    const modelPath = config.modelPath ?? path.join(baseDir, 'model.onnx');

    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const lexiconTsv = fs.readFileSync(phonemizerPath, 'utf8');

    const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);
    const ortSession = await ort.InferenceSession.create(modelPath);

    return new NodeTinyVoca(ortSession, phonemizer);
  }

  /**
   * Backwards-compatible load method
   */
  static async load(modelDir: string, phonemizer?: Phonemizer): Promise<NodeTinyVoca> {
    const modelPath = fs.existsSync(path.join(modelDir, 'onnx', 'model.onnx'))
      ? path.join(modelDir, 'onnx', 'model.onnx')
      : path.join(modelDir, 'model.onnx');

    if (!phonemizer) {
      const configPath = path.join(modelDir, 'config.json');
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const lexPath = path.join(modelDir, 'phonemizer', 'lexicon.tsv');
      phonemizer = new Phonemizer(lexPath, cfg.vocab);
    }

    const ortSession = await ort.InferenceSession.create(modelPath);
    return new NodeTinyVoca(ortSession, phonemizer);
  }

  dispose(): void {
    this.ortSession.release();
  }
}

export { NodeTinyVoca as TinyVoca, Phonemizer, TinyVocaCore, encodeWav, toWavBlob, toPcm16 };
export type { NodeTinyVocaConfig as TinyVocaConfig, SynthesisOptions, SynthesisResult };
export * from '../types.js';

