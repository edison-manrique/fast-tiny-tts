/**
 * tiny-voca — Core TTS logic (environment-agnostic)
 */
import { Phonemizer } from './phonemizer.js';
// Cross-platform fetch and performance
const gFetch = typeof fetch !== 'undefined' ? fetch : undefined;
const gPerformance = typeof performance !== 'undefined' ? performance : { now: () => Date.now() };
export class TinyVocaCore {
    sampleRate = 24000;
    voices = ['F2', 'M2'];
    session;
    phonemizer;
    constructor(session, phonemizer) {
        this.session = session;
        this.phonemizer = phonemizer;
    }
    static async create(config) {
        if (!gFetch)
            throw new Error('fetch not available in this environment');
        // Load config.json
        const configResp = await gFetch(config.configPath ?? 'config.json');
        const cfg = await configResp.json();
        // Load lexicon.tsv
        const lexiconResp = await gFetch(config.phonemizerPath ?? 'lexicon.tsv');
        const lexiconTsv = await lexiconResp.text();
        const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);
        // Load ONNX model - implementation depends on environment
        const session = await TinyVocaCore.loadSession(config.modelPath ?? 'model.onnx', config.wasmPath);
        return new TinyVocaCore(session, phonemizer);
    }
    static async loadSession(modelUrl, wasmPath) {
        throw new Error('loadSession must be implemented by platform-specific entry point');
    }
    async synthesize(options) {
        const { text, voice = 'F2', speed = 1.0, pitchShift = 0, pitchRange = 1.0 } = options;
        const { phones, stress, unknownWords } = this.phonemizer.phonemize(text);
        const n = phones.length;
        const voiceId = voice === 'F2' ? 0 : 1;
        const t0 = gPerformance.now();
        const feeds = {
            tokens: { data: BigInt64Array.from(phones.map(p => BigInt(p))), dims: [1, n], type: 'int64' },
            stress: { data: BigInt64Array.from(stress.map(s => BigInt(s))), dims: [1, n], type: 'int64' },
            voice: { data: BigInt64Array.from([BigInt(voiceId)]), dims: [1], type: 'int64' },
            speed: { data: new Float32Array([speed]), dims: [1], type: 'float32' },
            pitch_shift: { data: new Float32Array([pitchShift]), dims: [1], type: 'float32' },
            pitch_range: { data: new Float32Array([pitchRange]), dims: [1], type: 'float32' },
        };
        const outputs = await this.session.run(feeds);
        const inferenceMs = gPerformance.now() - t0;
        const audio = outputs.audio.data;
        const durationsData = outputs.durations.data;
        const durations = new Int32Array(durationsData.length);
        for (let i = 0; i < durationsData.length; i++)
            durations[i] = Number(durationsData[i]);
        const audioSeconds = audio.length / this.sampleRate;
        const rtf = audioSeconds > 0 ? (inferenceMs / 1000) / audioSeconds : 0;
        return { audio, sampleRate: this.sampleRate, durations, inferenceMs, audioSeconds, rtf, unknownWords };
    }
    async warmup() {
        await this.synthesize({ text: 'Warmup.', voice: 'F2' });
    }
    dispose() { }
}
