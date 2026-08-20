import type { DeckState } from "../types/deck";

function formatBars(value: number) {
  const bars = Math.floor(Math.max(0, value));
  const beats = Math.min(3, Math.round((value - bars) * 4));
  return `${bars.toString().padStart(2, "0")}.${beats}`;
}

export function BarsReadout({ deck, masterTrack }: { deck: DeckState; masterTrack: DeckState }) {
  return (
    <div className="cdj-bars-left" aria-label="Bars to next cue">
      <div className="cdj-bars-left__row cdj-bars-left__row--master">
        <strong>{masterTrack.id}</strong>
        <span>{formatBars(masterTrack.barsToNextCue)}<small>Bars</small></span>
      </div>
      <div className="cdj-bars-left__row cdj-bars-left__row--player">
        <i />
        <span>{formatBars(deck.barsToNextCue)}<small>Bars</small></span>
      </div>
    </div>
  );
}
