import { useState } from "react";
import "./App.css";
import { Deck } from "./components/Deck";
import { mockDeckProvider } from "./mock/mockDeckProvider";
import { liveRekordboxProvider } from "./providers/LiveRekordboxProvider";
import { useDeckSnapshot } from "./providers/useDeckSnapshot";
import type { DeckId, DeckSource } from "./types/deck";

function App() {
  const [source, setSource] = useState<DeckSource>("mock");
  const provider = source === "rekordbox" ? liveRekordboxProvider : mockDeckProvider;
  const snapshot = useDeckSnapshot(provider);
  const { decks, initialMasterDeck, connectionStatus, connectionMessage } = snapshot;
  const [mockMasterDeck, setMockMasterDeck] = useState<DeckId>(initialMasterDeck);
  const masterDeck = source === "rekordbox" ? snapshot.masterDeck : mockMasterDeck;
  const masterTrack = decks[masterDeck];

  return (
    <main className="app">
      <header className="app__topbar">
        <div>
          <div className="app__brand"><span>CLUB</span>SIM</div>
          <div className="app__subtitle">DUAL PLAYER · PRACTICE DISPLAY</div>
        </div>
        <div className="mock-controls">
          <div className="source-toggle" aria-label="Data source">
            <button className={source === "mock" ? "active" : ""} onClick={() => setSource("mock")}>MOCK</button>
            <button className={source === "rekordbox" ? "active live" : ""} onClick={() => setSource("rekordbox")}>LIVE</button>
          </div>
          <span
            className={`source-status source-status--${connectionStatus}`}
            title={connectionMessage}
          >
            {connectionStatus === "live" ? "REKORDBOX LIVE" : connectionStatus.toUpperCase()}
          </span>
          <span>MASTER PLAYER</span>
          <button aria-pressed={masterDeck === 1} className={masterDeck === 1 ? "active" : ""} disabled={source === "rekordbox"} onClick={() => setMockMasterDeck(1)}>1</button>
          <button aria-pressed={masterDeck === 2} className={masterDeck === 2 ? "active" : ""} disabled={source === "rekordbox"} onClick={() => setMockMasterDeck(2)}>2</button>
        </div>
      </header>

      <div className="decks">
        <Deck deck={decks[1]} masterDeck={masterDeck} masterTrack={masterTrack} />
        <Deck deck={decks[2]} masterDeck={masterDeck} masterTrack={masterTrack} />
      </div>
    </main>
  );
}

export default App;
