import type { DeckState } from "../types/deck";
import { BarsReadout } from "./BarsReadout";
import { Waveform } from "./Waveform";

export function StackedWaveform({ deck, masterTrack }: { deck: DeckState; masterTrack: DeckState }) {
  return (
    <div className="cdj-stacked">
      <BarsReadout deck={deck} masterTrack={masterTrack} />
      <div className="cdj-stacked__waves">
        <Waveform samples={masterTrack.waveform} compact palette="master" playhead={50} />
        <Waveform samples={deck.waveform} palette="player" playhead={50} />
      </div>
    </div>
  );
}
