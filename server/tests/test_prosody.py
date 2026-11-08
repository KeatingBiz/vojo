import os
import tempfile
import wave

import numpy as np
import pytest

from vojo_speech.analysis.prosody import Contour, classify_slope, extract_contour, slope_st_per_s, uptalk
from vojo_speech.transcribe import Word


def test_slope_classifier_on_synthetic_arrays():
    t = np.linspace(0, 0.4, 40)
    rising = 3.0 * t / 0.4            # +3 semitones over 400ms = 7.5 st/s
    falling = -rising
    flat = np.zeros_like(t) + 0.2
    assert classify_slope(slope_st_per_s(t, rising)) == "rising"
    assert classify_slope(slope_st_per_s(t, falling)) == "falling"
    assert classify_slope(slope_st_per_s(t, flat)) == "flat"
    assert classify_slope(slope_st_per_s(t[:2], rising[:2])) == "unknown"


def test_uptalk_ratio_counts_only_statements():
    times = np.arange(0, 6.0, 0.01)
    st = np.zeros_like(times)
    st[(times > 1.6) & (times <= 2.0)] = np.linspace(0, 3, 40)      # sentence 1 ends rising at 2.0s
    st[(times > 3.6) & (times <= 4.0)] = np.linspace(0, -3, 40)     # sentence 2 ends falling at 4.0s
    st[(times > 5.6) & (times <= 6.0)] = np.linspace(0, 3, 40)      # question ends rising at 6.0s (ignored)
    c = Contour(times, st, 180.0, 1.0)
    sentences = [
        {"start_ms": 0, "end_ms": 2000, "text": "I went home.", "is_question": False},
        {"start_ms": 2100, "end_ms": 4000, "text": "It was fine.", "is_question": False},
        {"start_ms": 4100, "end_ms": 6000, "text": "Right?", "is_question": True},
    ]
    r = uptalk(c, sentences)
    assert r["statements"] == 2 and r["rising"] == 1 and r["ratio"] == 0.5


def _synth_voice(path: str, f0_curve, sr=16000, seconds=3.0):
    """Harmonic-rich tone with a time-varying F0, enough for Praat to track."""
    t = np.arange(int(sr * seconds)) / sr
    f0 = f0_curve(t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    sig = sum((1.0 / h) * np.sin(h * phase) for h in range(1, 6))
    sig = 0.3 * sig / np.abs(sig).max()
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((sig * 32767).astype(np.int16).tobytes())


def test_praat_tracks_a_rising_tail_end_to_end():
    pytest.importorskip("parselmouth")
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "rise.wav")
        # 150 Hz flat, then rising to 200 Hz in the last 0.4s
        _synth_voice(p, lambda t: np.where(t < 2.6, 150.0, 150.0 + (t - 2.6) / 0.4 * 50.0))
        c = extract_contour(p)
        assert 140 < c.median_hz < 160
        words = [Word("I", 100, 300, 1), Word("agree.", 400, 2990, 1)]
        r = uptalk(c, [{"start_ms": 100, "end_ms": 2990, "text": "I agree.", "is_question": False}])
        assert r["rising"] == 1 and r["statements"] == 1
