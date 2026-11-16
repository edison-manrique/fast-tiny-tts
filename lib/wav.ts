/**
 * tiny-voca — Universal WAV encoder
 * Converts Float32Array PCM samples (24kHz) to standard 16-bit PCM WAV.
 * Safe for Browser (Float32Array / Blob) and Node/Bun (Uint8Array / Buffer).
 */

export interface WavEncodeOptions {
  sampleRate?: number;
  peak?: number; // target peak normalization (e.g. 0.95), or 0 to disable
}

export function encodeWav(samples: Float32Array, options: WavEncodeOptions = {}): Uint8Array {
  const sampleRate = options.sampleRate ?? 24000;
  const peak = options.peak ?? 0.95;

  // Calculate peak for normalization to avoid harsh clipping
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > max) max = v;
  }
  const gain = peak > 0 && max > 0 ? Math.min(1.0, peak / max) : 1.0;

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');

  // "fmt " sub-chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true);  // SampleRate (24000)
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, bitsPerSample, true);// BitsPerSample (16)

  // "data" sub-chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    s = Math.max(-1.0, Math.min(1.0, s));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

export function toWavBlob(samples: Float32Array, options: WavEncodeOptions = {}): Blob {
  const wavBytes = encodeWav(samples, options);
  return new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
}
