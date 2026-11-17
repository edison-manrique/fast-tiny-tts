var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/web/index.ts
import * as ort from "onnxruntime-web";

// src/phonemizer.ts
var VOWELS = /* @__PURE__ */ new Set([
  "\u0259",
  "\u0250",
  "\u025A",
  "\u1D7B",
  "\u026A",
  "i",
  "i\u02D0",
  "\u025B",
  "\xE6",
  "\u028C",
  "\u0251\u02D0",
  "\u0254",
  "\u0254\u02D0",
  "\u028A",
  "u\u02D0",
  "\u025C\u02D0",
  "e\u026A",
  "a\u026A",
  "\u0254\u026A",
  "o\u028A",
  "a\u028A",
  "i\u0259",
  "o\u02D0",
  "\u0251\u02D0\u0279",
  "\u0254\u02D0\u0279",
  "o\u02D0\u0279",
  "\u026A\u0279",
  "\u025B\u0279",
  "\u028A\u0279",
  "a\u026A\u025A",
  "a\u026A\u0259",
  "\u0259l",
  "n\u0329"
]);
var CTRL = {
  "<pad>": 0,
  "<bos>": 1,
  "<eos>": 2,
  "<sp>": 3,
  "<unk>": 4,
  ",": 5,
  ".": 6,
  "?": 7,
  "!": 8,
  ";": 9,
  ":": 10,
  '"': 11,
  "'": 12,
  "(": 13,
  ")": 14,
  "\u2014": 15,
  "\u2026": 16
};
var PUNCT_MAP = {
  ".": ".",
  ",": ",",
  "?": "?",
  "!": "!",
  ";": ";",
  ":": ":",
  '"': '"',
  "'": "'",
  "(": "(",
  ")": ")",
  "\u2014": "\u2014",
  "\u2013": "\u2014",
  "\u2026": "\u2026",
  "[": "(",
  "]": ")",
  "\xA1": "!",
  "\xBF": "?",
  "\u201C": '"',
  "\u201D": '"',
  "\u2018": "'",
  "\u2019": "'",
  "\u2039": "<",
  "\u203A": ">"
};
var STRESS_NONE = 0;
var STRESS_PRIMARY = 1;
var STRESS_SECONDARY = 2;
var MULTI_PHONEMES = [
  "a\u026A\u025A",
  "a\u026A\u0259",
  "\u0251\u02D0\u0279",
  "\u0254\u02D0\u0279",
  "o\u02D0\u0279",
  "\u026A\u0279",
  "\u025B\u0279",
  "\u028A\u0279",
  "t\u0283",
  "d\u0292",
  "i\u02D0",
  "\u0251\u02D0",
  "\u0254\u02D0",
  "u\u02D0",
  "\u025C\u02D0",
  "e\u026A",
  "a\u026A",
  "\u0254\u026A",
  "o\u028A",
  "a\u028A",
  "i\u0259",
  "o\u02D0",
  "\u0259l",
  "n\u0329"
];
var RULES = [
  [/ch/g, "t\u0283"],
  [/sh/g, "\u0283"],
  [/ph/g, "f"],
  [/gh/g, "\u0261"],
  [/ng/g, "\u014B"],
  [/ck/g, "k"],
  [/qu/g, "kw"],
  [/wh/g, "w"],
  [/th/g, "\u03B8"],
  [/ee/g, "i\u02D0"],
  [/ea/g, "i\u02D0"],
  [/oo/g, "u\u02D0"],
  [/oa/g, "o\u028A"],
  [/ai/g, "e\u026A"],
  [/ay/g, "e\u026A"],
  [/oy/g, "\u0254\u026A"],
  [/oi/g, "\u0254\u026A"],
  [/ow/g, "o\u028A"],
  [/ou/g, "a\u028A"],
  [/aw/g, "\u0254"],
  [/au/g, "\u0254"],
  [/er$/g, "\u025A"],
  [/ir/g, "\u025C\u02D0"],
  [/ur/g, "\u025C\u02D0"],
  [/ar/g, "\u0251\u02D0\u0279"],
  [/or/g, "\u0254\u02D0\u0279"]
];
var SINGLE = {
  a: "\xE6",
  e: "\u025B",
  i: "\u026A",
  o: "\u0254",
  u: "\u028C",
  y: "\u026A",
  p: "p",
  b: "b",
  t: "t",
  d: "d",
  k: "k",
  g: "\u0261",
  f: "f",
  v: "v",
  s: "s",
  z: "z",
  h: "h",
  m: "m",
  n: "n",
  l: "l",
  r: "\u0279",
  w: "w",
  j: "j"
};
var UNITS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
];
var TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
];
var ORDINALS = {
  one: "first",
  two: "second",
  three: "third",
  four: "fourth",
  five: "fifth",
  six: "sixth",
  seven: "seventh",
  eight: "eighth",
  nine: "ninth",
  ten: "tenth",
  eleven: "eleventh",
  twelve: "twelfth",
  thirteen: "thirteenth",
  fourteen: "fourteenth",
  fifteen: "fifteenth",
  sixteen: "sixteenth",
  seventeen: "seventeenth",
  eighteen: "eighteenth",
  nineteen: "nineteenth",
  twenty: "twentieth",
  thirty: "thirtieth",
  forty: "fortieth",
  fifty: "fiftieth",
  sixty: "sixtieth",
  seventy: "seventieth",
  eighty: "eightieth",
  ninety: "ninetieth",
  hundred: "hundredth",
  thousand: "thousandth",
  million: "millionth",
  billion: "billionth"
};
var MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function intToWords(n) {
  if (n === 0) return "zero";
  if (n < 0) return "minus " + intToWords(-n);
  const parts = [];
  const below1000 = (x) => {
    const s = [];
    if (x >= 100) {
      s.push(UNITS[Math.floor(x / 100)] + " hundred");
      x %= 100;
    }
    if (x >= 20) {
      s.push(TENS[Math.floor(x / 10)]);
      x %= 10;
    }
    if (x > 0) s.push(UNITS[x]);
    return s.join(" ");
  };
  if (n >= 1e9) {
    parts.push(intToWords(Math.floor(n / 1e9)) + " billion");
    n %= 1e9;
  }
  if (n >= 1e6) {
    parts.push(intToWords(Math.floor(n / 1e6)) + " million");
    n %= 1e6;
  }
  if (n >= 1e3) {
    parts.push(intToWords(Math.floor(n / 1e3)) + " thousand");
    n %= 1e3;
  }
  if (n > 0) {
    parts.push(below1000(n));
  }
  return parts.join(" ");
}
function toOrdinalWord(numWords) {
  const parts = numWords.split(" ");
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = ORDINALS[last] ?? last + "th";
  return parts.join(" ");
}
function numberToWords(numStr) {
  const n = parseFloat(numStr);
  if (Number.isNaN(n)) return null;
  if (numStr.includes(".")) {
    const [intPart, decPart] = numStr.split(".");
    const intWords = intToWords(parseInt(intPart, 10));
    const decWords = decPart.split("").map((d) => UNITS[parseInt(d, 10)] ?? d).join(" ");
    return `${intWords} point ${decWords}`;
  }
  return intToWords(parseInt(numStr, 10));
}
function formatCurrencyWords(amountStr, unitName) {
  const clean = amountStr.replace(/,/g, "");
  if (clean.includes(".")) {
    const [intPart, decPart] = clean.split(".");
    const intVal = parseInt(intPart, 10) || 0;
    const decVal = parseInt(decPart.slice(0, 2).padEnd(2, "0"), 10) || 0;
    const intWords = intToWords(intVal);
    const decWords = intToWords(decVal);
    const singularUnit = unitName.replace(/s$/, "");
    const mainUnit = intVal === 1 ? singularUnit : unitName;
    const centUnit = decVal === 1 ? "cent" : "cents";
    if (intVal === 0 && decVal > 0) return `${decWords} ${centUnit}`;
    if (decVal === 0) return `${intWords} ${mainUnit}`;
    return `${intWords} ${mainUnit} and ${decWords} ${centUnit}`;
  } else {
    const intVal = parseInt(clean, 10) || 0;
    const intWords = intToWords(intVal);
    const singularUnit = unitName.replace(/s$/, "");
    const mainUnit = intVal === 1 ? singularUnit : unitName;
    return `${intWords} ${mainUnit}`;
  }
}
function normalizeTextForSpeech(text) {
  let t = text || "";
  t = t.replace(/\.{3,}/g, "\u2026");
  t = t.replace(/~/g, " approximately ");
  t = t.replace(/\bdr\.\s*/gi, "Doctor ");
  t = t.replace(/\bdr\b(?=\s+[A-Z])/gi, "Doctor");
  t = t.replace(/\bmr\.\s*/gi, "Mister ");
  t = t.replace(/\bmr\b(?=\s+[A-Z])/gi, "Mister");
  t = t.replace(/\bmrs\.\s*/gi, "Missus ");
  t = t.replace(/\bmrs\b(?=\s+[A-Z])/gi, "Missus");
  t = t.replace(/\bms\.\s*/gi, "Ms ");
  t = t.replace(/\bprof\.\s*/gi, "Professor ");
  t = t.replace(/\bprof\b(?=\s+[A-Z])/gi, "Professor");
  t = t.replace(/\bjr\.\s*/gi, "Junior ");
  t = t.replace(/\bsr\.\s*/gi, "Senior ");
  t = t.replace(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])(?:\/(\d{2,4}))?\b/g, (match, mStr, dStr, yStr) => {
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const isFraction = !yStr && mStr.length === 1 && dStr.length === 1 && (m === 1 && [2, 3, 4, 8].includes(d) || m === 2 && d === 3 || m === 3 && d === 4);
      if (!isFraction) {
        const monthName = MONTH_NAMES[m];
        const yearPart = yStr ? `, ${yStr.length === 2 ? "20" + yStr : yStr}` : "";
        return `${monthName} ${d}th${yearPart}`;
      }
    }
    return match;
  });
  t = t.replace(/\bargon-?2-?id\b/gi, "Argon two I D");
  t = t.replace(/\bargon-?2-?i\b/gi, "Argon two I");
  t = t.replace(/\bargon-?2-?d\b/gi, "Argon two D");
  t = t.replace(/\bargon-?2\b/gi, "Argon two");
  t = t.replace(/\bBIP-?(\d+)\b/gi, "B I P $1");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:TB|tb)\b/gi, "$1 terabytes");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:GB|gb)\b/gi, "$1 gigabytes");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:MB|mb)\b/gi, "$1 megabytes");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:KB|kb)\b/gi, "$1 kilobytes");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:GHz|ghz)\b/gi, "$1 gigahertz");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:MHz|mhz)\b/gi, "$1 megahertz");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*(?:kHz|khz)\b/gi, "$1 kilohertz");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*Hz\b/gi, "$1 hertz");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, "$1 milliseconds");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*mph\b/gi, "$1 miles per hour");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*km\b/gi, "$1 kilometers");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*M\b/g, "$1 million");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*B\b/g, "$1 billion");
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*[Kk]\b/g, "$1 thousand");
  t = t.replace(/(?:US\$|USD)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return " " + formatCurrencyWords(num, "U S dollars") + " ";
  });
  t = t.replace(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g, (_, num) => {
    return " " + formatCurrencyWords(num, "dollars") + " ";
  });
  t = t.replace(/(?:€|EUR)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return " " + formatCurrencyWords(num, "euros") + " ";
  });
  t = t.replace(/(?:£|GBP)\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/gi, (_, num) => {
    return " " + formatCurrencyWords(num, "pounds") + " ";
  });
  t = t.replace(/%/g, " percent ");
  t = t.replace(/\b(\d+)\.(\d+)\b/g, (_, intPart, decPart) => {
    const decWords = decPart.split("").map((d) => UNITS[parseInt(d, 10)] ?? d).join(" ");
    return `${intPart} point ${decWords}`;
  });
  t = t.replace(/\b[Qq]([1-4])\b/g, "Q $1");
  t = t.replace(/\b([1-4])[Qq]\b/g, "$1 Q");
  t = t.replace(/\bt\.t\.s\.?\b/gi, " T T S ");
  t = t.replace(/\b(?:fast-?)?(?:tiny-?)?tts\b/gi, (m) => {
    const lower = m.toLowerCase();
    if (lower === "tts") return " T T S ";
    if (lower.includes("tiny-tts")) return "tiny T T S ";
    if (lower.includes("fast-tiny-tts")) return "fast tiny T T S ";
    return " T T S ";
  });
  const ACRONYMS = {
    "TTS": "T T S",
    "AI": "A I",
    "ML": "M L",
    "NLP": "N L P",
    "ASR": "A S R",
    "US": "U S",
    "USA": "U S A",
    "API": "A P I",
    "APIs": "A P I s",
    "CPU": "C P U",
    "CPUs": "C P U s",
    "GPU": "G P U",
    "GPUs": "G P U s",
    "ONNX": "O N N X",
    "WASM": "wasm",
    "HTML": "H T M L",
    "CSS": "C S S",
    "JS": "J S",
    "UI": "U I",
    "UX": "U X",
    "URL": "U R L",
    "URLs": "U R L s",
    "HTTP": "H T T P",
    "HTTPS": "H T T P S",
    "SDK": "S D K",
    "SDKs": "S D K s",
    "CLI": "C L I",
    "RTF": "R T F",
    "PCM": "P C M",
    "BIP": "B I P",
    "WAV": "W A V",
    "LLM": "L L M",
    "LLMs": "L L M s",
    "FAQ": "F A Q",
    "ID": "I D",
    "OS": "O S",
    "PC": "P C",
    "SQL": "S Q L"
  };
  for (const [acronym, replacement] of Object.entries(ACRONYMS)) {
    const re = new RegExp(`\\b${acronym}\\b`, "gi");
    t = t.replace(re, replacement);
  }
  t = t.replace(/\betc\./gi, "etcetera");
  t = t.replace(/\betc\b/gi, "etcetera");
  t = t.replace(/\be\.g\.,?/gi, "for example");
  t = t.replace(/\bi\.e\.,?/gi, "that is");
  t = t.replace(/\bvs\./gi, "versus");
  t = t.replace(/\bvs\b/gi, "versus");
  t = t.replace(/\s*=\s*/g, " equals ");
  t = t.replace(/\s*\+\s*/g, " plus ");
  t = t.replace(/&/g, " and ");
  t = t.replace(/\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b/g, (match) => {
    return match.replace(/,/g, "");
  });
  return t;
}
function normalizeNumberWord(word) {
  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    const numPart = word.replace(/\D+$/, "");
    const n = parseInt(numPart, 10);
    return toOrdinalWord(intToWords(n));
  }
  if (/^\d+(\.\d+)?$/.test(word)) {
    return numberToWords(word) ?? word;
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(word)) {
    const parts = word.split(":");
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const min = parseInt(parts[1], 10);
      if (min === 0) return intToWords(hour);
      return `${intToWords(hour)} ${min < 10 ? "o " + intToWords(min) : intToWords(min)}`;
    }
  }
  return word;
}
function assignStress(symbols) {
  let main = -1;
  for (let i = symbols.length - 1; i >= 0; i--) {
    if (VOWELS.has(symbols[i]) && symbols[i] !== "\u0259" && symbols[i] !== "\u0250") {
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
function ruleBasedPhonemize(word) {
  let w = word.toLowerCase();
  if (w.length > 2 && w.endsWith("e")) w = w.slice(0, -1);
  for (const [re, rep] of RULES) w = w.replace(re, rep);
  const syms = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (c in SINGLE) syms.push(SINGLE[c]);
    else if (VOWELS.has(c)) syms.push(c);
    else if (" " !== c) syms.push("\u0259");
  }
  const collapsed = [];
  for (const s of syms) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== s) collapsed.push(s);
  }
  return assignStress(collapsed);
}
var VOICELESS_CONSONANTS = /* @__PURE__ */ new Set(["p", "t", "k", "f", "\u03B8"]);
var SIBILANTS = /* @__PURE__ */ new Set(["s", "z", "\u0283", "\u0292", "t\u0283", "d\u0292"]);
var ALVEOLAR_STOPS = /* @__PURE__ */ new Set(["t", "d"]);
function getInflectedPronunciation(word, lexicon) {
  if (word.length > 3 && word.endsWith("s")) {
    if (word.endsWith("ies") && word.length > 4) {
      const stem2 = word.slice(0, -3) + "y";
      const base2 = lexicon.get(stem2);
      if (base2) {
        return {
          symbols: [...base2.symbols, "z"],
          stress: [...base2.stress, STRESS_NONE]
        };
      }
    }
    if (word.endsWith("es") && word.length > 3) {
      const stem2 = word.slice(0, -2);
      const base2 = lexicon.get(stem2);
      if (base2 && base2.symbols.length > 0) {
        const lastPhone = base2.symbols[base2.symbols.length - 1];
        if (SIBILANTS.has(lastPhone)) {
          return {
            symbols: [...base2.symbols, "\u1D7B", "z"],
            stress: [...base2.stress, STRESS_NONE, STRESS_NONE]
          };
        }
        return {
          symbols: [...base2.symbols, "z"],
          stress: [...base2.stress, STRESS_NONE]
        };
      }
      const stemE = word.slice(0, -1);
      const baseE = lexicon.get(stemE);
      if (baseE && baseE.symbols.length > 0) {
        const lastPhone = baseE.symbols[baseE.symbols.length - 1];
        if (SIBILANTS.has(lastPhone)) {
          return {
            symbols: [...baseE.symbols, "\u1D7B", "z"],
            stress: [...baseE.stress, STRESS_NONE, STRESS_NONE]
          };
        }
        return {
          symbols: [...baseE.symbols, "z"],
          stress: [...baseE.stress, STRESS_NONE]
        };
      }
    }
    const stem = word.slice(0, -1);
    const base = lexicon.get(stem);
    if (base && base.symbols.length > 0) {
      const lastPhone = base.symbols[base.symbols.length - 1];
      let sPhone = "z";
      if (VOICELESS_CONSONANTS.has(lastPhone)) {
        sPhone = "s";
      } else if (SIBILANTS.has(lastPhone)) {
        return {
          symbols: [...base.symbols, "\u1D7B", "z"],
          stress: [...base.stress, STRESS_NONE, STRESS_NONE]
        };
      }
      return {
        symbols: [...base.symbols, sPhone],
        stress: [...base.stress, STRESS_NONE]
      };
    }
  }
  if (word.length > 3 && word.endsWith("ed")) {
    let base = lexicon.get(word.slice(0, -2));
    if (!base) base = lexicon.get(word.slice(0, -1));
    if (base && base.symbols.length > 0) {
      const lastPhone = base.symbols[base.symbols.length - 1];
      if (ALVEOLAR_STOPS.has(lastPhone)) {
        return {
          symbols: [...base.symbols, "\u1D7B", "d"],
          stress: [...base.stress, STRESS_NONE, STRESS_NONE]
        };
      } else if (VOICELESS_CONSONANTS.has(lastPhone) || lastPhone === "s" || lastPhone === "\u0283" || lastPhone === "t\u0283") {
        return {
          symbols: [...base.symbols, "t"],
          stress: [...base.stress, STRESS_NONE]
        };
      } else {
        return {
          symbols: [...base.symbols, "d"],
          stress: [...base.stress, STRESS_NONE]
        };
      }
    }
  }
  if (word.length > 4 && word.endsWith("ing")) {
    let base = lexicon.get(word.slice(0, -3));
    if (!base) base = lexicon.get(word.slice(0, -3) + "e");
    if (base && base.symbols.length > 0) {
      return {
        symbols: [...base.symbols, "\u026A", "\u014B"],
        stress: [...base.stress, STRESS_NONE, STRESS_NONE]
      };
    }
  }
  if (word.length > 4 && word.endsWith("ly")) {
    let base = lexicon.get(word.slice(0, -2));
    if (!base) base = lexicon.get(word.slice(0, -2) + "e");
    if (base && base.symbols.length > 0) {
      return {
        symbols: [...base.symbols, "l", "i"],
        stress: [...base.stress, STRESS_NONE, STRESS_NONE]
      };
    }
  }
  return null;
}
function parseLexiconTsv(tsvContent) {
  const lexicon = /* @__PURE__ */ new Map();
  const lines = tsvContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 2) continue;
    const tab = line.indexOf("	");
    if (tab < 0) continue;
    const word = line.slice(0, tab);
    const ipa = line.slice(tab + 1).trim();
    const rawPhones = [];
    const stress = [];
    let inStress = 0;
    let j = 0;
    while (j < ipa.length) {
      const ch = ipa[j];
      if (ch === "\u02C8") {
        inStress = 1;
        j++;
        continue;
      }
      if (ch === "\u02CC") {
        inStress = 2;
        j++;
        continue;
      }
      if (ch === " ") {
        j++;
        continue;
      }
      let matched = false;
      for (const mp of MULTI_PHONEMES) {
        if (ipa.startsWith(mp, j)) {
          let sym = mp;
          let k = j + mp.length;
          while (k < ipa.length) {
            const next = ipa[k];
            const cp = next.codePointAt(0);
            if (cp === 809 || cp === 688 || cp === 690 || cp === 736 || cp === 720) {
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
var Phonemizer = class _Phonemizer {
  lexicon;
  vocab;
  unkId;
  /**
   * Universal constructor supporting both:
   *   new Phonemizer(vocab, lexiconTsvString)
   *   new Phonemizer(lexiconPathOrTsv, vocab)
   */
  constructor(arg1, arg2) {
    let vocab;
    let lexiconSource;
    if (typeof arg1 === "object" && arg1 !== null && typeof arg2 === "string") {
      vocab = arg1;
      lexiconSource = arg2;
    } else if (typeof arg1 === "string" && typeof arg2 === "object") {
      lexiconSource = arg1;
      vocab = arg2;
    } else {
      throw new Error("Phonemizer constructor requires (vocab, lexiconSource) or (lexiconPath, vocab)");
    }
    this.vocab = vocab;
    this.unkId = vocab["<unk>"] ?? 4;
    if (lexiconSource.includes("	") || lexiconSource.includes("\n")) {
      this.lexicon = parseLexiconTsv(lexiconSource);
    } else {
      try {
        const fs = typeof __require !== "undefined" ? __require("fs") : void 0;
        if (fs && fs.readFileSync) {
          const content = fs.readFileSync(lexiconSource, "utf8");
          this.lexicon = parseLexiconTsv(content);
        } else {
          throw new Error("File path loading only available in Node/Bun environment. Pass TSV content string in browser.");
        }
      } catch (err) {
        throw new Error(`Failed to load lexicon from "${lexiconSource}": ${err.message}`);
      }
    }
    if (!this.lexicon.has("tts")) {
      this.lexicon.set("tts", {
        symbols: ["t", "i\u02D0", "t", "i\u02D0", "\u025B", "s"],
        stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY]
      });
    }
    if (!this.lexicon.has("voca")) {
      this.lexicon.set("voca", {
        symbols: ["v", "o\u028A", "k", "\u0259"],
        stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_NONE, STRESS_NONE]
      });
    }
    this.lexicon.set("q1", {
      symbols: ["k", "j", "u\u02D0", "w", "\u028C", "n"],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY]
    });
    this.lexicon.set("q2", {
      symbols: ["k", "j", "u\u02D0", "t", "u\u02D0"],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY]
    });
    this.lexicon.set("q3", {
      symbols: ["k", "j", "u\u02D0", "\u03B8", "\u0279", "i\u02D0"],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY]
    });
    this.lexicon.set("q4", {
      symbols: ["k", "j", "u\u02D0", "f", "o\u02D0\u0279"],
      stress: [STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY, STRESS_PRIMARY]
    });
  }
  static fromTsv(lexiconTsv, vocab) {
    return new _Phonemizer(vocab, lexiconTsv);
  }
  toId(symbol) {
    return this.vocab[symbol] ?? this.unkId;
  }
  phonemize(text) {
    const symbols = [];
    const stresses = [];
    const unknownWords = [];
    const push = (sym, st) => {
      symbols.push(sym);
      stresses.push(st);
    };
    push("<bos>", STRESS_NONE);
    const normalizedText = normalizeTextForSpeech(text);
    const TOKEN_RE = /[A-Za-zÀ-ÿ0-9]+(?:['''][A-Za-zÀ-ÿ0-9]+)*|[.,;:!?""''—–…()[\]{}]/g;
    const tokens = [];
    for (const m of normalizedText.matchAll(TOKEN_RE)) {
      const token = m[0];
      if (token in CTRL || token in PUNCT_MAP) {
        tokens.push({ type: "punct", text: token });
      } else {
        tokens.push({ type: "word", text: token });
      }
    }
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "punct") {
        const mapped = PUNCT_MAP[token.text] ?? token.text;
        if (mapped in CTRL && mapped !== "<sp>") {
          push(mapped, STRESS_NONE);
        }
      } else {
        const rawWord = token.text.toLowerCase();
        const expandedStr = normalizeNumberWord(rawWord);
        const subWords = expandedStr.split(/\s+/).filter(Boolean);
        for (let wIdx = 0; wIdx < subWords.length; wIdx++) {
          const word = subWords[wIdx];
          const entry = this.lexicon.get(word) ?? getInflectedPronunciation(word, this.lexicon);
          let result;
          if (entry) {
            result = entry;
            if (!this.lexicon.has(word)) {
              this.lexicon.set(word, entry);
            }
          } else {
            unknownWords.push(word);
            result = ruleBasedPhonemize(word);
          }
          for (let j = 0; j < result.symbols.length; j++) {
            push(result.symbols[j], result.stress[j]);
          }
          if (wIdx < subWords.length - 1) {
            push("<sp>", STRESS_NONE);
          }
        }
        if (i + 1 < tokens.length && tokens[i + 1].type === "punct") {
          const nextToken = tokens[i + 1];
          const mapped = PUNCT_MAP[nextToken.text] ?? nextToken.text;
          if (mapped in CTRL && mapped !== "<sp>") {
            push(mapped, STRESS_NONE);
            if (mapped === "\u2026") {
              push("<sp>", STRESS_NONE);
            }
          }
          i++;
        }
        push("<sp>", STRESS_NONE);
      }
    }
    if (symbols[symbols.length - 1] === "<sp>") {
      symbols.pop();
      stresses.pop();
    }
    push("<eos>", STRESS_NONE);
    const phones = symbols.map((s) => this.toId(s));
    return { phones, stress: stresses, symbols, unknownWords };
  }
};

// src/wav.ts
function encodeWav(samples, opts = {}) {
  const sampleRate = opts.sampleRate ?? 24e3;
  const peak = opts.peak ?? 0.95;
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > max) max = v;
  }
  const gain = peak > 0 && max > 0 ? Math.min(1, peak / max) : 1;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset2, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset2 + i, str.charCodeAt(i));
    }
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    s = Math.max(-1, Math.min(1, s));
    view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}
var toPcm16 = encodeWav;
function toWavBlob(samples, opts = {}) {
  const wavBytes = encodeWav(samples, opts);
  return new Blob([wavBytes.buffer], { type: "audio/wav" });
}

// src/core.ts
var gPerformance = typeof performance !== "undefined" ? performance : { now: () => Date.now() };
var TinyVocaCore = class {
  sampleRate = 24e3;
  voices = ["F2", "M2"];
  session;
  phonemizer;
  constructor(session, phonemizer) {
    this.session = session;
    this.phonemizer = phonemizer;
  }
  async synthesize(options) {
    const { text, voice = "F2", speed = 1, pitchShift = 0, pitchRange = 1 } = options;
    const { phones, stress, unknownWords } = this.phonemizer.phonemize(text);
    const n = phones.length;
    const voiceId = voice === "F2" ? 0 : 1;
    const t0 = gPerformance.now();
    const feeds = {
      tokens: { data: BigInt64Array.from(phones.map((p) => BigInt(p))), dims: [1, n], type: "int64" },
      stress: { data: BigInt64Array.from(stress.map((s) => BigInt(s))), dims: [1, n], type: "int64" },
      voice: { data: BigInt64Array.from([BigInt(voiceId)]), dims: [1], type: "int64" },
      speed: { data: new Float32Array([speed]), dims: [1], type: "float32" },
      pitch_shift: { data: new Float32Array([pitchShift]), dims: [1], type: "float32" },
      pitch_range: { data: new Float32Array([pitchRange]), dims: [1], type: "float32" }
    };
    const outputs = await this.session.run(feeds);
    const inferenceMs = gPerformance.now() - t0;
    const audio = outputs.audio.data;
    const durationsData = outputs.durations.data;
    const durations = new Int32Array(durationsData.length);
    for (let i = 0; i < durationsData.length; i++) durations[i] = Number(durationsData[i]);
    const audioSeconds = audio.length / this.sampleRate;
    const rtf = audioSeconds > 0 ? inferenceMs / 1e3 / audioSeconds : 0;
    return {
      text,
      voice,
      audio,
      sampleRate: this.sampleRate,
      durations,
      inferenceMs,
      audioSeconds,
      rtf,
      unknownWords,
      toWav: (peak = 0.95) => encodeWav(audio, { sampleRate: this.sampleRate, peak }),
      toBlob: (peak = 0.95) => toWavBlob(audio, { sampleRate: this.sampleRate, peak })
    };
  }
  async warmup() {
    await this.synthesize({ text: "Warmup speech synthesis.", voice: "F2" });
  }
  dispose() {
    if (this.session && typeof this.session.release === "function") {
      this.session.release();
    }
  }
};

// src/web/index.ts
var FastTinyTTS = class _FastTinyTTS extends TinyVocaCore {
  ortSession;
  constructor(ortSession, phonemizer) {
    const session = {
      run: async (feeds) => {
        const ortFeeds = {};
        for (const [key, tensor] of Object.entries(feeds)) {
          ortFeeds[key] = tensor.data instanceof BigInt64Array ? new ort.Tensor("int64", tensor.data, [...tensor.dims]) : new ort.Tensor("float32", tensor.data, [...tensor.dims]);
        }
        const results = await ortSession.run(ortFeeds);
        const output = {};
        for (const [key, tensor] of Object.entries(results)) {
          output[key] = {
            data: tensor.data,
            dims: [...tensor.dims]
          };
        }
        return output;
      },
      release: () => {
        ortSession.release();
      }
    };
    super(session, phonemizer);
    this.ortSession = ortSession;
  }
  static async create(config = {}) {
    const loc = typeof window !== "undefined" ? window.location.href : typeof self !== "undefined" ? self.location.href : "http://localhost/";
    const rawModelPath = config.modelPath ?? "dist/models/tiny-voca/model.onnx";
    const modelUrl = new URL(rawModelPath, loc).href;
    const modelDir = modelUrl.substring(0, modelUrl.lastIndexOf("/") + 1);
    const configPath = config.configPath ? new URL(config.configPath, loc).href : modelDir + "config.json";
    const phonemizerPath = config.phonemizerPath ? new URL(config.phonemizerPath, loc).href : modelDir + "phonemizer/lexicon.tsv";
    const isStatic = loc.includes("github.io") || loc.startsWith("file:");
    const defaultWasm = isStatic ? "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/" : "dist/onnxruntime-web/";
    const rawWasmPath = config.wasmPath ?? defaultWasm;
    const wasmUrl = rawWasmPath.startsWith("http") ? rawWasmPath : new URL(rawWasmPath, loc).href;
    const localWasmPath = wasmUrl.endsWith("/") ? wasmUrl : wasmUrl + "/";
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.wasmPaths = localWasmPath;
      ort.env.wasm.numThreads = 1;
    }
    const modelPath = modelUrl;
    const [cfgResp, lexResp] = await Promise.all([
      fetch(configPath),
      fetch(phonemizerPath)
    ]);
    const cfg = await cfgResp.json();
    const lexiconTsv = await lexResp.text();
    const phonemizer = new Phonemizer(cfg.vocab, lexiconTsv);
    const sessionOptions = {
      executionProviders: config.executionProviders ?? ["wasm"],
      graphOptimizationLevel: "all"
    };
    const ortSession = await ort.InferenceSession.create(modelPath, sessionOptions);
    return new _FastTinyTTS(ortSession, phonemizer);
  }
  dispose() {
    this.ortSession.release();
  }
};
export {
  FastTinyTTS,
  Phonemizer,
  FastTinyTTS as TinyVoca,
  TinyVocaCore,
  FastTinyTTS as WebTinyVoca,
  encodeWav,
  toPcm16,
  toWavBlob
};
