from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Protocol


class TranscriptionError(RuntimeError):
    """Provider failed or returned no speech."""


@dataclass
class Word:
    text: str          # as spoken, with punctuation where the provider gives it ("pizza,")
    start_ms: int
    end_ms: int
    confidence: float


@dataclass
class Transcript:
    text: str
    words: list[Word]
    provider: str
    audio_seconds: float
    raw: Any = field(default=None, repr=False)


class Transcriber(Protocol):
    name: str

    def transcribe(self, wav_path: str) -> Transcript: ...


def get_transcriber() -> Transcriber:
    """Pick the provider from env. TRANSCRIBER wins; otherwise Deepgram if its key is present, else AssemblyAI."""
    choice = (os.environ.get("TRANSCRIBER") or "").lower()
    if not choice:
        choice = "deepgram" if os.environ.get("DEEPGRAM_API_KEY") else "assemblyai"
    if choice == "deepgram":
        from .deepgram import DeepgramTranscriber

        return DeepgramTranscriber()
    if choice == "assemblyai":
        from .assemblyai_client import AssemblyAITranscriber

        return AssemblyAITranscriber()
    raise TranscriptionError(f"Unknown TRANSCRIBER '{choice}'")
