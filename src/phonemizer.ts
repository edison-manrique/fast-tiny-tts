/**
 * fast-tiny-tts — Universal English Phonemizer based on official IPA Lexicon
 * Works cross-platform in Browser (fetch/tsv) and Node/Bun (fs/path).
 * Includes comprehensive normalization for numbers (175,000), currencies ($320,000, US$), acronyms (TTS, AI), etc.
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
  million: 'millionth', billion: 'billionth',
};

const MONTH_NAMES = [
  '',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function toOrdinalWord(numWords: string): string {
  const parts = numWords.split(' ');
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = ORDINALS[last] ?? last + 'th';
  return parts.join(' ');
}

function numberToWords(numStr: string): string | null {
  const n = parseFloat(numStr);
  if (Number.isNaN(n)) return null;

  if (numStr.includes('.')) {
    const [intPart, decPart] = numStr.split('.');
    const intWords = intToWords(parseInt(intPart, 10));
    const decWords = decPart.split('').map((d) => UNITS[parseInt(d, 10)] ?? d).join(' ');
    return `${intWords} point ${decWords}`;
  }

  return intToWords(parseInt(numStr, 10));
}

function formatCurrencyWords(amountStr: string, unitName: string): string {
  const clean = amountStr.replace(/,/g, '');
  if (clean.includes('.')) {
    const [intPart, decPart] = clean.split('.');
    const intVal = parseInt(intPart, 10) || 0;
    const decVal = parseInt(decPart.slice(0, 2).padEnd(2, '0'), 10) || 0;
    const intWords = intToWords(intVal);
    const decWords = intToWords(decVal);
    const singularUnit = unitName.replace(/s$/, '');
    const mainUnit = intVal === 1 ? singularUnit : unitName;
    const centUnit = decVal === 1 ? 'cent' : 'cents';
    if (intVal === 0 && decVal > 0) return `${decWords} ${centUnit}`;
    if (decVal === 0) return `${intWords} ${mainUnit}`;
    return `${intWords} ${mainUnit} and ${decWords} ${centUnit}`;
  } else {
    const intVal = parseInt(clean, 10) || 0;
    const intWords = intToWords(intVal);
    const singularUnit = unitName.replace(/s$/, '');
    const mainUnit = intVal === 1 ? singularUnit : unitName;
    return `${intWords} ${mainUnit}`;
  }
}

/**
 * Text Pre-normalizer: converts currencies, symbols, numbers with commas, and acronyms
 */
function normalizeTextForSpeech(text: string): string {
  let t = text;

  // 1. Normalize ellipsis ... or more to …
  t = t.replace(/\.{3,}/g, '…');

  // 1.1 Honorific titles before names: Dr. -> Doctor, Mr. -> Mister, Mrs. -> Missus, etc.
  t = t.replace(/\bdr\.\s*/gi, 'Doctor ');
  t = t.replace(/\bdr\b(?=\s+[A-Z])/gi, 'Doctor');
  t = t.replace(/\bmr\.\s*/gi, 'Mister ');
  t = t.replace(/\bmr\b(?=\s+[A-Z])/gi, 'Mister');
  t = t.replace(/\bmrs\.\s*/gi, 'Missus ');
  t = t.replace(/\bmrs\b(?=\s+[A-Z])/gi, 'Missus');
  t = t.replace(/\bms\.\s*/gi, 'Ms ');
  t = t.replace(/\bprof\.\s*/gi, 'Professor ');
  t = t.replace(/\bprof\b(?=\s+[A-Z])/gi, 'Professor');
  t = t.replace(/\bjr\.\s*/gi, 'Junior ');
  t = t.replace(/\bsr\.\s*/gi, 'Senior ');

  // 1.2 Dates in format M/D, MM/DD, M/D/YYYY, MM/DD/YYYY, M/D/YY (e.g. 3/14 -> March 14th, 12/25/2026 -> December 25th, 2026)
  t = t.replace(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])(?:\/(\d{2,4}))?\b/g, (match, mStr, dStr, yStr) => {
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      // Exclude simple fractions like 1/2, 1/3, 2/3, 1/4, 3/4
      const isFraction = !yStr && mStr.length === 1 && dStr.length === 1 &&
        ((m === 1 && [2, 3, 4, 8].includes(d)) || (m === 2 && d === 3) || (m === 3 && d === 4));
      if (!isFraction) {
        const monthName = MONTH_NAMES[m];
        const yearPart = yStr ? `, ${yStr.length === 2 ? '20' + yStr : yStr}` : '';
        return `${monthName} ${d}th${yearPart}`;
      }
    }
    return match;
  });

  // 2. Currencies with US$ / USD: US$ 320,000 / US$320000 / USD 175,000
  t = t.replace(/(?:US\$|USD)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return ' ' + formatCurrencyWords(num, 'U S dollars') + ' ';
  });

  // 3. Currencies with $: $ 320,000 / $320,000 / $320000 / $1,250.50 / $10
  t = t.replace(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g, (_, num) => {
    return ' ' + formatCurrencyWords(num, 'dollars') + ' ';
  });

  // 4. Other currencies: € / EUR, £ / GBP
  t = t.replace(/(?:€|EUR)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return ' ' + formatCurrencyWords(num, 'euros') + ' ';
  });
  t = t.replace(/(?:£|GBP)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return ' ' + formatCurrencyWords(num, 'pounds') + ' ';
  });

  // 5. Percentages: replace any % symbol with " percent "
  t = t.replace(/%/g, ' percent ');

  // 6. Decimal numbers: 15.5 -> 15 point 5, 0.25 -> zero point two five
  t = t.replace(/\b(\d+)\.(\d+)\b/g, (_, intPart, decPart) => {
    const decWords = decPart.split('').map((d: string) => UNITS[parseInt(d, 10)] ?? d).join(' ');
    return `${intPart} point ${decWords}`;
  });

  // 7. Quarters: Q1, Q2, Q3, Q4, 1Q, 2Q, 3Q, 4Q
  t = t.replace(/\b[Qq]([1-4])\b/g, 'Q $1');
  t = t.replace(/\b([1-4])[Qq]\b/g, '$1 Q');

  // 8. TTS variants: TTS, tts, Tts, t.t.s., tiny-tts, fast-tiny-tts
  t = t.replace(/\bt\.t\.s\.?\b/gi, ' T T S ');
  t = t.replace(/\b(?:fast-?)?(?:tiny-?)?tts\b/gi, (m) => {
    const lower = m.toLowerCase();
    if (lower === 'tts') return ' T T S ';
    if (lower.includes('tiny-tts')) return 'tiny T T S ';
    if (lower.includes('fast-tiny-tts')) return 'fast tiny T T S ';
    return ' T T S ';
  });

  // 9. Common technical acronyms & abbreviations (case-insensitive for acronyms)
  const ACRONYMS: Record<string, string> = {
    'TTS': 'T T S',
    'AI': 'A I',
    'ML': 'M L',
    'NLP': 'N L P',
    'ASR': 'A S R',
    'US': 'U S',
    'USA': 'U S A',
    'API': 'A P I',
    'APIs': 'A P I s',
    'CPU': 'C P U',
    'CPUs': 'C P U s',
    'GPU': 'G P U',
    'GPUs': 'G P U s',
    'ONNX': 'O N N X',
    'WASM': 'wasm',
    'HTML': 'H T M L',
    'CSS': 'C S S',
    'JS': 'J S',
    'UI': 'U I',
    'UX': 'U X',
    'URL': 'U R L',
    'URLs': 'U R L s',
    'HTTP': 'H T T P',
    'HTTPS': 'H T T P S',
    'SDK': 'S D K',
    'SDKs': 'S D K s',
    'CLI': 'C L I',
    'RTF': 'R T F',
    'LLM': 'L L M',
    'LLMs': 'L L M s',
    'FAQ': 'F A Q',
    'ID': 'I D',
    'OS': 'O S',
    'PC': 'P C',
    'SQL': 'S Q L',
  };

  for (const [acronym, replacement] of Object.entries(ACRONYMS)) {
    const re = new RegExp(`\\b${acronym}\\b`, 'gi');
    t = t.replace(re, replacement);
  }

  // Common units
  t = t.replace(/\b(\d+)\s*(?:kHz|khz)\b/gi, '$1 kilohertz');
  t = t.replace(/\b(\d+)\s*(?:MHz|mhz)\b/gi, '$1 megahertz');
  t = t.replace(/\b(\d+)\s*(?:GHz|ghz)\b/gi, '$1 gigahertz');
  t = t.replace(/\b(\d+)\s*ms\b/gi, '$1 milliseconds');
  t = t.replace(/\b(\d+)\s*(?:KB|kb)\b/gi, '$1 kilobytes');
  t = t.replace(/\b(\d+)\s*(?:MB|mb)\b/gi, '$1 megabytes');
  t = t.replace(/\b(\d+)\s*(?:GB|gb)\b/gi, '$1 gigabytes');
  t = t.replace(/\b(\d+)\s*(?:TB|tb)\b/gi, '$1 terabytes');
  t = t.replace(/\b(\d+)\s*mph\b/gi, '$1 miles per hour');
  t = t.replace(/\b(\d+)\s*km\b/gi, '$1 kilometers');

  // Common word abbreviations
  t = t.replace(/\betc\./gi, 'etcetera');
  t = t.replace(/\betc\b/gi, 'etcetera');
  t = t.replace(/\be\.g\.,?/gi, 'for example');
  t = t.replace(/\bi\.e\.,?/gi, 'that is');
  t = t.replace(/\bvs\./gi, 'versus');
  t = t.replace(/\bvs\b/gi, 'versus');

  // Math symbols
  t = t.replace(/\s*=\s*/g, ' equals ');
  t = t.replace(/\s*\+\s*/g, ' plus ');
  t = t.replace(/&/g, ' and ');

  // 7. Numbers with commas (e.g. 175,000 or 1,250,000.50) -> strip comma inside numbers
  // This ensures the tokenizer keeps them together as a numeric unit rather than splitting on the comma!
  t = t.replace(/\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g, (match) => {
    return match.replace(/,/g, '');
  });

  return t;
}

function normalizeNumberWord(word: string): string {
  // 14th, 1st, 2nd, 3rd, 21st, 100th
  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    const numPart = word.replace(/\D+$/, '');
    const n = parseInt(numPart, 10);
    return toOrdinalWord(intToWords(n));
  }

  // Pure numbers
  if (/^\d+(\.\d+)?$/.test(word)) {
    return numberToWords(word) ?? word;
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

    // Ensure custom essentials are registered in the lexicon
    if (!this.lexicon.has('tts')) {
      this.lexicon.set('tts', {
        symbols: ['t', 'iː', 't', 'iː', 'ɛ', 's'],
        stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY],
      });
    }
    if (!this.lexicon.has('voca')) {
      this.lexicon.set('voca', {
        symbols: ['v', 'oʊ', 'k', 'ə'],
        stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_NONE, STRESS_NONE],
      });
    }
    // Quarters
    this.lexicon.set('q1', {
      symbols: ['k', 'j', 'uː', 'w', 'ʌ', 'n'],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY],
    });
    this.lexicon.set('q2', {
      symbols: ['k', 'j', 'uː', 't', 'uː'],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY],
    });
    this.lexicon.set('q3', {
      symbols: ['k', 'j', 'uː', 'θ', 'ɹ', 'iː'],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY],
    });
    this.lexicon.set('q4', {
      symbols: ['k', 'j', 'uː', 'f', 'oːɹ'],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY],
    });
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

    // Pre-normalize text for numbers, currencies, acronyms, and symbols
    const normalizedText = normalizeTextForSpeech(text);

    const TOKEN_RE = /[A-Za-zÀ-ÿ0-9]+(?:['''][A-Za-zÀ-ÿ0-9]+)*|[.,;:!?""''—–…()[\]{}]/g;

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
        const rawWord = token.text.toLowerCase();
        const expandedStr = normalizeNumberWord(rawWord);
        // Split in case a number or abbreviation expanded into multiple words
        const subWords = expandedStr.split(/\s+/).filter(Boolean);

        for (let wIdx = 0; wIdx < subWords.length; wIdx++) {
          const word = subWords[wIdx];
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

          if (wIdx < subWords.length - 1) {
            push('<sp>', STRESS_NONE);
          }
        }

        // Punctuation following this word
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
