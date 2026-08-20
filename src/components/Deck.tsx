import { useEffect, useState } from "react";
import type { DeckId, DeckState, DisplayMode } from "../types/deck";
import { DeckHeader } from "./DeckHeader";
import { DeckReadout } from "./DeckReadout";
import { OverviewWaveform } from "./OverviewWaveform";
import { PhaseMeter } from "./PhaseMeter";
import { StackedWaveform } from "./StackedWaveform";
import { Waveform } from "./Waveform";

export function Deck({ deck, masterDeck, masterTrack }: { deck: DeckState; masterDeck: DeckId; masterTrack: DeckState }) {
  const isMaster = deck.id === masterDeck;
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => isMaster ? "phase" : "stacked");

  useEffect(() => {
    setDisplayMode(isMaster ? "phase" : "stacked");
  }, [isMaster]);

  const toggleDisplay = () => {
    if (!isMaster) setDisplayMode((mode) => mode === "phase" ? "stacked" : "phase");
  };

  return (
    <section className={`cdj-screen${isMaster ? " cdj-screen--master" : ""}`}>
      <DeckHeader deck={deck} displayMode={displayMode} />

      <button
        className="cdj-visualizer"
        onClick={toggleDisplay}
        disabled={isMaster}
        aria-label={isMaster ? `Player ${deck.id}, master phase display` : `Player ${deck.id}, switch phase and stacked waveform`}
        title={isMaster ? "Master player phase display" : "Click to switch phase and stacked waveform"}
      >
        {displayMode === "stacked" && !isMaster ? (
          <StackedWaveform deck={deck} masterTrack={masterTrack} />
        ) : (
          <>
            <PhaseMeter deck={deck} masterTrack={masterTrack} offsetBeats={isMaster ? 0 : deck.phaseOffset} />
            <div className="cdj-player-wave">
              <Waveform samples={deck.waveform} playhead={50} />
            </div>
          </>
        )}
        <span className="cdj-view-label">{displayMode === "stacked" && !isMaster ? "STACKED" : "PHASE"}</span>
        <span className="cdj-grid-label">ZOOM − GRID</span>
      </button>

      <DeckReadout deck={deck} isMaster={isMaster} />

      <OverviewWaveform samples={deck.overview} progress={deck.progress} cues={deck.cues} />
    </section>
  );
}
