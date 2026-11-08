"""Deepgram nova-3 with filler_words so um/uh survive. Synchronous, usually a few seconds for a 60s clip."""
from __future__ import annotations

import os
import wave

import httpx

from .base import Transcript, TranscriptionError, Word

URL = "https://api.deepgram.com/v1/listen"
PARAMS = {"model": "nova-3", "smart_format": "true", "punctuate": "true", "filler_words": "true", "language": "en"}


class DeepgramTranscriber:
    name = "deepgram"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise TranscriptionError("DEEPGRAM_API_KEY is not set")

    def transcribe(self, wav_path: str) -> Transcript:
        with open(wav_path, "rb") as f:
            data = f.read()
        with wave.open(wav_path, "rb") as w:
            seconds = w.getnframes() / w.getframerate()
        try:
            res = httpx.post(URL, params=PARAMS, headers={"Authorization": f"Token {self.api_key}", "Content-Type": "audio/wav"}, content=data, timeout=60)
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise TranscriptionError(f"Deepgram {e.response.status_code}: {e.response.text[:300]}") from e
        except httpx.HTTPError as e:
            raise TranscriptionError(f"Deepgram request failed: {e}") from e
        body = res.json()
        try:
            alt = body["results"]["channels"][0]["alternatives"][0]
        except (KeyError, IndexError) as e:
            raise TranscriptionError("Deepgram returned no transcript") from e
        words = [
            Word(text=w.get("punctuated_word") or w["word"], start_ms=int(round(w["start"] * 1000)), end_ms=int(round(w["end"] * 1000)), confidence=float(w.get("confidence", 1.0)))
            for w in alt.get("words", [])
        ]
        if not words:
            raise TranscriptionError("No speech detected in the recording")
        return Transcript(text=alt.get("transcript", ""), words=words, provider=self.name, audio_seconds=seconds, raw=body)
