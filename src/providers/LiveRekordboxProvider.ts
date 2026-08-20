import type { DeckProvider, DeckSnapshotListener } from "./DeckProvider";
import type { DeckId, DeckSnapshot, DeckState, WaveformSample } from "../types/deck";

const bridgeUrl = import.meta.env.VITE_REKORDBOX_BRIDGE_URL
  ?? "http://127.0.0.1:4470/events";

const blankWaveform = (length: number): WaveformSample[] =>
  Array.from({ length }, () => ({ low: 2, mid: 2, high: 2 }));

function createBlankDeck(id: DeckId): DeckState {
  return {
    id,
    artist: "",
    title: "WAITING FOR TRACK",
    album: "",
    bpm: 0,
    tempo: 0,
    elapsed: "00:00.0",
    remaining: "-00:00.0",
    key: "--",
    progress: 0,
    beatInBar: 1,
    beatPhase: 0,
    isPlaying: false,
    barsToNextCue: 0,
    phaseOffset: 0,
    waveform: blankWaveform(64),
    overview: blankWaveform(48),
    cues: [],
  };
}

const initialSnapshot: DeckSnapshot = {
  decks: { 1: createBlankDeck(1), 2: createBlankDeck(2) },
  initialMasterDeck: 1,
  masterDeck: 1,
  source: "rekordbox",
  connectionStatus: "connecting",
  connectionMessage: "Verbinde mit lokalem Rekordbox-Bridge-Dienst",
};

function isDeckSnapshot(value: unknown): value is DeckSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DeckSnapshot>;
  return candidate.source === "rekordbox"
    && (candidate.masterDeck === 1 || candidate.masterDeck === 2)
    && Boolean(candidate.decks?.[1])
    && Boolean(candidate.decks?.[2]);
}

class LiveRekordboxProvider implements DeckProvider {
  readonly id = "rekordbox";

  private snapshot = initialSnapshot;
  private readonly listeners = new Set<DeckSnapshotListener>();
  private events: EventSource | null = null;

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: DeckSnapshotListener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.connect();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.disconnect();
    };
  }

  private publish(snapshot: DeckSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  private connect() {
    if (this.events) return;

    this.snapshot = {
      ...this.snapshot,
      connectionStatus: "connecting",
      connectionMessage: "Verbinde mit lokalem Rekordbox-Bridge-Dienst",
    };

    const events = new EventSource(bridgeUrl);
    this.events = events;

    events.onmessage = (event) => {
      try {
        const snapshot: unknown = JSON.parse(event.data);
        if (isDeckSnapshot(snapshot)) this.publish(snapshot);
      } catch {
        this.publish({
          ...this.snapshot,
          connectionStatus: "error",
          connectionMessage: "Ungültige Daten vom Rekordbox-Bridge-Dienst",
        });
      }
    };

    events.onerror = () => {
      this.publish({
        ...this.snapshot,
        connectionStatus: "error",
        connectionMessage: "Bridge nicht erreichbar · npm run rekordbox:bridge",
      });
    };
  }

  private disconnect() {
    this.events?.close();
    this.events = null;
  }
}

export const liveRekordboxProvider = new LiveRekordboxProvider();
