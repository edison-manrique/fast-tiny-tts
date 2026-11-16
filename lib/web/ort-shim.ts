// lib/web/ort-shim.ts
// Shim for onnxruntime-web - provides types for TypeScript compilation
// The actual onnxruntime-web will be loaded at runtime via CDN

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

export const env: Env = {
  wasm: {
    wasmPaths: '',
    numThreads: 0,
  },
};

export const InferenceSession: InferenceSessionConstructor = class {
  static async create() { throw new Error('onnxruntime-web not loaded - use CDN at runtime'); }
  async run() { throw new Error('onnxruntime-web not loaded'); }
  release() {}
} as any;

export const Tensor = class {
  constructor(public type: string, public data: any, public dims: readonly number[]) {}
} as any;