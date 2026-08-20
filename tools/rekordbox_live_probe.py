"""Combine rkbx_link OSC timing with read-only Rekordbox beatgrid data."""

from __future__ import annotations

import argparse
import bisect
import socket
import struct
import time
from dataclasses import dataclass
from typing import Any

from pyrekordbox import Rekordbox6Database

from osc_probe import decode_message


@dataclass
class BeatLocation:
    beat: float
    phase: float
    grid_index: int


@dataclass
class BeatGrid:
    times: list[float]
    beats: list[int]

    def locate(self, position: float) -> BeatLocation | None:
        index = bisect.bisect_right(self.times, position) - 1
        if index < 0 or index >= len(self.times):
            return None
        if index + 1 < len(self.times):
            duration = self.times[index + 1] - self.times[index]
        elif index > 0:
            duration = self.times[index] - self.times[index - 1]
        else:
            return None
        phase = max(0.0, min(0.999999, (position - self.times[index]) / duration))
        return BeatLocation(self.beats[index] + phase, phase, index)


@dataclass
class DeckState:
    title: str = ""
    artist: str = ""
    position: float | None = None
    grid: BeatGrid | None = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=4460, type=int)
    parser.add_argument("--seconds", default=0.0, type=float)
    parser.add_argument("--display-interval", default=1.0, type=float)
    parser.add_argument("--deck-1", nargs=2, metavar=("TITLE", "ARTIST"))
    parser.add_argument("--deck-2", nargs=2, metavar=("TITLE", "ARTIST"))
    return parser.parse_args()


def load_grid(db: Rekordbox6Database, deck: int, state: DeckState) -> None:
    state.grid = None
    if not state.title or not state.artist:
        return

    matches = db.get_content(Title=state.title).all()
    content = next(
        (
            item
            for item in matches
            if getattr(getattr(item, "Artist", None), "Name", "").casefold()
            == state.artist.casefold()
        ),
        None,
    )
    if content is None:
        print(f"Deck {deck + 1}: no library match for {state.artist} - {state.title}")
        return

    dat = db.read_anlz_file(content, "DAT")
    if dat is None or "PQTZ" not in dat:
        print(f"Deck {deck + 1}: library match has no PQTZ beatgrid")
        return

    beats, _bpms, times = dat.get_tag("PQTZ").get()
    state.grid = BeatGrid(
        times=[float(value) for value in times],
        beats=[int(value) for value in beats],
    )
    print(
        f"Deck {deck + 1}: loaded {len(times)} beatgrid points for "
        f"{state.artist} - {state.title}"
    )


def apply_message(
    db: Rekordbox6Database,
    decks: dict[int, DeckState],
    address: str,
    values: list[Any],
) -> None:
    parts = address.strip("/").split("/")
    if len(parts) < 2 or not parts[0].isdigit() or not values:
        return
    deck = int(parts[0])
    if deck not in decks:
        return
    state = decks[deck]

    if parts[1:] == ["time"]:
        state.position = float(values[0])
    elif parts[1:] == ["track", "title"]:
        title = str(values[0])
        if title != state.title:
            state.title = title
            state.grid = None
        load_grid(db, deck, state)
    elif parts[1:] == ["track", "artist"]:
        artist = str(values[0])
        if artist != state.artist:
            state.artist = artist
            state.grid = None
        load_grid(db, deck, state)


def render(decks: dict[int, DeckState]) -> None:
    locations: dict[int, BeatLocation] = {}
    for deck, state in decks.items():
        if state.position is None or state.grid is None:
            continue
        location = state.grid.locate(state.position)
        if location is None:
            continue
        locations[deck] = location
        print(
            f"Deck {deck + 1}: {state.position:8.3f}s | "
            f"beat {location.beat:5.2f} | phase {location.phase:5.3f}"
        )

    if 0 in locations and 1 in locations:
        phase_delta = (locations[1].phase - locations[0].phase + 0.5) % 1.0 - 0.5
        print(f"Deck 2 phase relative to Deck 1: {phase_delta:+.3f} beats")


def main() -> None:
    args = parse_args()
    deadline = time.monotonic() + args.seconds if args.seconds > 0 else None
    next_display = time.monotonic()
    decks = {0: DeckState(), 1: DeckState()}
    db = Rekordbox6Database()

    try:
        for deck, seed in enumerate((args.deck_1, args.deck_2)):
            if seed:
                decks[deck].title, decks[deck].artist = seed
                load_grid(db, deck, decks[deck])

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver:
            receiver.bind((args.host, args.port))
            receiver.settimeout(0.1)
            print(f"Listening for rkbx_link OSC on {args.host}:{args.port} ...")
            print("Restart rkbx_link or reload both tracks so track metadata is sent.")

            while deadline is None or time.monotonic() < deadline:
                try:
                    packet, _sender = receiver.recvfrom(65_535)
                    address, values = decode_message(packet)
                    apply_message(db, decks, address, values)
                except TimeoutError:
                    pass
                except (ValueError, struct.error) as error:
                    print(f"Could not decode OSC packet: {error}")

                now = time.monotonic()
                if now >= next_display:
                    render(decks)
                    next_display = now + args.display_interval
    finally:
        db.close()


if __name__ == "__main__":
    main()
