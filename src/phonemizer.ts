/**
 * fast-tiny-tts — Universal English Phonemizer based on official IPA Lexicon
 * Works cross-platform in Browser (fetch/tsv) and Node/Bun (fs/path).
 */

export interface PhonemizeResult {
  phones: number[];       // Phoneme token IDs (including <bos> and <eos>)
  stress: number[];       // 0 none | 1 primary | 2 secondary
  symbols: string[];      // Readable IPA symbols for debugging
  unknownWords: string[]; // Words not found in lexicon
}

export type Phoneme = {
  symbol: string;
  stress: 0 | 1 | 2;
};

// Vowels from config.json
export const VOWELS = new Set([
  'ə', 'ɐ', 'ɚ', 'ᵻ', 'ɪ', 'i', 'iː', 'ɛ', 'æ', 'ʌ', 'ɑː', 'ɔ', 'ɔː', 'ʊ',
  'uː', 'ɜː', 'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː', 'ɑːɹ', 'ɔːɹ', 'oːɹ',
  'ɪɹ', 'ɛɹ', 'ʊɹ', 'aɪɚ', 'aɪə', 'əl', 'n̩',
]);

export const CTRL: Record<string, number> = {
  '<pad>': 0, '<bos>': 1, '<eos>': 2, '<sp>': 3, '<unk>': 4,
  ',': 5, '.': 6, '?': 7, '!': 8, ';': 9, ':': 10,
  '"': 11, "'": 12, '(': 13, ')': 14, '—': 15, '…': 16,
};

export const PUNCT_MAP: Record<string, string> = {
  '.': '.', ',': ',', '?': '?', '!': '!', ';': ';', ':': ':',
  '"': '"', "'": "'", '(': '(', ')': ')',
  '—': '—', '–': '—', '…': '…',
  '[': '(', ']': ')',
  '¡': '!', '¿': '?',
  '“': '"', '”': '"',
  '‘': "'", '’': "'",
  '‹': '<', '›': '>',
};

export const STRESS_NONE = 0;
export const STRESS_PRIMARY = 1;
export const STRESS_SECONDARY = 2;

const MULTI_PHONEMES = [
  'aɪɚ', 'aɪə', 'ɑːɹ', 'ɔːɹ', 'oːɹ', 'ɪɹ', 'ɛɹ', 'ʊɹ',
  'tʃ', 'dʒ', 'iː', 'ɑː', 'ɔː', 'uː', 'ɜː', 'eɪ',
  'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː', 'əl', 'n̩',
];

const RULES: [RegExp, string][] = [
  [/ch/g, 'tʃ'], [/sh/g, 'ʃ'], [/ph/g, 'f'], [/gh/g, 'ɡ'],
  [/ng/g, 'ŋ'], [/ck/g, 'k'], [/qu/g, 'kw'], [/wh/g, 'w'],
  [/th/g, 'θ'], [/ee/g, 'iː'], [/ea/g, 'iː'], [/oo/g, 'uː'],
  [/oa/g, 'oʊ'], [/ai/g, 'eɪ'], [/ay/g, 'eɪ'], [/oy/g, 'ɔɪ'],
  [/oi/g, 'ɔɪ'], [/ow/g, 'oʊ'], [/ou/g, 'aʊ'], [/aw/g, 'ɔ'],
  [/au/g, 'ɔ'], [/er$/g, 'ɚ'], [/ir/g, 'ɜː'], [/ur/g, 'ɜː'],
  [/ar/g, 'ɑːɹ'], [/or/g, 'ɔːɹ'],
];

const SINGLE: Record<string, string> = {
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

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty',
  'sixty', 'seventy', 'eighty', 'ninety',
];

const ORDINALS: Record<string, string> = {
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

function intToWords(n: number): string {
  if (n === 0) return 'zero';
  if (n < 0) return 'minus ' + intToWords(-n);
  const parts: string[] = [];

  const below1000 = (x: number): string => {
    const s: string[] = [];
    if (x >= 100) {
      s.push(UNITS[Math.floor(x / 100)] + ' hundred');
      x %= 100;
    }
    if (x >= 20) {
      s.push(TENS[Math.floor(x / 10)]);
      x %= 10;
    }
    if (x > 0) s.push(UNITS[x]);
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
  if (n > 0) {
    parts.push(below1000(n));
  }
  return parts.join(' ');
}

function toOrdinalWord(word: string): string {
  return ORDINALS[word] ?? word + 'th';
}

function numberToWords(numStr: string): string | null {
  const n = parseFloat(numStr);
  if (Number.isNaN(n)) return null;

  if (numStr.includes('.')) {
    const [intPart, decPart] = numStr.split('.');
    const intWords = intToWords(parseInt(intPart, 10));
    const decWords = decPart.split('').map((d) => UNITS[parseInt(d, 10)]).join(' ');
    return `${intWords} point ${decWords}`;
  }

  return intToWords(parseInt(numStr, 10));
}

function normalizeNumberWord(word: string): string {
  // 14th, 1st, 2nd, 3rd
  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    const numPart = word.replace(/\D+$/, '');
    const n = parseInt(numPart, 10);
    return toOrdinalWord(intToWords(n));
  }

  // Pure numbers
  if (/^\d+(\.\d+)?$/.test(word)) {
    return numberToWords(word) ?? word;
  }

  // 1,000 / 1,250.50
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(word)) {
    const cleaned = word.replace(/,/g, '');
    return numberToWords(cleaned) ?? word;
  }

  // 3:30 -> three thirty
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(word)) {
    const parts = word.split(':');
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (min === 0) return intToWords(hour);
      return `${intToWords(hour)} ${min < 10 ? 'o ' + intToWords(min) : intToWords(min)}`;
    }
  }

  return word;
}

function assignStress(symbols: string[]): { symbols: string[]; stress: number[] } {
  let main = -1;
  for (let i = symbols.length - 1; i >= 0; i--) {
    if (VOWELS.has(symbols[i]) && symbols[i] !== 'ə' && symbols[i] !== 'ɐ') {
      main = i;
      break;
    }
  }
  if (main === -1) main = symbols.findIndex((s) => VOWELS.has(s));
  const stress = symbols.map((s, i) => {
    if (!VOWELS.has(s)) return STRESS_NONE;
    if (i === main) return STRESS_PRIMARY;
    if (symbols.length > 1) return STRESS_SECONDARY;
    return STRESS_NONE;
  });
  return { symbols, stress };
}

function ruleBasedPhonemize(word: string): { symbols: string[]; stress: number[] } {
  let w = word.toLowerCase();
  if (w.length > 2 && w.endsWith('e')) w = w.slice(0, -1);
  for (const [re, rep] of RULES) w = w.replace(re, rep);
  const syms: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (c in SINGLE) syms.push(SINGLE[c]);
    else if (VOWELS.has(c)) syms.push(c);
    else if (' ' !== c) syms.push('ə');
  }
  const collapsed: string[] = [];
  for (const s of syms) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== s) collapsed.push(s);
  }
  return assignStress(collapsed);
}

export type Lexicon = Map<string, { symbols: string[]; stress: number[] }>;

export function parseLexiconTsv(tsvContent: string): Lexicon {
  const lexicon: Lexicon = new Map();
  const lines = tsvContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 2) continue;
    const tab = line.indexOf('\t');
    if (tab < 0) continue;

    const word = line.slice(0, tab);
    const ipa = line.slice(tab + 1).trim();

    const rawPhones: string[] = [];
    const stress: number[] = [];
    let inStress = 0;
    let j = 0;

    while (j < ipa.length) {
      const ch = ipa[j];
      if (ch === 'ˈ') { inStress = 1; j++; continue; }
      if (ch === 'ˌ') { inStress = 2; j++; continue; }
      if (ch === ' ') { j++; continue; }

      let matched = false;
      for (const mp of MULTI_PHONEMES) {
        if (ipa.startsWith(mp, j)) {
          let sym = mp;
          let k = j + mp.length;
          while (k < ipa.length) {
            const next = ipa[k];
            const cp = next.codePointAt(0)!;
            if (cp === 0x0329 || cp === 0x02B0 || cp === 0x02B2 || cp === 0x02E0 || cp === 0x02D0) {
              sym += next; k++; continue;
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

      if (!matched) {
        rawPhones.push(ch);
        stress.push(VOWELS.has(ch) ? inStress : STRESS_NONE);
        inStress = 0;
        j++;
      }
    }

    lexicon.set(word, { symbols: rawPhones, stress });
  }

  return lexicon;
}

export class Phonemizer {
  private lexicon: Lexicon;
  private vocab: Record<string, number>;
  private unkId: number;

  /**
   * Universal constructor supporting both:
   *   new Phonemizer(vocab, lexiconTsvString)
   *   new Phonemizer(lexiconPathOrTsv, vocab)
   */
  constructor(arg1: any, arg2?: any) {
    let vocab: Record<string, number>;
    let lexiconSource: string;

    if (typeof arg1 === 'object' && arg1 !== null && typeof arg2 === 'string') {
      vocab = arg1;
      lexiconSource = arg2;
    } else if (typeof arg1 === 'string' && typeof arg2 === 'object') {
      lexiconSource = arg1;
      vocab = arg2;
    } else {
      throw new Error('Phonemizer constructor requires (vocab, lexiconSource) or (lexiconPath, vocab)');
    }

    this.vocab = vocab;
    this.unkId = vocab['<unk>'] ?? 4;

    // Check if lexiconSource is TSV text directly or a file path
    if (lexiconSource.includes('\t') || lexiconSource.includes('\n')) {
      this.lexicon = parseLexiconTsv(lexiconSource);
    } else {
      // It's a file path: load using node fs
      try {
        const fs = typeof require !== 'undefined' ? require('fs') : undefined;
        if (fs && fs.readFileSync) {
          const content = fs.readFileSync(lexiconSource, 'utf8');
          this.lexicon = parseLexiconTsv(content);
        } else {
          throw new Error('File path loading only available in Node/Bun environment. Pass TSV content string in browser.');
        }
      } catch (err: any) {
        throw new Error(`Failed to load lexicon from "${lexiconSource}": ${err.message}`);
      }
    }
  }

  static fromTsv(lexiconTsv: string, vocab: Record<string, number>): Phonemizer {
    return new Phonemizer(vocab, lexiconTsv);
  }

  private toId(symbol: string): number {
    return this.vocab[symbol] ?? this.unkId;
  }

  phonemize(text: string): PhonemizeResult {
    const symbols: string[] = [];
    const stresses: number[] = [];
    const unknownWords: string[] = [];

    const push = (sym: string, st: number) => {
      symbols.push(sym);
      stresses.push(st);
    };

    push('<bos>', STRESS_NONE);

    const TOKEN_RE = /[A-Za-zÀ-ÿ0-9]+(?:['''][A-Za-zÀ-ÿ0-9]+)*|[.,;:!?""''—–…()[\]{}]/g;
    const normalizedText = text.replace(/\.{3,}/g, '…');

    const tokens: Array<{ type: 'word' | 'punct'; text: string }> = [];
    for (const m of normalizedText.matchAll(TOKEN_RE)) {
      const token = m[0];
      if (token in CTRL || token in PUNCT_MAP) {
        tokens.push({ type: 'punct', text: token });
      } else {
        tokens.push({ type: 'word', text: token });
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'punct') {
        const mapped = PUNCT_MAP[token.text] ?? token.text;
        if (mapped in CTRL && mapped !== '<sp>') {
          push(mapped, STRESS_NONE);
        }
      } else {
        let word = token.text.toLowerCase();
        word = normalizeNumberWord(word);

        const entry = this.lexicon.get(word);
        let result: { symbols: string[]; stress: number[] };
        if (entry) {
          result = entry;
        } else {
          unknownWords.push(word);
          result = ruleBasedPhonemize(word);
        }

        for (let j = 0; j < result.symbols.length; j++) {
          push(result.symbols[j], result.stress[j]);
        }

        if (i + 1 < tokens.length && tokens[i + 1].type === 'punct') {
          const nextToken = tokens[i + 1];
          const mapped = PUNCT_MAP[nextToken.text] ?? nextToken.text;
          if (mapped in CTRL && mapped !== '<sp>') {
            push(mapped, STRESS_NONE);
            if (mapped === '…') {
              push('<sp>', STRESS_NONE);
            }
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
    const phones = symbols.map((s) => this.toId(s));

    return { phones, stress: stresses, symbols, unknownWords };
  }
}
