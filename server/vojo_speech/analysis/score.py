"""Sub-scores and the vojo_score. Every curve maps a HEALTHY range to 100, never an extreme."""
from __future__ import annotations

from vojo_speech import config


def clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def lerp_score(x: float, full: float, zero: float) -> float:
    """100 at `full`, 0 at `zero`, linear between; works in either direction."""
    if full == zero:
        return 100.0
    t = (x - full) / (zero - full)
    return clamp(100.0 * (1.0 - t))


def fillers_score(per_minute: float) -> float:
    # Curve: up to FILLERS_PER_MIN_FREE per minute is free (natural speech has a stray "um"), then linear to 0 at FILLERS_PER_MIN_ZERO.
    return lerp_score(max(per_minute, config.FILLERS_PER_MIN_FREE), config.FILLERS_PER_MIN_FREE, config.FILLERS_PER_MIN_ZERO)


def wpm_score(wpm: float) -> float:
    # Curve: 100 inside WPM_IDEAL. Outside, lose 2.5 points per WPM (so 110 and 190 score ~50).
    lo, hi = config.WPM_IDEAL
    if lo <= wpm <= hi:
        return 100.0
    return clamp(100.0 - 2.5 * (lo - wpm if wpm < lo else wpm - hi))


def pauses_score(per_minute_over_1s: float, over_2s: int, over_3s: int, long_freeze: bool) -> float:
    # Curve: 1–4 pauses >1s per minute = 100 (breathing room beats a wall of words). 0 pauses = 90.
    # Above 4/min lose 10 each. Every pause >2s costs 6 more, >3s another 10, a >4s freeze 20.
    lo, hi = config.PAUSES_PER_MIN_IDEAL
    if per_minute_over_1s == 0:
        s = 90.0
    elif per_minute_over_1s <= hi:
        s = 100.0
    else:
        s = 100.0 - 10.0 * (per_minute_over_1s - hi)
    s -= 6 * over_2s + 10 * over_3s + (20 if long_freeze else 0)
    return clamp(s)


def pacing_score(pacing: dict) -> float:
    p = pacing["pauses"]
    return 0.6 * wpm_score(pacing["wpm"]) + 0.4 * pauses_score(p["per_minute_over_1s"], p["over_2s"], p["over_3s"], pacing["flags"]["long_freeze"])


def variation_score(st: float) -> float:
    # Curve: >= VARIATION_FULL_ST semitones of pitch movement = 100, linear down to 0 at VARIATION_ZERO_ST.
    return lerp_score(min(st, config.VARIATION_FULL_ST), config.VARIATION_FULL_ST, config.VARIATION_ZERO_ST)


def uptalk_score(ratio: float, statements: int) -> float:
    # Curve: up to 15% of statements rising is normal = 100, linear to 0 at 75%. Too few statements to judge = neutral 85.
    if statements < 3:
        return 85.0
    return lerp_score(max(ratio, config.UPTALK_RATIO_FREE), config.UPTALK_RATIO_FREE, config.UPTALK_RATIO_ZERO)


def prosody_score(prosody: dict) -> float:
    return 0.6 * variation_score(prosody["pitch_variation_semitones"]) + 0.4 * uptalk_score(prosody["uptalk"]["ratio"], prosody["uptalk"]["statements"])


def content_score(content: dict | None) -> float | None:
    if not content:
        return None
    return 0.45 * content["on_topic_score"] + 0.35 * content["structure_score"] + 0.20 * content["clarity_score"]


def confidence_score(fillers: dict, pacing: dict, prosody: dict) -> float:
    """Derived ONLY from measured signals. Shown to the user as 'Confidence'."""
    p = pacing["pauses"]
    parts = [
        fillers_score(fillers["per_minute"]),
        pauses_score(p["per_minute_over_1s"], p["over_2s"], p["over_3s"], pacing["flags"]["long_freeze"]),
        variation_score(prosody["pitch_variation_semitones"]),
        uptalk_score(prosody["uptalk"]["ratio"], prosody["uptalk"]["statements"]),
    ]
    return sum(parts) / len(parts)


def combine(fillers: dict, pacing: dict, prosody: dict, content: dict | None) -> dict:
    subs = {
        "fillers": fillers_score(fillers["per_minute"]),
        "pacing": pacing_score(pacing),
        "prosody": prosody_score(prosody),
        "content": content_score(content),
    }
    weights = dict(config.WEIGHTS)
    if subs["content"] is None:            # math-only run: renormalize the other weights
        weights.pop("content")
        total_w = sum(weights.values())
        weights = {k: v / total_w for k, v in weights.items()}
    vojo = sum(subs[k] * w for k, w in weights.items())
    out = {k: (round(v) if v is not None else None) for k, v in subs.items()}
    out["confidence"] = round(confidence_score(fillers, pacing, prosody))
    out["vojo_score"] = round(vojo)
    return out
