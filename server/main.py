"""Vercel FastAPI entry point (root main.py, zero config).
POST /analyze (multipart: audio, prompt, user_id?) streams NDJSON: line 1 = measured numbers, line 2 = full scorecard."""
from __future__ import annotations

import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402

from vojo_speech.audio.normalize import AudioError  # noqa: E402
from vojo_speech.pipeline import finish, measure  # noqa: E402
from vojo_speech.transcribe import TranscriptionError  # noqa: E402

app = FastAPI(title="Vojo speech analysis")


def log_summary(out: dict) -> None:
    """One line per graded clip in the Vercel logs (numbers only, no transcript) so scoring curves can be tuned on real sessions."""
    f, p, pr, s = out["fillers"], out["pacing"], out["prosody"], out["scores"]
    c = out.get("content") or {}
    print("VOJO_SCORE " + json.dumps({
        "dur": out["duration_s"], "words": p["word_count"], "fillers": f["total"], "per_filler": f["per_filler"], "fpm": f["per_minute"],
        "wpm": p["wpm"], "pauses1s": p["pauses"]["over_1s"], "longest": p["pauses"]["longest_s"],
        "pitch_sd": pr["pitch_variation_semitones"], "uptalk": f"{pr['uptalk']['rising']}/{pr['uptalk']['statements']}",
        "content": {k: c.get(k) for k in ("on_topic_score", "structure_score", "clarity_score")},
        "scores": s, "timings": out["meta"]["timings"],
    }))


@app.get("/health")
def health():
    deps = {}
    try:
        import parselmouth  # noqa: F401

        deps["parselmouth"] = True
    except Exception as e:  # pragma: no cover
        deps["parselmouth"] = str(e)
    try:
        from vojo_speech.audio.normalize import ffmpeg_bin

        deps["ffmpeg"] = os.path.basename(ffmpeg_bin())
    except Exception as e:  # pragma: no cover
        deps["ffmpeg"] = str(e)
    return {"ok": True, "deps": deps, "transcriber": os.environ.get("TRANSCRIBER") or ("deepgram" if os.environ.get("DEEPGRAM_API_KEY") else "assemblyai"), "llm": bool(os.environ.get("ANTHROPIC_API_KEY"))}


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...), prompt: str = Form(...), user_id: str | None = Form(None), x_vojo_key: str | None = Header(None), stream: bool = True):
    secret = os.environ.get("VOJO_API_SECRET")
    if secret and x_vojo_key != secret:
        raise HTTPException(401, "Bad or missing X-Vojo-Key")
    suffix = os.path.splitext(audio.filename or "clip.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(await audio.read())
        src = f.name
    # Measure before responding so audio/transcription errors still surface as proper HTTP errors.
    try:
        m = measure(src)
    except AudioError as e:
        raise HTTPException(400, str(e)) from e
    except TranscriptionError as e:
        raise HTTPException(502, str(e)) from e
    finally:
        try:
            os.unlink(src)
        except OSError:
            pass

    if not stream:
        out = finish(m, prompt)
        log_summary(out)
        if user_id:
            out["user_id"] = user_id
        return out

    def gen():
        first = m.payload(confirmed=None)   # pause-based ambiguous resolution for the provisional numbers
        first["stage"] = "measured"
        yield json.dumps(first) + "\n"
        out = finish(m, prompt)
        log_summary(out)
        out["stage"] = "final"
        if user_id:
            out["user_id"] = user_id
        yield json.dumps(out) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})
