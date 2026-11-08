"""Run the pipeline over a folder of clips and print a comparison table.
Usage: python eval/run.py <folder> [--no-llm] [--prompt "..."]
Transcripts are cached in eval/out/<clip>.transcript.json so re-runs do not pay for transcription again.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import asdict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from vojo_speech.pipeline import analyze_file  # noqa: E402
from vojo_speech.transcribe import Transcript, Word, get_transcriber  # noqa: E402
from vojo_speech.audio.normalize import normalize  # noqa: E402

AUDIO = (".wav", ".m4a", ".mp3", ".aac", ".caf", ".ogg")


def cached_transcript(clip: str, out_dir: str) -> Transcript | None:
    p = os.path.join(out_dir, os.path.basename(clip) + ".transcript.json")
    if not os.path.exists(p):
        return None
    d = json.load(open(p))
    return Transcript(text=d["text"], words=[Word(**w) for w in d["words"]], provider=d["provider"], audio_seconds=d["audio_seconds"])


def save_transcript(clip: str, out_dir: str, t: Transcript) -> None:
    p = os.path.join(out_dir, os.path.basename(clip) + ".transcript.json")
    json.dump({"text": t.text, "words": [asdict(w) for w in t.words], "provider": t.provider, "audio_seconds": t.audio_seconds}, open(p, "w"), indent=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--prompt", default="What is your favorite color, and why does it feel like you?")
    ap.add_argument("--no-llm", action="store_true")
    args = ap.parse_args()
    out_dir = os.path.join(os.path.dirname(__file__), "out")
    os.makedirs(out_dir, exist_ok=True)
    clips = sorted(f for f in os.listdir(args.folder) if f.lower().endswith(AUDIO))
    if not clips:
        raise SystemExit(f"no audio in {args.folder}")
    rows = []
    for name in clips:
        path = os.path.join(args.folder, name)
        t0 = time.perf_counter()
        tr = cached_transcript(path, out_dir)
        if tr is None:
            import tempfile

            with tempfile.TemporaryDirectory() as tmp:
                audio = normalize(path, tmp)
                tr = get_transcriber().transcribe(audio.path)
            save_transcript(path, out_dir, tr)
        r = analyze_file(path, args.prompt, transcript=tr, use_llm=not args.no_llm)
        json.dump(r, open(os.path.join(out_dir, name + ".result.json"), "w"), indent=1)
        f, p, pr, s = r["fillers"], r["pacing"], r["prosody"], r["scores"]
        rows.append([name[:22], f"{r['duration_s']:.0f}", f["total"], f"{f['per_minute']:.1f}", f"{p['wpm']:.0f}", p["pauses"]["over_1s"], f"{p['pauses']['longest_s']:.1f}",
                     f"{pr['pitch_variation_semitones']:.1f}", f"{pr['uptalk']['rising']}/{pr['uptalk']['statements']}", s["confidence"], s["content"] if s["content"] is not None else "-", s["vojo_score"],
                     f"${r['meta']['cost']['total_usd']:.4f}", f"{time.perf_counter() - t0:.1f}s"])
    hdr = ["clip", "dur", "fill", "f/min", "wpm", "p>1s", "longest", "pitch sd", "uptalk", "conf", "content", "VOJO", "cost", "time"]
    widths = [max(len(str(x)) for x in col) for col in zip(hdr, *rows)]
    print("  ".join(h.ljust(w) for h, w in zip(hdr, widths)))
    for row in rows:
        print("  ".join(str(x).ljust(w) for x, w in zip(row, widths)))
    print("\nfull results in", out_dir)


if __name__ == "__main__":
    main()
