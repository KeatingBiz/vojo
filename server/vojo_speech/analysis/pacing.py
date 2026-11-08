"""Words per minute and pauses, from word timestamps only."""
from __future__ import annotations

from dataclasses import dataclass

from vojo_speech import config
from vojo_speech.transcribe import Word


@dataclass
class Pause:
    start_ms: int
    end_ms: int

    @property
    def seconds(self) -> float:
        return (self.end_ms - self.start_ms) / 1000.0


def find_pauses(words: list[Word], min_ms: int = config.PAUSE_MIN_MS) -> list[Pause]:
    out = []
    for a, b in zip(words, words[1:]):
        gap = b.start_ms - a.end_ms
        if gap >= min_ms:
            out.append(Pause(a.end_ms, b.start_ms))
    return out


def windowed_wpm(words: list[Word], duration_s: float, window_s: int = config.WPM_WINDOW_S) -> list[dict]:
    n_windows = max(1, int(duration_s // window_s) + (1 if duration_s % window_s > 2 else 0))
    out = []
    for k in range(n_windows):
        lo, hi = k * window_s * 1000, (k + 1) * window_s * 1000
        count = sum(1 for w in words if lo <= w.start_ms < hi)
        span = min(hi, duration_s * 1000) - lo
        out.append({"start_s": lo // 1000, "wpm": round(count / max(span, 1000) * 60_000, 1)})
    return out


def analyze_pacing(words: list[Word], duration_s: float) -> dict:
    pauses = find_pauses(words)
    wpm = len(words) / max(duration_s, 1.0) * 60.0
    silence_s = sum(p.seconds for p in pauses)
    lead_in = words[0].start_ms / 1000.0 if words else 0.0
    speaking_s = max(0.0, duration_s - silence_s - lead_in)
    longest = max(pauses, key=lambda p: p.seconds, default=None)
    tiers = {f"over_{t:g}s": sum(1 for p in pauses if p.seconds > t) for t in config.PAUSE_TIERS_S}
    minutes = max(duration_s, 1.0) / 60.0
    return {
        "wpm": round(wpm, 1),
        "wpm_windows": windowed_wpm(words, duration_s),
        "word_count": len(words),
        "speaking_s": round(speaking_s, 2),
        "duration_s": round(duration_s, 2),
        "silence_ratio": round(silence_s / max(duration_s, 1.0), 3),
        "pauses": {
            **tiers,
            "count": len(pauses),
            "per_minute_over_1s": round(tiers["over_1s"] / minutes, 2),
            "longest_s": round(longest.seconds, 2) if longest else 0.0,
            "longest_at_ms": longest.start_ms if longest else None,
            "all": [{"start_ms": p.start_ms, "end_ms": p.end_ms, "seconds": round(p.seconds, 2)} for p in pauses if p.seconds > 1.0],
        },
        "flags": {
            "rushing": wpm > config.WPM_RUSHING,
            "too_slow": wpm < config.WPM_TOO_SLOW,
            "long_freeze": bool(longest and longest.seconds > config.LONG_FREEZE_S),
        },
    }
