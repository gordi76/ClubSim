import type { DeckSnapshot } from "../types/deck";

/** Boundary between a deck data source and the display layer. */
export interface DeckProvider {
  getSnapshot(): DeckSnapshot;
}
