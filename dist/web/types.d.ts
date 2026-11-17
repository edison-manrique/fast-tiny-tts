/**
 * tiny-voca — Shared types for TTS library
 * Works in Browser (via onnxruntime-web) and Node/Bun (via onnxruntime-node)
 */
export type Voice = 'F2' | 'M2';
export interface SynthesisOptions {
    text: string;
    voice?: Voice;
    speed?: number;
    pitchShift?: number;
    pitchRange?: number;
}
export interface SynthesisResult {
    audio: Float32Array;
    sampleRate: number;
    durations: Int32Array;
    inferenceMs: number;
    audioSeconds: number;
    rtf: number;
    unknownWords: string[];
}
export interface TinyVocaConfig {
    modelPath?: string;
    phonemizerPath?: string;
    configPath?: string;
    wasmPath?: string;
}
export interface TinyVocaInstance {
    synthesize(options: SynthesisOptions): Promise<SynthesisResult>;
    warmup(): Promise<void>;
    dispose(): void;
    readonly sampleRate: number;
    readonly voices: Voice[];
}
export type Phoneme = {
    symbol: string;
    stress: 0 | 1 | 2;
};
export type PhonemizeResult = {
    phones: number[];
    stress: number[];
    symbols: string[];
    unknownWords: string[];
};
