import type { DeckState } from "../types/deck";

export function DeckReadout({ deck, isMaster }: { deck: DeckState; isMaster: boolean }) {
  const shownTime = isMaster ? deck.remaining : deck.elapsed;
  const decimalAt = shownTime.lastIndexOf(".");
  const timeMain = decimalAt === -1 ? shownTime : shownTime.slice(0, decimalAt);
  const timeFraction = decimalAt === -1 ? "" : shownTime.slice(decimalAt);

  return (
    <div className="cdj-readout">
      <div className="cdj-readout__left">
        <div className="cdj-player-box"><span>PLAYER</span><strong>{deck.id}</strong></div>
        <div className="cdj-quantize">QUANTIZE<br /><strong>1/2</strong></div>
        <div className="cdj-beat-jump">BEAT JUMP<br /><strong>64</strong></div>
      </div>

      <div className="cdj-track-number"><span>TRACK</span><strong>{deck.id.toString().padStart(2, "0")}</strong></div>
      <div className="cdj-cue-state"><strong>A.HOT CUE</strong><span>A.CUE</span></div>
      <div className="cdj-time">
        <span>{isMaster ? "REMAIN" : "TIME"}</span>
        <strong>{timeMain}<small>{timeFraction}</small></strong>
      </div>
      <div className="cdj-tempo">
        <span>TEMPO <i>±16</i></span>
        <strong>{deck.tempo > 0 ? "+" : ""}{deck.tempo.toFixed(2)}<small>%</small></strong>
      </div>
      <div className={`cdj-bpm${isMaster ? " cdj-bpm--master" : ""}`}>
        <span>BPM {isMaster && <i>MASTER</i>}</span>
        <strong>{deck.bpm.toFixed(1)}</strong>
        <em>MT</em>
        <small>KEY</small><b>{deck.key}</b>
      </div>
    </div>
  );
}
