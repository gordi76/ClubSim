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

const clamp = (value: number) => Math.max(2, Math.min(100, value));

export function createMockWaveform(seed: number, length: number, sections: Section[]) {
  const random = seededRandom(seed);

  return Array.from({ length }, (_, index): WaveformSample => {
    const position = index / Math.max(length - 1, 1);
    const section =
      sections.find(({ end }) => position <= end) ?? sections[sections.length - 1];
    const samplesPerBeat = 8;
    const beat = Math.floor(index / samplesPerBeat);
    const beatPhase = index % samplesPerBeat;
    const kickEnvelope = Math.exp(-beatPhase * 0.72);
    const offbeatEnvelope = Math.exp(-Math.abs(beatPhase - 4) * 0.9);
    const clapEnvelope = beat % 4 === 1 || beat % 4 === 3
      ? Math.exp(-Math.abs(beatPhase - 1) * 0.8)
      : 0;
    const phrase = Math.sin(position * Math.PI * 18) * 5 + Math.sin(index * 0.071) * 4;
    const transient = random() > 0.91 ? 12 + random() * 22 : 0;
    const energy = section.energy + phrase;

    return {
      low: clamp(energy * section.bass * 0.68 + kickEnvelope * 46 + random() * 9),
      mid: clamp(energy * 0.62 + clapEnvelope * 30 + transient * 0.55 + random() * 13),
      high: clamp(energy * 0.42 + offbeatEnvelope * 34 + transient + random() * 19),
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
