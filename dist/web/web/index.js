/**
 * tiny-voca — Web/Browser entry point
 */
import * as ort from 'onnxruntime-web';
import { Phonemizer } from '../phonemizer.js';
import { TinyVocaCore } from '../core.js';
class WebTinyVoca extends TinyVocaCore {
    ortSession;
    constructor(ortSession, phonemizer) {
        const session = {
            run: async (feeds) => {
                const ortFeeds = {};
                for (const [key, tensor] of Object.entries(feeds)) {
                    ortFeeds[key] = tensor.data instanceof BigInt64Array
                        ? new ort.Tensor('int64', tensor.data, [...tensor.dims])
                        : new ort.Tensor('float32', tensor.data, [...tensor.dims]);
                }
                const results = await ortSession.run(ortFeeds);
                const output = {};
                for (const [key, tensor] of Object.entries(results)) {
                    output[key] = {
                        data: tensor.data,
                        dims: [...tensor.dims],
                    };
                }
                return output;
            },
        };
        super(session, phonemizer);
        this.ortSession = ortSession;
    }
    static async create(config = {}) {
        // Configure ONNX Runtime Web
        ort.env.wasm.wasmPaths = config.wasmPath ?? 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
        const baseUrl = config.modelPath
            ? new URL(config.modelPath, window.location.href).origin + '/'
            : '';
        const configPath = config.configPath ?? baseUrl + 'config.json';
        const phonemizerPath = config.phonemizerPath ?? baseUrl + 'lexicon.tsv';
        const modelPath = config.modelPath ?? baseUrl + 'model.onnx';
        // Load config and lexicon in parallel
        const [cfgResp, lexResp] = await Promise.all([
            fetch(configPath),
            fetch(phonemizerPath),
        ]);
        const cfg = await cfgResp.json();
        const lexiconTsv = await lexResp.text();
        const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);
        // Create ONNX session
        const sessionOptions = {
            executionProviders: config.executionProviders ?? ['webgpu', 'wasm'],
            graphOptimizationLevel: 'all',
        };
        const ortSession = await ort.InferenceSession.create(modelPath, sessionOptions);
        return new WebTinyVoca(ortSession, phonemizer);
    }
    dispose() {
        this.ortSession.release();
    }
}
export { WebTinyVoca as TinyVoca };
