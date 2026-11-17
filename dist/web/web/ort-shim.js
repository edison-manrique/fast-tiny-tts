// lib/web/ort-shim.ts
// Shim for onnxruntime-web - provides types for TypeScript compilation
// The actual onnxruntime-web will be loaded at runtime via CDN
export const env = {
    wasm: {
        wasmPaths: '',
        numThreads: 0,
    },
};
export const InferenceSession = class {
    static async create() { throw new Error('onnxruntime-web not loaded - use CDN at runtime'); }
    async run() { throw new Error('onnxruntime-web not loaded'); }
    release() { }
};
export const Tensor = class {
    type;
    data;
    dims;
    constructor(type, data, dims) {
        this.type = type;
        this.data = data;
        this.dims = dims;
    }
};
