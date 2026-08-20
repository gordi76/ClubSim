"""Print OSC messages received from rkbx_link without external dependencies."""

from __future__ import annotations

import argparse
import socket
import struct
import time
from collections import Counter
from typing import Any


def read_padded_string(data: bytes, offset: int) -> tuple[str, int]:
    end = data.find(b"\0", offset)
    if end == -1:
        raise ValueError("unterminated OSC string")
    value = data[offset:end].decode("utf-8", errors="replace")
    return value, (end + 4) & ~3


def decode_message(data: bytes) -> tuple[str, list[Any]]:
    address, offset = read_padded_string(data, 0)
    type_tags, offset = read_padded_string(data, offset)
    if not type_tags.startswith(","):
        raise ValueError("missing OSC type tag")

    values: list[Any] = []
    for type_tag in type_tags[1:]:
        if type_tag == "f":
            values.append(struct.unpack_from(">f", data, offset)[0])
            offset += 4
        elif type_tag == "i":
            values.append(struct.unpack_from(">i", data, offset)[0])
            offset += 4
        elif type_tag == "s":
            value, offset = read_padded_string(data, offset)
            values.append(value)
        elif type_tag == "T":
            values.append(True)
        elif type_tag == "F":
            values.append(False)
        else:
            raise ValueError(f"unsupported OSC type tag: {type_tag}")
    return address, values


def encode_message(address: str, value: str | float | int) -> bytes:
    """Encode one simple OSC value for local bridge diagnostics."""

    def padded_string(text: str) -> bytes:
        data = text.encode("utf-8") + b"\0"
        return data + b"\0" * (-len(data) % 4)

    if isinstance(value, str):
        return padded_string(address) + padded_string(",s") + padded_string(value)
    if isinstance(value, float):
        return padded_string(address) + padded_string(",f") + struct.pack(">f", value)
    return padded_string(address) + padded_string(",i") + struct.pack(">i", value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=4460, type=int)
    parser.add_argument(
        "--seconds",
        default=0.0,
        type=float,
        help="Stop after this many seconds; zero keeps listening.",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print one packet-count summary instead of every received message.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    deadline = time.monotonic() + args.seconds if args.seconds > 0 else None
    counts: Counter[str] = Counter()
    first_values: dict[str, list[Any]] = {}
    latest_values: dict[str, list[Any]] = {}

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver:
        receiver.bind((args.host, args.port))
        receiver.settimeout(0.25)
        print(f"Listening for rkbx_link OSC on {args.host}:{args.port} ...")

        while deadline is None or time.monotonic() < deadline:
            try:
                packet, sender = receiver.recvfrom(65_535)
            except TimeoutError:
                continue

            try:
                address, values = decode_message(packet)
                counts[address] += 1
                first_values.setdefault(address, values)
                latest_values[address] = values
                if args.summary:
                    continue
                stamp = time.strftime("%H:%M:%S")
                rendered = ", ".join(repr(value) for value in values)
                print(f"{stamp} {sender[0]}:{sender[1]} {address} {rendered}")
            except (ValueError, struct.error) as error:
                print(f"Could not decode {len(packet)} byte packet: {error}")

    if args.summary:
        if not counts:
            print("No OSC messages received.")
            return
        print("\nOSC address summary:")
        for address in sorted(counts):
            print(
                f"{address}: {counts[address]} packets | "
                f"first={first_values[address]!r} | latest={latest_values[address]!r}"
            )


if __name__ == "__main__":
    main()
