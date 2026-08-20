import { useState } from "react";
import "./App.css";
import { Deck } from "./components/Deck";
import { mockDeckProvider } from "./mock/mockDeckProvider";
import type { DeckId } from "./types/deck";

function App() {
  const [{ decks, initialMasterDeck }] = useState(() => mockDeckProvider.getSnapshot());
  const [masterDeck, setMasterDeck] = useState<DeckId>(initialMasterDeck);
  const masterTrack = decks[masterDeck];

  return (
    <main className="app">
      <header className="app__topbar">
        <div>
          <div className="app__brand"><span>CLUB</span>SIM</div>
          <div className="app__subtitle">DUAL PLAYER · PRACTICE DISPLAY</div>
        </div>
        <div className="mock-controls">
          <span>MASTER PLAYER</span>
          <button className={masterDeck === 1 ? "active" : ""} onClick={() => setMasterDeck(1)}>1</button>
          <button className={masterDeck === 2 ? "active" : ""} onClick={() => setMasterDeck(2)}>2</button>
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
