import type { DeckState } from "../types/deck";
import { BarsReadout } from "./BarsReadout";

function PhaseLane({
  color,
  label,
  beatInBar,
  beatPhase,
  isPlaying,
}: {
  color: "orange" | "blue";
  label: string;
  beatInBar: DeckState["beatInBar"];
  beatPhase: number;
  isPlaying: boolean;
}) {
  const barPhase = beatInBar - 1 + beatPhase;

  return (
    <div className={`cdj-phase__lane cdj-phase__lane--${color}${isPlaying ? "" : " cdj-phase__lane--paused"}`}>
      <span className="cdj-phase__lane-label">{label}</span>
      <div className="cdj-phase__line" />
      <div className="cdj-phase__markers" style={{ transform: `translateX(${-barPhase * 4.762}%)` }}>
        {Array.from({ length: 21 }, (_, index) => (
          <span
            className={index % 4 === 0 ? "downbeat" : ""}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export function PhaseMeter({
  deck,
  masterTrack,
  offsetBeats,
}: {
  deck: DeckState;
  masterTrack: DeckState;
  offsetBeats: number;
}) {
  return (
    <div className="cdj-phase" aria-label={`Player ${deck.id} phase offset ${offsetBeats.toFixed(2)} beats`}>
      <BarsReadout deck={deck} masterTrack={masterTrack} />
      <div className="cdj-phase__lanes">
        <PhaseLane
          color="orange"
          label={`M${masterTrack.id}`}
          beatInBar={masterTrack.beatInBar}
          beatPhase={masterTrack.beatPhase}
          isPlaying={masterTrack.isPlaying}
        />
        <PhaseLane
          color="blue"
          label={`P${deck.id}`}
          beatInBar={deck.beatInBar}
          beatPhase={deck.beatPhase}
          isPlaying={deck.isPlaying}
        />
        <div className="cdj-phase__playhead" />
      </div>
    </div>
  );
}
