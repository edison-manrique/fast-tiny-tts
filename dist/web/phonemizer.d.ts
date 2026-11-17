/**
 * tiny-voca — Fonemizador inglés basado en léxico IPA oficial
 * Multiplataforma: funciona en Browser (fetch) y Node/Bun (fs)
 */
import type { PhonemizeResult } from './types.js';
export declare class Phonemizer {
    private lexicon;
    private vocab;
    private unkId;
    constructor(vocab: Record<string, number>, lexiconTsv: string);
    private parseLexicon;
    phonemize(text: string): PhonemizeResult;
}
