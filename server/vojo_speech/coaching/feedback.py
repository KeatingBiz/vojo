"""Templated coaching copy for math-only runs (no Claude key) and as the fallback when the model call fails."""
from __future__ import annotations

from pydantic import BaseModel, Field


class FeedbackCopy(BaseModel):
    headline: str
    notes: dict[str, str] = Field(default_factory=dict)   # fillers | pacing | delivery | content
    one_tip: str


def fallback_feedback(numbers: dict) -> FeedbackCopy:
    f, p, pr, s = numbers["fillers"], numbers["pacing"], numbers["prosody"], numbers["scores"]
    up = pr["uptalk"]
    worst = min(("fillers", "pacing", "prosody"), key=lambda k: s[k])
    headline = {"fillers": "Fillers are the lever this time.", "pacing": "Pace is the lever this time.", "prosody": "Delivery is the lever this time."}[worst]
    return FeedbackCopy(
        headline=headline if s["vojo_score"] < 85 else "Clean run. Keep the streak alive.",
        notes={
            "fillers": f"**{f['total']} filler words** in {p['duration_s']:.0f} seconds, **{f['per_minute']:.1f} per minute**." + (" **Pause** instead of filling." if f["total"] > 2 else " Clean."),
            "pacing": f"**{p['wpm']:.0f} words per minute** with **{p['pauses']['over_1s']} pauses** over a second." + (" **Slow down** and breathe." if p["flags"]["rushing"] else " **Pick it up** a little." if p["flags"]["too_slow"] else " Right in the pocket."),
            "delivery": f"Pitch moved **{pr['pitch_variation_semitones']:.1f} semitones**; **{up['rising']} of {up['statements']}** statements ended rising." + (" **Land your sentences.**" if up["ratio"] > 0.15 else ""),
            "content": "Content judgment needs the coach model; measured numbers only this run.",
        },
        one_tip=numbers.get("one_tip") or "**Land each sentence**: let the pitch **fall** on the last word.",
    )
