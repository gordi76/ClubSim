export type DeckId = 1 | 2;

export type DisplayMode = "phase" | "stacked";

export type WaveformSample = { low: number; mid: number; high: number };

export type CuePoint = {
  label: string;
  position: number;
  color: "amber" | "aqua" | "violet";
};

export type DeckState = {
  id: DeckId;
  artist: string;
  title: string;
  album: string;
  bpm: number;
  tempo: number;
  elapsed: string;
  remaining: string;
  key: string;
  progress: number;
  beatInBar: 1 | 2 | 3 | 4;
  phaseOffset: number;
  waveform: WaveformSample[];
  overview: WaveformSample[];
  cues: CuePoint[];
};

export type DeckSnapshot = {
  decks: Record<DeckId, DeckState>;
  initialMasterDeck: DeckId;
};
