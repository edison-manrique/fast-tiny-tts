# fast-tiny-tts

**Ultra-compact English TTS (Text-to-Speech) running locally via Bun or 100% in-browser via ONNX Runtime Web.**

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

```bash
bun add fast-tiny-tts
# or
npm install fast-tiny-tts
```

```javascript
import { TinyVoca } from 'fast-tiny-tts/node';

const tts = await TinyVoca.create({
  modelPath: './dist/models/tiny-voca/model.onnx',
  phonemizerPath: './dist/models/tiny-voca/phonemizer/lexicon.tsv',
  configPath: './dist/models/tiny-voca/config.json',
});

const result = await tts.synthesize({
  text: 'Hello from Node!',
  voice: 'M2',
  speed: 1.2,
});

// Save clean normalized 24 kHz WAV to file
import { writeFileSync } from 'fs';
writeFileSync('output.wav', result.toWav());
```

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
├── tsconfig.web.json         # Web TypeScript config (types only)
├── public/
│   ├── index.html            # Web app (fullscreen, modern UI)
│   └── dist/
│       ├── web/tiny-voca.js  # 15 KB ES bundle (esbuild)
│       ├── onnxruntime-web/  # Local ONNX Runtime (731 KB + 11 MB WASM)
│       └── models/tiny-voca/ # model.onnx + config.json + lexicon.tsv
├── lib/
│   ├── index.ts              # Universal entry point
│   ├── types.ts              # Shared TypeScript types
│   ├── phonemizer.ts         # IPA lexicon (124k words) + rules
│   ├── core.ts               # Core TTS logic (platform-agnostic)
│   ├── node/index.ts         # Node/Bun entry (onnxruntime-node)
│   └── web/index.ts          # Browser entry (onnxruntime-web)
├── dist/                     # Build output
│   ├── node/                 # Node/Bun build
│   ├── web/                  # Web build + types
│   └── models/               # Model assets
├── src/
│   └── server.ts             # Bun HTTP server + API
└── src/tts.ts                # Legacy CLI entry
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