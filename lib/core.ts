/**
 * tiny-voca — Core TTS logic (environment-agnostic)
 */

import type { TinyVocaInstance, SynthesisOptions, SynthesisResult, TinyVocaConfig } from './types.js';
import { Phonemizer } from './phonemizer.js';
import { encodeWav, toWavBlob } from './wav.js';

// Cross-platform fetch and performance
const gFetch = typeof fetch !== 'undefined' ? fetch : undefined;
const gPerformance = typeof performance !== 'undefined' ? performance : { now: () => Date.now() };

// Generic tensor interface - simplified for cross-platform compatibility
interface TensorLike {
  data: Float32Array | BigInt64Array | any;
  dims: number[];
  type?: string;
}

interface SessionLike {
  run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
}

export class TinyVocaCore implements TinyVocaInstance {
  readonly sampleRate = 24000;
  readonly voices: ('F2' | 'M2')[] = ['F2', 'M2'];

  private session: SessionLike;
  private phonemizer: Phonemizer;

  constructor(session: SessionLike, phonemizer: Phonemizer) {
    this.session = session;
    this.phonemizer = phonemizer;
  }

  static async create(config: TinyVocaConfig): Promise<TinyVocaCore> {
    if (!gFetch) throw new Error('fetch not available in this environment');

    // Load config.json
    const configResp = await gFetch(config.configPath ?? 'config.json');
    const cfg: any = await configResp.json();

    // Load lexicon.tsv
    const lexiconResp = await gFetch(config.phonemizerPath ?? 'lexicon.tsv');
    const lexiconTsv = await lexiconResp.text();

    const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);

    // Load ONNX model - implementation depends on environment
    const session = await TinyVocaCore.loadSession(config.modelPath ?? 'model.onnx', config.wasmPath);

    return new TinyVocaCore(session, phonemizer);
  }

  private static async loadSession(modelUrl: string, wasmPath?: string): Promise<SessionLike> {
    throw new Error('loadSession must be implemented by platform-specific entry point');
  }

  async synthesize(options: SynthesisOptions): Promise<SynthesisResult> {
    const { text, voice = 'F2', speed = 1.0, pitchShift = 0, pitchRange = 1.0 } = options;

    const { phones, stress, unknownWords } = this.phonemizer.phonemize(text);
    const n = phones.length;
    const voiceId = voice === 'F2' ? 0 : 1;

    const t0 = gPerformance.now();

    const feeds: Record<string, any> = {
      tokens: { data: BigInt64Array.from(phones.map(p => BigInt(p))), dims: [1, n], type: 'int64' },
      stress: { data: BigInt64Array.from(stress.map(s => BigInt(s))), dims: [1, n], type: 'int64' },
      voice: { data: BigInt64Array.from([BigInt(voiceId)]), dims: [1], type: 'int64' },
      speed: { data: new Float32Array([speed]), dims: [1], type: 'float32' },
      pitch_shift: { data: new Float32Array([pitchShift]), dims: [1], type: 'float32' },
      pitch_range: { data: new Float32Array([pitchRange]), dims: [1], type: 'float32' },
    };

    const outputs = await this.session.run(feeds);
    const inferenceMs = gPerformance.now() - t0;

    const audio = outputs.audio.data as Float32Array;
    const durationsData = outputs.durations.data as BigInt64Array;
    const durations = new Int32Array(durationsData.length);
    for (let i = 0; i < durationsData.length; i++) durations[i] = Number(durationsData[i]);

    const audioSeconds = audio.length / this.sampleRate;
    const rtf = audioSeconds > 0 ? (inferenceMs / 1000) / audioSeconds : 0;

    return {
      audio,
      sampleRate: this.sampleRate,
      durations,
      inferenceMs,
      audioSeconds,
      rtf,
      unknownWords,
      toWav: (peak = 0.95) => encodeWav(audio, { sampleRate: this.sampleRate, peak }),
      toBlob: (peak = 0.95) => toWavBlob(audio, { sampleRate: this.sampleRate, peak }),
    };
  }

  async warmup(): Promise<void> {
    await this.synthesize({ text: 'Warmup.', voice: 'F2' });
  }

  dispose(): void {}
}