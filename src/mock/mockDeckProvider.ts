import type { DeckProvider } from "../providers/DeckProvider";
import type { DeckSnapshot, DeckState } from "../types/deck";
import { createMockWaveform, createOverview } from "./mockWaveforms";

const deckOneWaveform = createMockWaveform(15401, 320, [
  { end: 0.14, energy: 30, bass: 0.72 },
  { end: 0.31, energy: 71, bass: 1.02 },
  { end: 0.43, energy: 42, bass: 0.64 },
  { end: 0.72, energy: 82, bass: 1.08 },
  { end: 0.86, energy: 57, bass: 0.82 },
  { end: 1, energy: 88, bass: 1.12 },
]);

const deckTwoWaveform = createMockWaveform(15613, 320, [
  { end: 0.11, energy: 24, bass: 0.58 },
  { end: 0.27, energy: 54, bass: 0.87 },
  { end: 0.39, energy: 76, bass: 1.08 },
  { end: 0.55, energy: 38, bass: 0.7 },
  { end: 0.8, energy: 85, bass: 1.14 },
  { end: 1, energy: 65, bass: 0.94 },
]);

const mockDecks: Record<1 | 2, DeckState> = {
  1: {
    id: 1, artist: "Funk Assault", title: "Club Mock Track A",
    album: "Minimum One Post A Week", bpm: 154, tempo: 0,
    elapsed: "02:14.3", remaining: "-03:46.8", key: "8A",
    progress: 0.37, beatInBar: 3, beatPhase: 0.32, isPlaying: true,
    barsToNextCue: 2.75, phaseOffset: 0,
    waveform: deckOneWaveform, overview: createOverview(deckOneWaveform),
    cues: [
      { label: "A", position: 0.12, color: "aqua" },
      { label: "B", position: 0.37, color: "amber" },
      { label: "C", position: 0.68, color: "violet" },
    ],
  },
  2: {
    id: 2, artist: "GORDI", title: "Incoming Track B",
    album: "Warehouse Tools", bpm: 156, tempo: 1.3,
    elapsed: "00:42.1", remaining: "-04:18.2", key: "9A",
    progress: 0.14, beatInBar: 1, beatPhase: 0.78, isPlaying: true,
    barsToNextCue: 12.75, phaseOffset: 0.46,
    waveform: deckTwoWaveform, overview: createOverview(deckTwoWaveform),
    cues: [
      { label: "A", position: 0.08, color: "aqua" },
      { label: "B", position: 0.29, color: "amber" },
      { label: "C", position: 0.76, color: "violet" },
    ],
  },
};

const snapshot: DeckSnapshot = {
  decks: mockDecks,
  initialMasterDeck: 1,
  masterDeck: 1,
  source: "mock",
  connectionStatus: "mock",
  connectionMessage: "Deterministische lokale Mock-Daten",
};

class MockDeckProvider implements DeckProvider {
  readonly id = "mock";

  getSnapshot() { return snapshot; }

  subscribe() { return () => undefined; }
}

export const mockDeckProvider = new MockDeckProvider();
