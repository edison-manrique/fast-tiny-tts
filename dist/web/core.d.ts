/**
 * tiny-voca — Core TTS logic (environment-agnostic)
 */
import type { TinyVocaInstance, SynthesisOptions, SynthesisResult, TinyVocaConfig } from './types.js';
import { Phonemizer } from './phonemizer.js';
interface TensorLike {
    data: Float32Array | BigInt64Array | any;
    dims: number[];
    type?: string;
}
interface SessionLike {
    run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
}
export declare class TinyVocaCore implements TinyVocaInstance {
    readonly sampleRate = 24000;
    readonly voices: ('F2' | 'M2')[];
    private session;
    private phonemizer;
    constructor(session: SessionLike, phonemizer: Phonemizer);
    static create(config: TinyVocaConfig): Promise<TinyVocaCore>;
    private static loadSession;
    synthesize(options: SynthesisOptions): Promise<SynthesisResult>;
    warmup(): Promise<void>;
    dispose(): void;
}
export {};
