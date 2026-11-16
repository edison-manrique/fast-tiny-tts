/**
 * Escritor de archivos WAV PCM-16 (mono).
 */

export interface WavOptions {
  sampleRate: number;
  peak?: number; // nivel de pico deseado (0-1), default 0.95
}

export function toPcm16(samples: Float32Array, opts: WavOptions): Uint8Array {
  const sampleRate = opts.sampleRate;
  const peak = opts.peak ?? 0.95;

  // normalizar al pico deseado (evitar clipping; el modelo puede pasar de 1.0)
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > max) max = v;
  }
  const gain = max > 0 ? Math.min(1, peak / max) : 1;

  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    let v = samples[i] * gain;
    v = Math.max(-1, Math.min(1, v));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }

  const byteRate = sampleRate * 2; // mono * 16 bits
  const dataSize = pcm.length * 2;
  const header = new ArrayBuffer(44);
  const dv = new DataView(header);

  const writeString = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  dv.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dv.setUint32(16, 16, true);        // Subchunk1Size
  dv.setUint16(20, 1, true);         // AudioFormat = PCM
  dv.setUint16(22, 1, true);         // NumChannels = 1
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, 2, true);         // BlockAlign
  dv.setUint16(34, 16, true);        // BitsPerSample
  writeString(36, 'data');
  dv.setUint32(40, dataSize, true);

  const out = new Uint8Array(44 + dataSize);
  out.set(new Uint8Array(header));
  out.set(new Uint8Array(pcm.buffer), 44);
  return out;
}
