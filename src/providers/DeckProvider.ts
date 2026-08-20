import type { DeckSnapshot } from "../types/deck";

export type DeckSnapshotListener = () => void;

/**
 * Read-only boundary between a deck data source and the display layer.
 *
 * A later live data source can publish updates through `subscribe` without
 * coupling React components to transport or vendor-specific code.
 */
export interface DeckProvider {
  readonly id: string;
  getSnapshot(): DeckSnapshot;
  subscribe(listener: DeckSnapshotListener): () => void;
}
