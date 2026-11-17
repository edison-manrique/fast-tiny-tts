/**
 * tiny-voca — Web/Browser entry point
 */
import { TinyVocaCore } from '../core.js';
import type { TinyVocaConfig, TinyVocaInstance } from '../types.js';
export interface WebTinyVocaConfig extends TinyVocaConfig {
    modelPath?: string;
    phonemizerPath?: string;
    configPath?: string;
    wasmPath?: string;
    executionProviders?: ('webgpu' | 'wasm')[];
}
declare class WebTinyVoca extends TinyVocaCore implements TinyVocaInstance {
    private ortSession;
    private constructor();
    static create(config?: WebTinyVocaConfig): Promise<WebTinyVoca>;
    dispose(): void;
}
export { WebTinyVoca as TinyVoca };
export type { WebTinyVocaConfig as TinyVocaConfig };
