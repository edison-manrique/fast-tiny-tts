/**
 * fast-tiny-tts — Core TTS Logic (Environment-Agnostic)
 */

import type { TinyVocaInstance, SynthesisOptions, SynthesisResult, TinyVocaConfig, Voice } from './types.js';
import { Phonemizer } from './phonemizer.js';
import { encodeWav, toWavBlob } from './wav.js';

const gPerformance = typeof performance !== 'undefined' ? performance : { now: () => Date.now() };

export interface TensorLike {
  data: Float32Array | BigInt64Array | any;
  dims: number[];
  type?: string;
}

export interface SessionLike {
  run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
  release?(): void;
}

export class TinyVocaCore implements TinyVocaInstance {
  readonly sampleRate = 24000;
  readonly voices: Voice[] = ['F2', 'M2'];

  protected session: SessionLike;
  protected phonemizer: Phonemizer;

  constructor(session: SessionLike, phonemizer: Phonemizer) {
    this.session = session;
    this.phonemizer = phonemizer;
  }

  async synthesize(options: SynthesisOptions): Promise<SynthesisResult> {
    const { text, voice = 'F2', speed = 1.0, pitchShift = 0, pitchRange = 1.0 } = options;

    const { phones, stress, unknownWords } = this.phonemizer.phonemize(text);
    const n = phones.length;
    const voiceId = voice === 'F2' ? 0 : 1;

    const t0 = gPerformance.now();

    const feeds: Record<string, any> = {
      tokens: { data: BigInt64Array.from(phones.map((p) => BigInt(p))), dims: [1, n], type: 'int64' },
      stress: { data: BigInt64Array.from(stress.map((s) => BigInt(s))), dims: [1, n], type: 'int64' },
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
      text,
      voice,
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
    await this.synthesize({ text: 'Warmup speech synthesis.', voice: 'F2' });
  }

  dispose(): void {
    if (this.session && typeof this.session.release === 'function') {
      this.session.release();
    }
  }
}

