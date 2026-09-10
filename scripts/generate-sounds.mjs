/**
 * Writes the rest-timer chime as a WAV.
 *
 * Generated rather than sourced so the tone can be tuned in code and the repo
 * carries no licensing questions. Two short notes a fifth apart, quiet and
 * quick — it has to cut through gym noise without sounding like an alarm.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'sounds');

const SAMPLE_RATE = 44_100;

/** @param {{ freq: number, start: number, duration: number, gain?: number }[]} notes */
function render(notes, totalSeconds) {
  const frames = Math.ceil(totalSeconds * SAMPLE_RATE);
  const samples = new Float32Array(frames);

  for (const note of notes) {
    const startFrame = Math.floor(note.start * SAMPLE_RATE);
    const noteFrames = Math.floor(note.duration * SAMPLE_RATE);
    const gain = note.gain ?? 0.5;

    for (let i = 0; i < noteFrames; i += 1) {
      const frame = startFrame + i;
      if (frame >= frames) break;

      const t = i / SAMPLE_RATE;
      // 4ms attack then exponential decay: a hard start would click.
      const attack = Math.min(1, t / 0.004);
      const decay = Math.exp(-t * 11);
      const envelope = attack * decay;

      // A touch of second harmonic keeps it from sounding like a test tone.
      const wave =
        Math.sin(2 * Math.PI * note.freq * t) * 0.82 +
        Math.sin(4 * Math.PI * note.freq * t) * 0.18;

      samples[frame] += wave * envelope * gain;
    }
  }

  return samples;
}

/** @param {Float32Array} samples */
function toWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(1, 22); // channels: mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32_767), 44 + i * 2);
  }
  return buffer;
}

await mkdir(outDir, { recursive: true });

// Rest over: rising perfect fifth (A5 -> E6). Reads as "go", not "problem".
const restOver = render(
  [
    { freq: 880, start: 0, duration: 0.28, gain: 0.42 },
    { freq: 1318.5, start: 0.13, duration: 0.42, gain: 0.46 },
  ],
  0.6,
);
await writeFile(join(outDir, 'rest-over.wav'), toWav(restOver));

// Countdown tick for the last three seconds. Deliberately dull and short.
const tick = render([{ freq: 660, start: 0, duration: 0.09, gain: 0.24 }], 0.12);
await writeFile(join(outDir, 'tick.wav'), toWav(tick));

console.log('rest-over.wav, tick.wav written to assets/sounds');
