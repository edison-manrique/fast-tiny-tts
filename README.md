# fast-tiny-tts

**Ultra-compact English TTS (Text-to-Speech) running locally via Bun or 100% in-browser via ONNX Runtime Web.**

> **Live Web Playground:** [https://edison-manrique.github.io/fast-tiny-tts/](https://edison-manrique.github.io/fast-tiny-tts/)  
> **Repository:** [https://github.com/edison-manrique/fast-tiny-tts](https://github.com/edison-manrique/fast-tiny-tts)  
> **Model:** [tiny-voca](https://huggingface.co/n4ze3m/tiny-voca) by [Muhammed Nazeem](https://huggingface.co/n4ze3m)  
> **Port & Library:** Edison Manrique Chocce  
> **License:** Apache-2.0

---

## ✨ Features

- **Dual-Engine Architecture**: Seamlessly switch between **⚡ Bun Server (Ultra-fast Local API)** and **🌐 Web Client (100% In-Browser ONNX Web)**.
- **Ultra-compact Model**: ~4.5M parameters, 17.6 MB ONNX model.
- **Two Voices**: `F2` (female, natural) and `M2` (male, resonant) at 24 kHz mono.
- **Blazing Real-Time Performance**: RTF ~0.015–0.025 (40×–60× faster than real-time).
- **Acoustic Modulation**: Speed (0.5–2.0×), Pitch Shift (−1.0 to +1.0 semitones), Pitch Range (0.0–2.0 expressiveness).
- **Glitch-Free Audio Engine**: Direct Web Audio PCM streaming, peak normalization (zero digital clipping), and standard 16-bit PCM RIFF WAV export.
- **Modern Interactive Studio UI**: Real-time canvas waveform visualizer, seek scrubber, live audio metrics, preset chips, and keyboard shortcuts (`Ctrl+Enter`, `Space`, `Esc`).
- **Complete Offline Support**: Service Worker caching for instant offline loads.

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.0 (or Node.js ≥ 18)

### Install & Run

```bash
# Clone and enter project
cd fast-tiny-tts

# Install dependencies (uses workspace root node_modules)
bun install

# Build library (Node + Web bundle)
bun run build

# Start development server
bun run dev
# → Opens http://localhost:3000
```

### Production Build

```bash
bun run build
# Outputs:
#   dist/node/     → Node/Bun entry point + types
#   dist/web/      → Web bundle (15 KB) + types
#   dist/models/   → ONNX model + lexicon
```

---

## 📦 Library Usage

### Browser (ESM)

```html
<script type="importmap">
{
  "imports": {
    "onnxruntime-web": "/dist/onnxruntime-web/ort.all.min.mjs"
  }
</script>
<script type="module">
import { TinyVoca } from '/dist/web/tiny-voca.js';

const tts = await TinyVoca.create({
  modelPath: '/dist/models/tiny-voca/model.onnx',
  phonemizerPath: '/dist/models/tiny-voca/phonemizer/lexicon.tsv',
  configPath: '/dist/models/tiny-voca/config.json',
});

const result = await tts.synthesize({
  text: 'Hello! This is fast-tiny-tts.',
  voice: 'F2',
  speed: 1.0,
  pitchShift: 0,
  pitchRange: 1.0,
});

// result.audio → Float32Array (24 kHz mono)
// result.sampleRate → 24000
// result.durations → Int32Array (frames per token)
// result.rtf → Real-time factor
```

### Node / Bun

You can clone and link or import directly from the compiled repository:

```bash
git clone https://github.com/edison-manrique/fast-tiny-tts.git
cd fast-tiny-tts
bun install
bun run build
```

```javascript
import { TinyVoca } from './dist/node/index.js'; // or from 'fast-tiny-tts/node' if linked locally
import { writeFileSync } from 'fs';

const tts = await TinyVoca.create({
  modelPath: './models/tiny-voca/onnx/model.onnx',
  phonemizerPath: './models/tiny-voca/phonemizer/lexicon.tsv',
  configPath: './models/tiny-voca/config.json',
});

const result = await tts.synthesize({
  text: 'The total budget is US$ 320,000 for 175,000 units using our fast TTS engine.',
  voice: 'M2',
  speed: 1.0,
});

// Save clean normalized 24 kHz WAV to file
writeFileSync('output.wav', result.toWav());
```

---

## 🗣️ Smart Speech Normalization

`fast-tiny-tts` includes built-in speech text normalization without external Python or heavy NLP dependencies:

- **Comma Numbers**: `175,000` → *"one hundred seventy-five thousand"*
- **US Dollars & Currencies**:
  - `US$ 320,000` / `US$320000` → *"three hundred twenty thousand U S dollars"*
  - `$320,000` → *"three hundred twenty thousand dollars"*
  - `$1,250.50` → *"one thousand two hundred fifty dollars and fifty cents"*
  - `€500` / `£250` → *"five hundred euros"* / *"two hundred fifty pounds"*
- **Acronyms**: `TTS` → *"T T S"*, `AI` → *"A I"*, `API` → *"A P I"*, `GPU`, `CPU`, `LLM`, `WASM`, `HTML`, etc.
- **Abbreviations & Units**: `etc.` → *"etcetera"*, `24 kHz` → *"twenty-four kilohertz"*, `50 ms` → *"fifty milliseconds"*

---

## 🎛️ API Reference

### `TinyVoca.create(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modelPath` | `string` | `'model.onnx'` | Path/URL to ONNX model |
| `phonemizerPath` | `string` | `'lexicon.tsv'` | Path/URL to lexicon TSV |
| `configPath` | `string` | `'config.json'` | Path/URL to model config |
| `wasmPath` | `string` | `'dist/onnxruntime-web/'` | WASM files directory |
| `executionProviders` | `string[]` | `['wasm']` | ONNX execution providers |

### `tts.synthesize(options)`

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `text` | `string` | **required** | — | English text to synthesize |
| `voice` | `'F2' \| 'M2'` | `'F2'` | — | Voice selection |
| `speed` | `number` | `1.0` | `0.5–1.5` | Speech rate multiplier |
| `pitchShift` | `number` | `0` | `-1 to +1` | Pitch shift in semitones |
| `pitchRange` | `number` | `1.0` | `0–2` | Pitch variation range |

### Returns: `SynthesisResult`

| Property | Type | Description |
|----------|------|-------------|
| `audio` | `Float32Array` | 24 kHz mono audio samples |
| `sampleRate` | `number` | Always `24000` |
| `durations` | `Int32Array` | Frame count per token (10.7 ms/frame) |
| `inferenceMs` | `number` | Model inference time |
| `audioSeconds` | `number` | Generated audio duration |
| `rtf` | `number` | Real-time factor (inference/audio) |
| `unknownWords` | `string[]` | Words not in lexicon |

---

## 🗂️ Project Structure

```
fast-tiny-tts/
├── package.json              # Workspace config + scripts
├── tsconfig.node.json        # Node/Bun TypeScript config
├── tsconfig.web.json         # Web TypeScript config
├── public/
│   ├── index.html            # Web Studio app (100vh modern UI)
│   ├── favicon.svg           # Studio favicon
│   └── dist/
│       ├── web/tiny-voca.js  # Client ES bundle
│       ├── onnxruntime-web/  # Local ONNX Runtime Web WASM
│       └── models/tiny-voca/ # model.onnx + lexicon.tsv
├── src/
│   ├── index.ts              # Universal entry point
│   ├── types.ts              # Shared TypeScript definitions
│   ├── phonemizer.ts         # IPA lexicon (124k words) + speech normalizer
│   ├── core.ts               # Core TTS inference logic
│   ├── wav.ts                # 24 kHz WAV encoder & PCM utilities
│   ├── server.ts             # Bun HTTP server & API
│   ├── node/index.ts         # Node/Bun entry (onnxruntime-node)
│   └── web/index.ts          # Browser entry (onnxruntime-web)
├── dist/                     # Compiled build outputs
│   ├── node/                 # Node/Bun build
│   └── web/                  # Web bundle + types
└── models/                   # Local tiny-voca model weights
```

---

## 🌐 Web App

Run `bun run dev` and open **http://localhost:3000**

### Features
- **Fullscreen modern UI** (Geist + JetBrains Mono, dark/light auto)
- **Real-time waveform visualizer** (canvas + Web Audio API)
- **All prosody controls**: Voice, Speed, Pitch Shift, Pitch Range
- **WAV download** with one click
- **Live metrics**: RTF, inference time, audio duration
- **Example phrases** for quick testing
- **Responsive** (mobile-friendly)

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter` → Generate audio

---

## 🔧 Development

```bash
# Type checking
bunx tsc --noEmit

# Run tests
bun run test

# Benchmark
bun run bench

# Start server only
bun run src/server.ts
```

---

## 📄 License

**Model**: Apache-2.0 (Muhammed Nazeem, [n4ze3m/tiny-voca](https://huggingface.co/n4ze3m/tiny-voca))  
**Library & Port**: Apache-2.0 (Edison Manrique Chocce)

---

## 🙏 Acknowledgments

- **tiny-voca** model by [Muhammed Nazeem](https://huggingface.co/n4ze3m)
- **ONNX Runtime Web** by Microsoft
- **esbuild** for blazing-fast bundling
- **Bun** for the ultra-fast runtime

---

*Built with ❤️ for edge AI and offline-first applications.*