import type { WaveformSample } from "../types/deck";

type Section = { end: number; energy: number; bass: number };

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number) => Math.max(5, Math.min(100, value));

export function createMockWaveform(seed: number, length: number, sections: Section[]) {
  const random = seededRandom(seed);

  return Array.from({ length }, (_, index): WaveformSample => {
    const position = index / Math.max(length - 1, 1);
    const section =
      sections.find(({ end }) => position <= end) ?? sections[sections.length - 1];
    const kick = index % 8 === 0 ? 22 : index % 4 === 0 ? 10 : 0;
    const phrase = Math.sin(index * 0.17) * 9 + Math.sin(index * 0.047) * 7;
    const transient = random() > 0.86 ? random() * 28 : 0;
    const energy = section.energy + phrase + transient;

    return {
      low: clamp(energy * section.bass + kick + random() * 16),
      mid: clamp(energy * 0.78 + random() * 24),
      high: clamp(energy * 0.55 + random() * 30),
    };
  });
}

export function createOverview(waveform: WaveformSample[], targetLength = 116) {
  const chunkSize = waveform.length / targetLength;
  return Array.from({ length: targetLength }, (_, index): WaveformSample => {
    const start = Math.floor(index * chunkSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * chunkSize));
    const chunk = waveform.slice(start, end);
    return {
      low: Math.max(...chunk.map((sample) => sample.low)),
      mid: Math.max(...chunk.map((sample) => sample.mid)),
      high: Math.max(...chunk.map((sample) => sample.high)),
    };
  });
}
