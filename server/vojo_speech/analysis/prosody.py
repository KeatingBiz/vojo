"""Pitch and energy via Praat (parselmouth) and numpy. Everything is relative to the speaker's own median pitch."""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from vojo_speech import config
from vojo_speech.transcribe import Word


@dataclass
class Contour:
    times: np.ndarray       # seconds
    semitones: np.ndarray   # relative to median F0; NaN where unvoiced
    median_hz: float
    voiced_ratio: float


def extract_contour(wav_path: str) -> Contour:
    import parselmouth

    snd = parselmouth.Sound(wav_path)
    pitch = snd.to_pitch(time_step=config.PITCH_TIME_STEP_S, pitch_floor=config.PITCH_FLOOR_HZ, pitch_ceiling=config.PITCH_CEILING_HZ)
    f0 = pitch.selected_array["frequency"].astype(np.float64)
    times = pitch.xs()
    voiced = f0 > 0
    if voiced.sum() < config.UPTALK_MIN_FRAMES:
        return Contour(times, np.full_like(f0, np.nan), 0.0, 0.0)
    median = float(np.median(f0[voiced]))
    st = np.full_like(f0, np.nan)
    st[voiced] = 12.0 * np.log2(f0[voiced] / median)
    return Contour(times, st, median, float(voiced.mean()))


def slope_st_per_s(times: np.ndarray, st: np.ndarray) -> float | None:
    """Least-squares slope of a short pitch tail. None when there is not enough voiced data."""
    ok = ~np.isnan(st)
    if ok.sum() < config.UPTALK_MIN_FRAMES:
        return None
    t, y = times[ok], st[ok]
    if t.max() - t.min() < 1e-3:
        return None
    return float(np.polyfit(t - t.mean(), y, 1)[0])


def classify_slope(slope: float | None, rise: float = config.UPTALK_RISE_ST_PER_S) -> str:
    if slope is None:
        return "unknown"
    if slope > rise:
        return "rising"
    if slope < -rise:
        return "falling"
    return "flat"


def sentences_from_words(words: list[Word]) -> list[dict]:
    """Split on terminal punctuation. Each sentence: start_ms, end_ms, text, is_question."""
    out, buf = [], []
    for w in words:
        buf.append(w)
        if w.text.rstrip().endswith((".", "?", "!")):
            out.append({"start_ms": buf[0].start_ms, "end_ms": buf[-1].end_ms, "text": " ".join(x.text for x in buf), "is_question": w.text.rstrip().endswith("?")})
            buf = []
    if buf:
        out.append({"start_ms": buf[0].start_ms, "end_ms": buf[-1].end_ms, "text": " ".join(x.text for x in buf), "is_question": False})
    return out


def uptalk(contour: Contour, sentences: list[dict]) -> dict:
    statements = [s for s in sentences if not s["is_question"]]
    instances, classified = [], 0
    for s in statements:
        end = s["end_ms"] / 1000.0
        sel = (contour.times > end - config.UPTALK_TAIL_S) & (contour.times <= end + 0.01)
        slope = slope_st_per_s(contour.times[sel], contour.semitones[sel])
        label = classify_slope(slope)
        if label == "unknown":
            continue
        classified += 1
        if label == "rising":
            instances.append({"end_ms": s["end_ms"], "slope_st_per_s": round(slope, 2), "text": s["text"][-60:]})
    return {"rising": len(instances), "statements": classified, "ratio": round(len(instances) / classified, 3) if classified else 0.0, "instances": instances}


def energy(samples: np.ndarray, sr: int) -> dict:
    frame = int(sr * config.ENERGY_FRAME_S)
    n = len(samples) // frame
    if n == 0:
        return {"mean_rms": 0.0, "rms_frames": []}
    rms = np.sqrt((samples[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
    return {"mean_rms": round(float(rms.mean()), 4), "frames_s": config.ENERGY_FRAME_S, "rms_p10": round(float(np.percentile(rms, 10)), 4), "rms_p90": round(float(np.percentile(rms, 90)), 4)}


def analyze_prosody(wav_path: str, samples: np.ndarray, sr: int, words: list[Word], duration_s: float) -> dict:
    c = extract_contour(wav_path)
    voiced = ~np.isnan(c.semitones)
    variation = float(np.nanstd(c.semitones)) if voiced.any() else 0.0
    # drift: median of first vs last window, in semitones
    drift = 0.0
    if duration_s > 2 * config.DRIFT_WINDOW_S * 0.6 and voiced.any():
        first = c.semitones[voiced & (c.times < config.DRIFT_WINDOW_S)]
        last = c.semitones[voiced & (c.times > duration_s - config.DRIFT_WINDOW_S)]
        if len(first) > 10 and len(last) > 10:
            drift = float(np.median(last) - np.median(first))
    up = uptalk(c, sentences_from_words(words))
    return {
        "median_pitch_hz": round(c.median_hz, 1),
        "pitch_variation_semitones": round(variation, 2),
        "monotone": variation < config.MONOTONE_ST,
        "uptalk": up,
        "pitch_drift_semitones": round(drift, 2),
        "voiced_ratio": round(c.voiced_ratio, 3),
        "energy": energy(samples, sr),
    }
