"""Serve read-only Rekordbox deck data from rkbx_link and pyrekordbox.

The bridge listens for rkbx_link OSC messages and exposes a local Server-Sent
Events stream for ClubSim. It never writes to the Rekordbox database or ANLZ
files and it does not start Rekordbox or rkbx_link.
"""

from __future__ import annotations

import argparse
import bisect
import json
import socket
import struct
import threading
import time
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from pyrekordbox import Rekordbox6Database

from osc_probe import decode_message


BRIDGE_VERSION = 1
WAVEFORM_LENGTH = 320
OVERVIEW_LENGTH = 116


def blank_waveform(length: int) -> list[dict[str, float]]:
    return [{"low": 2.0, "mid": 2.0, "high": 2.0} for _ in range(length)]


def format_time(seconds: float, negative: bool = False) -> str:
    tenths = max(0, int(round(seconds * 10.0)))
    minutes = tenths // 600
    remainder = (tenths % 600) / 10.0
    prefix = "-" if negative else ""
    return f"{prefix}{minutes:02d}:{remainder:04.1f}"


def downsample(samples: list[dict[str, float]], target: int) -> list[dict[str, float]]:
    if len(samples) <= target:
        return samples
    output = []
    for index in range(target):
        start = int(index * len(samples) / target)
        end = max(start + 1, int((index + 1) * len(samples) / target))
        chunk = samples[start:end]
        output.append(
            {
                "low": max(sample["low"] for sample in chunk),
                "mid": max(sample["mid"] for sample in chunk),
                "high": max(sample["high"] for sample in chunk),
            }
        )
    return output


@dataclass
class BeatLocation:
    beat_in_bar: int
    phase: float
    grid_index: int


@dataclass
class TrackAnalysis:
    title: str
    artist: str
    album: str
    key: str
    duration: float
    original_bpm: float
    beat_times: list[float]
    beat_numbers: list[int]
    waveform: list[dict[str, float]]
    overview: list[dict[str, float]]

    def locate(self, position: float) -> BeatLocation | None:
        index = bisect.bisect_right(self.beat_times, position) - 1
        if index < 0 or index >= len(self.beat_times):
            return None
        if index + 1 < len(self.beat_times):
            duration = self.beat_times[index + 1] - self.beat_times[index]
        elif index > 0:
            duration = self.beat_times[index] - self.beat_times[index - 1]
        else:
            return None
        if duration <= 0:
            return None
        phase = max(0.0, min(0.999999, (position - self.beat_times[index]) / duration))
        return BeatLocation(self.beat_numbers[index], phase, index)

    def waveform_window(self, position: float) -> list[dict[str, float]]:
        if not self.waveform or self.duration <= 0 or self.original_bpm <= 0:
            return blank_waveform(WAVEFORM_LENGTH)

        window_seconds = 16.0 * 60.0 / self.original_bpm
        window_start = position - window_seconds / 2.0
        seconds_per_cell = window_seconds / WAVEFORM_LENGTH
        samples_per_second = len(self.waveform) / self.duration
        output = []

        for index in range(WAVEFORM_LENGTH):
            start_time = window_start + index * seconds_per_cell
            end_time = start_time + seconds_per_cell
            if end_time <= 0 or start_time >= self.duration:
                output.append({"low": 2.0, "mid": 2.0, "high": 2.0})
                continue

            start = max(0, int(start_time * samples_per_second))
            end = min(
                len(self.waveform),
                max(start + 1, int(end_time * samples_per_second)),
            )
            chunk = self.waveform[start:end]
            output.append(
                {
                    "low": max(sample["low"] for sample in chunk),
                    "mid": max(sample["mid"] for sample in chunk),
                    "high": max(sample["high"] for sample in chunk),
                }
            )
        return output


@dataclass
class DeckRuntime:
    title: str = ""
    artist: str = ""
    album: str = ""
    position: float = 0.0
    current_bpm: float = 0.0
    analysis: TrackAnalysis | None = None
    last_position_change_at: float | None = None


@dataclass
class BridgeRuntime:
    decks: dict[int, DeckRuntime] = field(
        default_factory=lambda: {0: DeckRuntime(), 1: DeckRuntime()}
    )
    master_deck: int = 0
    master_title: str = ""
    master_artist: str = ""
    last_packet_at: float | None = None


class PublishedState:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._condition = threading.Condition()
        self._generation = 1
        self._payload = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)

    def publish(self, payload: dict[str, Any]) -> None:
        rendered = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        with self._condition:
            self._payload = rendered
            self._generation += 1
            self._condition.notify_all()

    def current(self) -> tuple[int, str]:
        with self._condition:
            return self._generation, self._payload

    def wait_for_update(self, generation: int, timeout: float) -> tuple[int, str]:
        with self._condition:
            self._condition.wait_for(lambda: self._generation != generation, timeout=timeout)
            return self._generation, self._payload


class BridgeHttpServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], state: PublishedState) -> None:
        self.bridge_state = state
        super().__init__(address, BridgeRequestHandler)


class BridgeRequestHandler(BaseHTTPRequestHandler):
    server: BridgeHttpServer

    def log_message(self, _format: str, *_args: Any) -> None:
        return

    def add_common_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.add_common_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/state":
            _generation, payload = self.server.bridge_state.current()
            body = payload.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.add_common_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path != "/events":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        self.send_response(HTTPStatus.OK)
        self.add_common_headers()
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        generation = -1
        try:
            while True:
                next_generation, payload = self.server.bridge_state.wait_for_update(
                    generation, timeout=12.0
                )
                if next_generation == generation:
                    message = ": keepalive\n\n"
                else:
                    generation = next_generation
                    message = f"data: {payload}\n\n"
                self.wfile.write(message.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--osc-host", default="127.0.0.1")
    parser.add_argument("--osc-port", default=4460, type=int)
    parser.add_argument("--http-host", default="127.0.0.1")
    parser.add_argument("--http-port", default=4470, type=int)
    parser.add_argument("--publish-rate", default=20.0, type=float)
    return parser.parse_args()


def waveform_from_analysis(db: Rekordbox6Database, content: Any) -> tuple[list[dict[str, float]], list[dict[str, float]]]:
    two_ex = db.read_anlz_file(content, "2EX")
    if two_ex is not None and "PWV7" in two_ex:
        entries = two_ex.get_tag("PWV7").content.entries
        samples = []
        for index in range(0, len(entries) - 2, 3):
            mid, high, low = entries[index : index + 3]
            samples.append(
                {
                    "low": max(2.0, float(low) / 126.0 * 100.0),
                    "mid": max(2.0, float(mid) / 126.0 * 100.0),
                    "high": max(2.0, float(high) / 126.0 * 100.0),
                }
            )
        return samples, downsample(samples, OVERVIEW_LENGTH)

    ext = db.read_anlz_file(content, "EXT")
    if ext is None or "PWV5" not in ext:
        empty = blank_waveform(WAVEFORM_LENGTH)
        return empty, blank_waveform(OVERVIEW_LENGTH)

    heights, colors = ext.get_tag("PWV5").get()
    samples = []
    for height, color in zip(heights, colors):
        red, green, blue = (float(value) for value in color)
        energy = float(height) * 100.0
        samples.append(
            {
                "low": max(2.0, energy * max(blue / 7.0, 0.16)),
                "mid": max(2.0, energy * max(green / 7.0, 0.16)),
                "high": max(2.0, energy * max(red / 14.0, 0.16)),
            }
        )
    return samples, downsample(samples, OVERVIEW_LENGTH)


def load_analysis(
    db: Rekordbox6Database, deck_number: int, deck: DeckRuntime
) -> None:
    deck.analysis = None
    if not deck.title or not deck.artist:
        return

    matches = db.get_content(Title=deck.title).all()
    content = next(
        (
            item
            for item in matches
            if getattr(getattr(item, "Artist", None), "Name", "").casefold()
            == deck.artist.casefold()
        ),
        None,
    )
    if content is None and len(matches) == 1:
        content = matches[0]
    if content is None:
        print(f"[Bridge] Deck {deck_number}: no library match for {deck.artist} - {deck.title}")
        return

    dat = db.read_anlz_file(content, "DAT")
    if dat is None or "PQTZ" not in dat:
        print(f"[Bridge] Deck {deck_number}: matching track has no PQTZ beatgrid")
        return

    beats, bpms, times = dat.get_tag("PQTZ").get()
    waveform, overview = waveform_from_analysis(db, content)
    album = getattr(getattr(content, "Album", None), "Name", "") or deck.album
    key = getattr(getattr(content, "Key", None), "Name", "")
    original_bpm = float(content.BPM or 0) / 100.0
    if not original_bpm and len(bpms):
        original_bpm = float(bpms[0])

    deck.analysis = TrackAnalysis(
        title=content.Title,
        artist=getattr(getattr(content, "Artist", None), "Name", "") or deck.artist,
        album=album,
        key=key,
        duration=float(content.Length or 0),
        original_bpm=original_bpm,
        beat_times=[float(value) for value in times],
        beat_numbers=[int(value) for value in beats],
        waveform=waveform,
        overview=overview,
    )
    print(
        f"[Bridge] Deck {deck_number}: loaded {len(times)} beats and "
        f"{len(waveform)} 3-band waveform samples for {deck.artist} - {deck.title}"
    )


def infer_master(runtime: BridgeRuntime, master_position: float) -> None:
    candidates = [
        (abs(deck.position - master_position), index)
        for index, deck in runtime.decks.items()
        if deck.title
    ]
    if candidates:
        difference, index = min(candidates)
        if difference < 0.08:
            runtime.master_deck = index


def infer_master_from_track(runtime: BridgeRuntime) -> None:
    if not runtime.master_title:
        return
    candidates = [
        index
        for index, deck in runtime.decks.items()
        if deck.title == runtime.master_title
        and (not runtime.master_artist or deck.artist == runtime.master_artist)
    ]
    if len(candidates) == 1:
        runtime.master_deck = candidates[0]


def apply_osc_message(
    db: Rekordbox6Database,
    runtime: BridgeRuntime,
    address: str,
    values: list[Any],
) -> None:
    if not values:
        return
    parts = address.strip("/").split("/")

    if parts == ["master", "time"]:
        infer_master(runtime, float(values[0]))
        return
    if parts == ["master", "track", "title"]:
        runtime.master_title = str(values[0])
        infer_master_from_track(runtime)
        return
    if parts == ["master", "track", "artist"]:
        runtime.master_artist = str(values[0])
        infer_master_from_track(runtime)
        return

    if len(parts) < 2 or not parts[0].isdigit():
        return
    deck_index = int(parts[0])
    if deck_index not in runtime.decks:
        return
    deck = runtime.decks[deck_index]

    if parts[1:] == ["time"]:
        position = float(values[0])
        if abs(position - deck.position) > 0.001:
            deck.last_position_change_at = time.monotonic()
        deck.position = position
    elif parts[1:] == ["bpm", "current"]:
        deck.current_bpm = float(values[0])
    elif parts[1:] == ["track", "title"]:
        title = str(values[0])
        if title != deck.title:
            deck.title = title
            deck.analysis = None
        load_analysis(db, deck_index + 1, deck)
        infer_master_from_track(runtime)
    elif parts[1:] == ["track", "artist"]:
        artist = str(values[0])
        if artist != deck.artist:
            deck.artist = artist
            deck.analysis = None
        load_analysis(db, deck_index + 1, deck)
        infer_master_from_track(runtime)
    elif parts[1:] == ["track", "album"]:
        deck.album = str(values[0])


def build_deck_state(
    deck_id: int,
    deck: DeckRuntime,
    location: BeatLocation | None,
    phase_offset: float,
    is_playing: bool,
) -> dict[str, Any]:
    analysis = deck.analysis
    duration = analysis.duration if analysis else 0.0
    progress = min(1.0, max(0.0, deck.position / duration)) if duration else 0.0
    original_bpm = analysis.original_bpm if analysis else 0.0
    current_bpm = deck.current_bpm or original_bpm
    tempo = ((current_bpm / original_bpm) - 1.0) * 100.0 if original_bpm else 0.0

    return {
        "id": deck_id,
        "artist": analysis.artist if analysis else deck.artist,
        "title": analysis.title if analysis else (deck.title or "WAITING FOR TRACK"),
        "album": analysis.album if analysis else deck.album,
        "bpm": round(current_bpm, 2),
        "tempo": round(tempo, 2),
        "elapsed": format_time(deck.position),
        "remaining": format_time(max(0.0, duration - deck.position), negative=True),
        "key": analysis.key if analysis else "--",
        "progress": progress,
        "beatInBar": location.beat_in_bar if location else 1,
        "beatPhase": location.phase if location else 0.0,
        "isPlaying": is_playing,
        "barsToNextCue": 0.0,
        "phaseOffset": phase_offset,
        "waveform": analysis.waveform_window(deck.position) if analysis else blank_waveform(WAVEFORM_LENGTH),
        "overview": analysis.overview if analysis else blank_waveform(OVERVIEW_LENGTH),
        "cues": [],
    }


def build_snapshot(runtime: BridgeRuntime) -> dict[str, Any]:
    now = time.monotonic()
    receiving = runtime.last_packet_at is not None and now - runtime.last_packet_at < 2.0
    loaded_count = sum(deck.analysis is not None for deck in runtime.decks.values())
    if loaded_count:
        connection_status = "live"
        playing_count = sum(
            deck.last_position_change_at is not None
            and now - deck.last_position_change_at < 0.3
            for deck in runtime.decks.values()
        )
        connection_message = (
            f"{loaded_count}/2 Beatgrids geladen · {playing_count}/2 Decks laufen"
        )
    elif receiving:
        connection_status = "waiting"
        connection_message = "OSC live · warte auf Track-Metadaten"
    else:
        connection_status = "waiting"
        connection_message = "Warte auf rkbx_link OSC auf Port 4460"

    locations = {
        index: deck.analysis.locate(deck.position) if deck.analysis else None
        for index, deck in runtime.decks.items()
    }
    master_location = locations.get(runtime.master_deck)
    decks: dict[str, Any] = {}
    for index, deck in runtime.decks.items():
        location = locations[index]
        is_playing = (
            deck.last_position_change_at is not None
            and now - deck.last_position_change_at < 0.3
        )
        phase_offset = 0.0
        if index != runtime.master_deck and location and master_location:
            phase_offset = (location.phase - master_location.phase + 0.5) % 1.0 - 0.5
        decks[str(index + 1)] = build_deck_state(
            index + 1, deck, location, phase_offset, is_playing
        )

    master_deck = runtime.master_deck + 1
    return {
        "version": BRIDGE_VERSION,
        "source": "rekordbox",
        "connectionStatus": connection_status,
        "connectionMessage": connection_message,
        "masterDeck": master_deck,
        "initialMasterDeck": master_deck,
        "decks": decks,
    }


def main() -> None:
    args = parse_args()
    if args.publish_rate <= 0:
        raise ValueError("--publish-rate must be greater than zero")

    runtime = BridgeRuntime()
    state = PublishedState(build_snapshot(runtime))
    server = BridgeHttpServer((args.http_host, args.http_port), state)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    print(f"[Bridge] SSE: http://{args.http_host}:{args.http_port}/events")
    print(f"[Bridge] State: http://{args.http_host}:{args.http_port}/state")
    print(f"[Bridge] OSC: {args.osc_host}:{args.osc_port}")
    print("[Bridge] Start this bridge before rkbx_link or reload tracks after startup.")

    db = Rekordbox6Database()
    publish_period = 1.0 / args.publish_rate
    next_publish = time.monotonic()

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver:
            receiver.bind((args.osc_host, args.osc_port))
            receiver.settimeout(0.1)
            while True:
                try:
                    packet, _sender = receiver.recvfrom(65_535)
                    address, values = decode_message(packet)
                    runtime.last_packet_at = time.monotonic()
                    apply_osc_message(db, runtime, address, values)
                except TimeoutError:
                    pass
                except (ValueError, struct.error) as error:
                    print(f"[Bridge] Could not decode OSC packet: {error}")

                now = time.monotonic()
                if now >= next_publish:
                    state.publish(build_snapshot(runtime))
                    next_publish = now + publish_period
    except KeyboardInterrupt:
        print("\n[Bridge] Stopped")
    finally:
        db.close()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
