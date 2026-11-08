"""End to end on a synthetic clip with a fake transcriber. No network, no keys."""
import os
import tempfile
import wave

import numpy as np

from vojo_speech.pipeline import analyze_file
from vojo_speech.transcribe import Transcript
from tests.helpers import words_from


class FakeTranscriber:
    name = "fake"

    def __init__(self, words):
        self.words = words

    def transcribe(self, wav_path):
        return Transcript(text=" ".join(w.text for w in self.words), words=self.words, provider=self.name, audio_seconds=8.0)


def _tone_wav(path, seconds=8.0, sr=16000):
    t = np.arange(int(sr * seconds)) / sr
    f0 = 160 + 20 * np.sin(2 * np.pi * 0.5 * t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    sig = sum((1.0 / h) * np.sin(h * phase) for h in range(1, 5))
    sig = 0.3 * sig / np.abs(sig).max()
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((sig * 32767).astype(np.int16).tobytes())


def test_analyze_file_math_only():
    os.environ.pop("ANTHROPIC_API_KEY", None)
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "clip.wav")
        _tone_wav(p)
        words = words_from("Um, my favorite color is blue. | It feels, like, calm. Basically it is the sea.", wpm=150)
        r = analyze_file(p, "What is your favorite color?", transcriber=FakeTranscriber(words), use_llm=False)
    assert r["fillers"]["total"] >= 2
    assert r["scores"]["content"] is None
    assert 0 <= r["scores"]["vojo_score"] <= 100
    assert r["feedback"]["headline"] and r["feedback"]["notes"]["fillers"]
    assert any(w["is_filler"] for w in r["words"])
    assert r["meta"]["cost"]["total_usd"] == 0
