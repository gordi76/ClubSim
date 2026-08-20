import { useEffect, useState } from "react";
import type { DeckId, DeckState, DisplayMode } from "../types/deck";
import { OverviewWaveform } from "./OverviewWaveform";
import { PhaseMeter } from "./PhaseMeter";
import { StackedWaveform } from "./StackedWaveform";
import { Waveform } from "./Waveform";

export function Deck({ deck, masterDeck, masterTrack }: { deck: DeckState; masterDeck: DeckId; masterTrack: DeckState }) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("phase");
  const isMaster = deck.id === masterDeck;
  const shownTime = isMaster ? deck.remaining : deck.elapsed;
  const decimalAt = shownTime.lastIndexOf(".");
  const timeMain = decimalAt === -1 ? shownTime : shownTime.slice(0, decimalAt);
  const timeFraction = decimalAt === -1 ? "" : shownTime.slice(decimalAt);

  useEffect(() => {
    if (isMaster) setDisplayMode("phase");
  }, [isMaster]);

  const toggleDisplay = () => {
    if (!isMaster) setDisplayMode((mode) => mode === "phase" ? "stacked" : "phase");
  };

  return (
    <section className={`cdj-screen${isMaster ? " cdj-screen--master" : ""}`}>
      <header className="cdj-header">
        <div className="cdj-source">
          <span className="cdj-source__player">{deck.id}</span>
          <span className="cdj-source__usb">♙</span>
          <strong>USB</strong>
        </div>
        <div className={`cdj-art cdj-art--${deck.id}`}><span>{deck.id === 1 ? "FA" : "GO"}</span></div>
        <div className="cdj-track-info">
          <div className="cdj-track-info__title">♪ {deck.title}</div>
          <div className="cdj-track-info__meta">{deck.remaining.replace("-", "")} &nbsp; {deck.bpm.toFixed(1)} &nbsp; {deck.key} <span>ⓘ</span></div>
        </div>
        <div className="cdj-softkeys">
          <div>BEAT<br />LOOP</div>
          <div>KEY<br />SHIFT</div>
          <div className={displayMode === "stacked" ? "active" : ""}>BEAT<br />JUMP</div>
        </div>
      </header>

      <button
        className="cdj-visualizer"
        onClick={toggleDisplay}
        disabled={isMaster}
        title={isMaster ? "Master player phase display" : "Click to switch phase and stacked waveform"}
      >
        {displayMode === "stacked" && !isMaster ? (
          <StackedWaveform deck={deck} masterTrack={masterTrack} />
        ) : (
          <>
            <PhaseMeter offsetBeats={isMaster ? 0 : deck.phaseOffset} masterId={masterTrack.id} />
            <div className="cdj-player-wave">
              <Waveform samples={deck.waveform} />
            </div>
          </>
        )}
        <span className="cdj-grid-label">ZOOM − GRID</span>
      </button>

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

      <OverviewWaveform samples={deck.overview} progress={deck.progress} cues={deck.cues} />
    </section>
  );
}
