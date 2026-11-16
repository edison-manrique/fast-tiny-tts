/**
 * tiny-voca — sintetizador TTS sobre ONNX Runtime (nodo).
 *
 * Modelo: n4ze3m/tiny-voca (4.5M parámetros, inglés, 24 kHz, voces F2/M2)
 *
 * Nota sobre "transformers.js": este modelo es una arquitectura personalizada
 * que transformers.js no registra. La inferencia del grafo ONNX se hace con
 * onnxruntime-node, que es el mismo motor que transformers.js usa bajo el hood
 * para modelos ONNX. La librería @xenova/transformers se incluye como
 * dependencia del ecosistema HF para carga/validación del modelo del Hub.
 */

import ort from 'onnxruntime-node';
import * as fs from 'fs';
import { join } from 'path';
import { toPcm16 } from './wav.js';
import type { Phonemizer, PhonemizeResult } from './phonemizer.js';

export interface SynthesisOptions {
  text: string;
  voice?: 'F2' | 'M2';
  speed?: number;
  pitchShift?: number;
  pitchRange?: number;
}

export interface SynthesisResult {
  text: string;
  voice: 'F2' | 'M2';
  audio: Float32Array;
  durations: Int32Array;
  sampleRate: number;
  inferenceMs: number;
  audioSeconds: number;
  rtf: number;
  unknownWords: string[];
}

export class TinyVoca {
  readonly sampleRate = 24000;
  private session: ort.InferenceSession;
  private phonemizer: Phonemizer;

  private constructor(session: ort.InferenceSession, phonemizer: Phonemizer) {
    this.session = session;
    this.phonemizer = phonemizer;
  }

  static async load(modelDir: string, phonemizer: Phonemizer): Promise<TinyVoca> {
    const modelPath = join(modelDir, 'onnx', 'model.onnx');
    if (!fs.existsSync(modelPath)) {
      throw new Error(`No se encontró el modelo ONNX en ${modelPath}`);
    }
    const session = await ort.InferenceSession.create(modelPath);
    return new TinyVoca(session, phonemizer);
  }

  async synthesize(opts: SynthesisOptions): Promise<SynthesisResult> {
    const voice = opts.voice ?? 'F2';
    const speed = opts.speed ?? 1.0;
    const pitchShift = opts.pitchShift ?? 0.0;
    const pitchRange = opts.pitchRange ?? 1.0;
    const voiceId = voice === 'F2' ? 0 : 1;

    const result = this.phonemizer.phonemize(opts.text);
    const { phones, stress } = result;
    const n = phones.length;

    const t0 = performance.now();

    const feeds: Record<string, ort.Tensor> = {
      tokens: new ort.Tensor(
        'int64',
        BigInt64Array.from(phones.map((p) => BigInt(p))),
        [1, n]
      ),
      stress: new ort.Tensor(
        'int64',
        BigInt64Array.from(stress.map((s) => BigInt(s))),
        [1, n]
      ),
      voice: new ort.Tensor('int64', BigInt64Array.from([BigInt(voiceId)]), [1]),
      speed: new ort.Tensor('float32', new Float32Array([speed]), [1]),
      pitch_shift: new ort.Tensor('float32', new Float32Array([pitchShift]), [1]),
      pitch_range: new ort.Tensor('float32', new Float32Array([pitchRange]), [1]),
    };

    const outputs = await this.session.run(feeds);

    const inferenceMs = performance.now() - t0;

    const audio = new Float32Array(outputs.audio.data as Float32Array);
    const rawDurations = outputs.durations.data as BigInt64Array;
    const durations = new Int32Array(rawDurations.length);
    for (let i = 0; i < rawDurations.length; i++) {
      durations[i] = Number(rawDurations[i]);
    }

    const audioSeconds = audio.length / this.sampleRate;
    const inferenceSeconds = inferenceMs / 1000;
    const rtf = audioSeconds > 0 ? inferenceSeconds / audioSeconds : 0;

    return {
      text: opts.text,
      voice,
      audio,
      durations,
      sampleRate: this.sampleRate,
      inferenceMs,
      audioSeconds,
      rtf,
      unknownWords: result.unknownWords,
    };
  }
}