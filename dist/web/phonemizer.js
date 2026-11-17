/**
 * tiny-voca — Fonemizador inglés basado en léxico IPA oficial
 * Multiplataforma: funciona en Browser (fetch) y Node/Bun (fs)
 */
// Vocabulary from config.json
const VOWELS = new Set([
    'ə', 'ɐ', 'ɚ', 'ᵻ', 'ɪ', 'i', 'iː', 'ɛ', 'æ', 'ʌ', 'ɑː', 'ɔ', 'ɔː', 'ʊ',
    'uː', 'ɜː', 'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː', 'ɑːɹ', 'ɔːɹ', 'oːɹ',
    'ɪɹ', 'ɛɹ', 'ʊɹ', 'aɪɚ', 'aɪə', 'əl', 'n̩',
]);
const CTRL = {
    '<pad>': 0, '<bos>': 1, '<eos>': 2, '<sp>': 3, 'ución': 4,
    ',': 5, '.': 6, '?': 7, '!': 8, ';': 9, ':': 10,
    '"': 11, "'": 12, '(': 13, ')': 14, '—': 15, '…': 16,
};
const PUNCT_MAP = {
    '.': '.', ',': ',', '?': '?', '!': '!', ';': ';', ':': ':',
    '"': '"', "'": "'", '(': '(', ')': ')',
    '—': '—', '–': '—', '…': '…',
    '[': '(', ']': ')',
    '¡': '!', '¿': '?',
    '“': '"', '”': '"',
    '‘': "'", '’': "'",
    '‹': '<', '›': '>',
};
const STRESS_NONE = 0;
const STRESS_PRIMARY = 1;
const STRESS_SECONDARY = 2;
const RULES = [
    [/ch/g, 'tʃ'], [/sh/g, 'ʃ'], [/ph/g, 'f'], [/gh/g, 'ɡ'],
    [/ng/g, 'ŋ'], [/ck/g, 'k'], [/qu/g, 'kw'], [/wh/g, 'w'],
    [/th/g, 'θ'], [/ee/g, 'iː'], [/ea/g, 'iː'], [/oo/g, 'uː'],
    [/oa/g, 'oʊ'], [/ai/g, 'eɪ'], [/ay/g, 'eɪ'], [/oy/g, 'ɔɪ'],
    [/oi/g, 'ɔɪ'], [/ow/g, 'oʊ'], [/ou/g, 'aʊ'], [/aw/g, 'ɔ'],
    [/au/g, 'ɔ'], [/er$/g, 'ɚ'], [/ir/g, 'ɜː'], [/ur/g, 'ɜː'],
    [/ar/g, 'ɑːɹ'], [/or/g, 'ɔːɹ'],
];
const SINGLE = {
    a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɔ', u: 'ʌ', y: 'ɪ',
    p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'ɡ',
    f: 'f', v: 'v', s: 's', z: 'z', h: 'h', m: 'm',
    n: 'n', l: 'l', r: 'ɹ', w: 'w', j: 'j',
};
const UNITS = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINALS = {
    one: 'first', two: 'second', three: 'third', four: 'fourth', five: 'fifth',
    six: 'sixth', seven: 'seventh', eight: 'eighth', nine: 'ninth', ten: 'tenth',
    eleven: 'eleventh', twelve: 'twelfth', thirteen: 'thirteenth',
    fourteen: 'fourteenth', fifteen: 'fifteenth', sixteen: 'sixteenth',
    seventeen: 'seventeenth', eighteen: 'eighteenth', nineteen: 'nineteenth',
    twenty: 'twentieth', thirty: 'thirtieth', forty: 'fortieth', fifty: 'fiftieth',
    sixty: 'sixtieth', seventy: 'seventieth', eighty: 'eightieth',
    ninety: 'ninetieth', hundred: 'hundredth', thousand: 'thousandth',
    million: 'millionth',
};
function intToWords(n) {
    if (n === 0)
        return 'zero';
    if (n < 0)
        return 'minus ' + intToWords(-n);
    const parts = [];
    const below1000 = (x) => {
        const s = [];
        if (x >= 100) {
            s.push(UNITS[Math.floor(x / 100)] + ' hundred');
            x %= 100;
        }
        if (x >= 20) {
            s.push(TENS[Math.floor(x / 10)]);
            x %= 10;
        }
        if (x > 0)
            s.push(UNITS[x]);
        return s.join(' ');
    };
    if (n >= 1_000_000_000) {
        parts.push(intToWords(Math.floor(n / 1_000_000_000)) + ' billion');
        n %= 1_000_000_000;
    }
    if (n >= 1_000_000) {
        parts.push(intToWords(Math.floor(n / 1_000_000)) + ' million');
        n %= 1_000_000;
    }
    if (n >= 1_000) {
        parts.push(intToWords(Math.floor(n / 1_000)) + ' thousand');
        n %= 1_000;
    }
    if (n > 0)
        parts.push(below1000(n));
    return parts.join(' ');
}
function toOrdinalWord(word) {
    return ORDINALS[word] ?? word + 'th';
}
function numberToWords(numStr) {
    const n = parseFloat(numStr);
    if (Number.isNaN(n))
        return null;
    if (numStr.includes('.')) {
        const [intPart, decPart] = numStr.split('.');
        return `${intToWords(parseInt(intPart, 10))} point ${decPart.split('').map(d => UNITS[parseInt(d, 10)]).join(' ')}`;
    }
    return intToWords(parseInt(numStr, 10));
}
function normalizeNumberWord(word) {
    if (/^\d+(st|nd|rd|th)$/i.test(word)) {
        return toOrdinalWord(intToWords(parseInt(word.replace(/\D+$/, ''), 10)));
    }
    if (/^\d+(\.\d+)?$/.test(word))
        return numberToWords(word) ?? word;
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(word))
        return numberToWords(word.replace(/,/g, '')) ?? word;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(word)) {
        const [h, m] = word.split(':').map(x => parseInt(x, 10));
        if (m === 0)
            return intToWords(h);
        return `${intToWords(h)} ${m < 10 ? 'o ' + intToWords(m) : intToWords(m)}`;
    }
    return word;
}
function ruleBasedPhonemize(word) {
    let w = word.toLowerCase();
    if (w.length > 2 && w.endsWith('e'))
        w = w.slice(0, -1);
    for (const [re, rep] of RULES)
        w = w.replace(re, rep);
    const syms = [];
    for (let i = 0; i < w.length; i++) {
        const c = w[i];
        if (c in SINGLE)
            syms.push(SINGLE[c]);
        else if (VOWELS.has(c))
            syms.push(c);
        else if (' ' !== c)
            syms.push('ə');
    }
    const collapsed = [];
    for (const s of syms)
        if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== s)
            collapsed.push(s);
    return assignStress(collapsed);
}
function assignStress(symbols) {
    let main = -1;
    for (let i = symbols.length - 1; i >= 0; i--) {
        if (VOWELS.has(symbols[i]) && symbols[i] !== 'ə' && symbols[i] !== 'ɐ') {
            main = i;
            break;
        }
    }
    if (main === -1)
        main = symbols.findIndex(s => VOWELS.has(s));
    const stress = symbols.map((s, i) => {
        if (!VOWELS.has(s))
            return STRESS_NONE;
        if (i === main)
            return STRESS_PRIMARY;
        if (symbols.length > 1)
            return STRESS_SECONDARY;
        return STRESS_NONE;
    });
    return { symbols, stress };
}
const MULTI_PHONEMES = [
    'aɪɚ', 'aɪə', 'ɑːɹ', 'ɔːɹ', 'oːɹ', 'ɪɹ', 'ɛɹ', 'ʊɹ',
    'tʃ', 'dʒ', 'iː', 'ɑː', 'ɔː', 'uː', 'ɜː', 'eɪ',
    'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː', 'əl', 'n̩',
];
export class Phonemizer {
    lexicon;
    vocab;
    unkId;
    constructor(vocab, lexiconTsv) {
        this.vocab = vocab;
        this.unkId = vocab['ución'] ?? 4;
        this.lexicon = this.parseLexicon(lexiconTsv);
    }
    parseLexicon(tsv) {
        const lexicon = new Map();
        for (const line of tsv.split('\n')) {
            if (!line || line.length < 2)
                continue;
            const tab = line.indexOf('\t');
            if (tab < 0)
                continue;
            const word = line.slice(0, tab);
            const ipa = line.slice(tab + 1).trim();
            const rawPhones = [];
            const stress = [];
            let inStress = 0, j = 0;
            while (j < ipa.length) {
                const ch = ipa[j];
                if (ch === 'ˈ') {
                    inStress = 1;
                    j++;
                    continue;
                }
                if (ch === 'ˌ') {
                    inStress = 2;
                    j++;
                    continue;
                }
                if (ch === ' ') {
                    j++;
                    continue;
                }
                let matched = false;
                for (const mp of MULTI_PHONEMES) {
                    if (ipa.startsWith(mp, j)) {
                        let sym = mp;
                        let k = j + mp.length;
                        while (k < ipa.length) {
                            const next = ipa[k], cp = next.codePointAt(0);
                            if (cp === 0x0329 || cp === 0x02B0 || cp === 0x02B2 || cp === 0x02E0 || cp === 0x02D0) {
                                sym += next;
                                k++;
                                continue;
                            }
                            break;
                        }
                        rawPhones.push(sym);
                        stress.push(VOWELS.has(sym) ? inStress : STRESS_NONE);
                        inStress = 0;
                        j = k;
                        matched = true;
                        break;
                    }
                }
                if (matched)
                    continue;
                let sym = ch;
                let k = j + 1;
                while (k < ipa.length) {
                    const next = ipa[k], cp = next.codePointAt(0);
                    if (cp === 0x0329 || cp === 0x02B0 || cp === 0x02B2 || cp === 0x02E0 || cp === 0x02D0) {
                        sym += next;
                        k++;
                        continue;
                    }
                    break;
                }
                rawPhones.push(sym);
                stress.push(VOWELS.has(sym) ? inStress : STRESS_NONE);
                inStress = 0;
                j = k;
            }
            lexicon.set(word, { symbols: rawPhones, stress });
        }
        return lexicon;
    }
    phonemize(text) {
        const symbols = [];
        const stresses = [];
        const unknownWords = [];
        const push = (sym, st) => { symbols.push(sym); stresses.push(st); };
        push('<bos>', STRESS_NONE);
        const TOKEN_RE = /[A-Za-zÀ-ÿ0-9]+(?:['''][A-Za-zÀ-ÿ0-9]+)*|[.,;:!?""''—–…()[\]{}]/g;
        const normalizedText = text.replace(/\.{3,}/g, '…');
        const tokens = [];
        for (const m of normalizedText.matchAll(TOKEN_RE)) {
            const token = m[0];
            if (token in CTRL || token in PUNCT_MAP)
                tokens.push({ type: 'punct', text: token });
            else
                tokens.push({ type: 'word', text: token });
        }
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === 'punct') {
                const mapped = PUNCT_MAP[token.text] ?? token.text;
                if (mapped in CTRL && mapped !== '<sp>')
                    push(mapped, STRESS_NONE);
            }
            else {
                let word = token.text.toLowerCase();
                if (word === 'i')
                    word = 'i';
                word = normalizeNumberWord(word);
                const entry = this.lexicon.get(word);
                const result = entry ?? (unknownWords.push(word), ruleBasedPhonemize(word));
                for (const s of result.symbols)
                    push(s, result.stress[result.symbols.indexOf(s)]);
                // Look ahead for punctuation
                if (i + 1 < tokens.length && tokens[i + 1].type === 'punct') {
                    const mapped = PUNCT_MAP[tokens[i + 1].text] ?? tokens[i + 1].text;
                    if (mapped in CTRL && mapped !== '<sp>') {
                        push(mapped, STRESS_NONE);
                        if (mapped === '…')
                            push('<sp>', STRESS_NONE); // extra pause for ellipsis
                    }
                    i++;
                }
                push('<sp>', STRESS_NONE);
            }
        }
        if (symbols[symbols.length - 1] === '<sp>') {
            symbols.pop();
            stresses.pop();
        }
        push('<eos>', STRESS_NONE);
        return {
            phones: symbols.map(s => this.vocab[s] ?? this.unkId),
            stress: stresses,
            symbols,
            unknownWords,
        };
    }
}
