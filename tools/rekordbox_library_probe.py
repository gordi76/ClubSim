"""Read track metadata and analysis summaries from Rekordbox without writing."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from pyrekordbox import Rekordbox6Database


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("titles", nargs="+", help="Exact Rekordbox track titles to inspect.")
    return parser.parse_args()


def waveform_summary(anlz: Any) -> dict[str, Any] | None:
    for tag_type in ("PWV5", "PWV4", "PWV3", "PWV2"):
        if tag_type not in anlz:
            continue
        values = anlz.get_tag(tag_type).get()
        shapes = [list(value.shape) for value in values]
        return {"tag": tag_type, "shapes": shapes}
    return None


def track_summary(db: Rekordbox6Database, content: Any) -> dict[str, Any]:
    files = db.read_anlz_files(content)
    by_suffix = {Path(path).suffix.upper(): anlz for path, anlz in files.items()}
    dat = by_suffix.get(".DAT")
    ext = by_suffix.get(".EXT")

    beatgrid: dict[str, Any] | None = None
    if dat is not None and "PQTZ" in dat:
        beats, bpms, times = dat.get_tag("PQTZ").get()
        beatgrid = {
            "count": len(times),
            "bpms": sorted(set(float(value) for value in bpms)),
            "first": [
                {"beat": int(beat), "bpm": float(bpm), "time": float(time)}
                for beat, bpm, time in zip(beats[:8], bpms[:8], times[:8])
            ],
        }

    waveform = None
    for anlz in (ext, dat):
        if anlz is not None:
            waveform = waveform_summary(anlz)
            if waveform is not None:
                break

    return {
        "id": content.ID,
        "title": content.Title,
        "artist": getattr(getattr(content, "Artist", None), "Name", None),
        "audio_path": content.FolderPath,
        "analysis_data_path": content.AnalysisDataPath,
        "database_bpm": content.BPM / 100,
        "files": {suffix: str(anlz.path) for suffix, anlz in by_suffix.items()},
        "beatgrid": beatgrid,
        "waveform": waveform,
        "phrase_data": bool(ext is not None and "PSSI" in ext),
    }


def main() -> None:
    args = parse_args()
    db = Rekordbox6Database()
    try:
        results = []
        for title in args.titles:
            matches = db.get_content(Title=title).all()
            results.extend(track_summary(db, content) for content in matches)
        print(json.dumps(results, indent=2, ensure_ascii=False))
    finally:
        db.close()


if __name__ == "__main__":
    main()
