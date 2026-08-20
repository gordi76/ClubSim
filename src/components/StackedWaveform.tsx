import type { DeckState } from "../types/deck";
import { Waveform } from "./Waveform";

export function StackedWaveform({ deck, masterTrack }: { deck: DeckState; masterTrack: DeckState }) {
  return (
    <div className="cdj-stacked">
      <div className="cdj-bars-left">
        <div className="cdj-bars-left__row cdj-bars-left__row--master">
          <strong>{masterTrack.id}</strong><span>02.3<small>Bars</small></span>
        </div>
        <div className="cdj-bars-left__row cdj-bars-left__row--player">
          <i /><span>12.3<small>Bars</small></span>
        </div>
      </div>
      <div className="cdj-stacked__waves">
        <Waveform samples={masterTrack.waveform} compact palette="master" />
        <Waveform samples={deck.waveform} palette="player" />
      </div>
    </div>
  );
}
