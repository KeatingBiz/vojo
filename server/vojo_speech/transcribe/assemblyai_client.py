"""AssemblyAI universal with disfluencies=True. Batch API: upload, create, poll."""
from __future__ import annotations

import os
import time
import wave

import httpx

from .base import Transcript, TranscriptionError, Word

BASE = "https://api.assemblyai.com/v2"


class AssemblyAITranscriber:
    name = "assemblyai"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ASSEMBLYAI_API_KEY")
        if not self.api_key:
            raise TranscriptionError("ASSEMBLYAI_API_KEY is not set")
        self.headers = {"authorization": self.api_key}

    def transcribe(self, wav_path: str) -> Transcript:
        with open(wav_path, "rb") as f:
            data = f.read()
        with wave.open(wav_path, "rb") as w:
            seconds = w.getnframes() / w.getframerate()
        try:
            up = httpx.post(f"{BASE}/upload", headers=self.headers, content=data, timeout=60)
            up.raise_for_status()
            audio_url = up.json()["upload_url"]
            job = httpx.post(
                f"{BASE}/transcript",
                headers=self.headers,
                json={"audio_url": audio_url, "speech_models": ["universal-2"], "disfluencies": True, "punctuate": True, "format_text": True, "language_code": "en"},
                timeout=30,
            )
            job.raise_for_status()
            tid = job.json()["id"]
            deadline = time.time() + 120
            while time.time() < deadline:
                st = httpx.get(f"{BASE}/transcript/{tid}", headers=self.headers, timeout=30)
                st.raise_for_status()
                body = st.json()
                if body["status"] == "completed":
                    break
                if body["status"] == "error":
                    raise TranscriptionError(f"AssemblyAI error: {body.get('error')}")
                time.sleep(1.0)
            else:
                raise TranscriptionError("AssemblyAI timed out")
        except httpx.HTTPStatusError as e:
            raise TranscriptionError(f"AssemblyAI {e.response.status_code}: {e.response.text[:300]}") from e
        except httpx.HTTPError as e:
            raise TranscriptionError(f"AssemblyAI request failed: {e}") from e
        words = [Word(text=w["text"], start_ms=int(w["start"]), end_ms=int(w["end"]), confidence=float(w.get("confidence", 1.0))) for w in body.get("words") or []]
        if not words:
            raise TranscriptionError("No speech detected in the recording")
        return Transcript(text=body.get("text") or "", words=words, provider=self.name, audio_seconds=seconds, raw=body)
