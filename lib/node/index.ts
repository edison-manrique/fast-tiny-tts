/**
 * tiny-voca — Node/Bun entry point
 */

import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';
import { Phonemizer } from '../phonemizer.js';
import { TinyVocaCore } from '../core.js';
import { encodeWav, toWavBlob } from '../wav.js';
import type { TinyVocaConfig, TinyVocaInstance } from '../types.js';

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

  dispose(): void {
    this.ortSession.release();
  }
}

export { NodeTinyVoca as TinyVoca, Phonemizer, TinyVocaCore, encodeWav, toWavBlob };
export type { NodeTinyVocaConfig as TinyVocaConfig };
export * from '../types.js';