import type { DeckState, DisplayMode } from "../types/deck";

function UsbIcon() {
  return (
    <svg className="cdj-source__usb" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v13m0-13-3 3m3-3 3 3M8 9H5v6.5A2.5 2.5 0 0 0 7.5 18H12m4-8h3v5.5A2.5 2.5 0 0 1 16.5 18H12m0-3v6m-2 0h4" />
    </svg>
  );
}

export function DeckHeader({ deck, displayMode }: { deck: DeckState; displayMode: DisplayMode }) {
  return (
    <header className="cdj-header">
      <div className="cdj-source">
        <span className="cdj-source__player">{deck.id}</span>
        <UsbIcon />
        <strong>USB</strong>
      </div>
      <div className={`cdj-art cdj-art--${deck.id}`} aria-hidden="true">
        <span>{deck.id === 1 ? "FA" : "GO"}</span>
      </div>
      <div className="cdj-track-info">
        <div className="cdj-track-info__title">♪ {deck.title}</div>
        <div className="cdj-track-info__meta">
          <span>{deck.artist}</span>
          <span>{deck.remaining.replace("-", "")}</span>
          <span>{deck.bpm.toFixed(1)}</span>
          <span>{deck.key}</span>
          <span aria-hidden="true">ⓘ</span>
        </div>
      </div>
      <div className="cdj-softkeys" aria-label={`Display mode ${displayMode}`}>
        <div>BEAT<br />LOOP</div>
        <div>KEY<br />SHIFT</div>
        <div>BEAT<br />JUMP</div>
      </div>
    </header>
  );
}
