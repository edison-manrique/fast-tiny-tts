export interface InferenceSession {
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
    release(): void;
}
export interface InferenceSessionConstructor {
    new (modelPath: string, options?: InferenceSessionOptions): Promise<InferenceSession>;
    create(modelPath: string, options?: InferenceSessionOptions): Promise<InferenceSession>;
}
export interface InferenceSessionOptions {
    executionProviders?: ('webgpu' | 'wasm')[];
    graphOptimizationLevel?: 'basic' | 'extended' | 'all';
    enableCpuMemArena?: boolean;
    enableMemPattern?: boolean;
    logSeverityLevel?: number;
}
export interface Tensor {
    data: Float32Array | BigInt64Array | Int32Array | Uint8Array | number[];
    dims: readonly number[];
    type: string;
    getData?(): Float32Array | BigInt64Array | Int32Array | Uint8Array | number[];
}
export interface TensorConstructor {
    new (type: string, data: any, dims: readonly number[]): Tensor;
}
export interface Env {
    wasm: {
        wasmPaths: string;
        numThreads: number;
    };
}
export declare const env: Env;
export declare const InferenceSession: InferenceSessionConstructor;
export declare const Tensor: any;
