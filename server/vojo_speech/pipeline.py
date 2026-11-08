"""Orchestrates: normalize → transcribe → fillers/pacing/prosody (the MEASURE stage, pure math)
→ one Claude call for content + ambiguous fillers + coaching copy (the JUDGE stage) → scores."""
from __future__ import annotations

import tempfile
import time
from dataclasses import dataclass

from vojo_speech import config
from vojo_speech.analysis import pacing as pacing_mod
from vojo_speech.analysis import prosody as prosody_mod
from vojo_speech.analysis.content import judge
from vojo_speech.analysis.fillers import FillerHit, count_fillers, first_pass
from vojo_speech.analysis.score import combine
from vojo_speech.audio.normalize import normalize
from vojo_speech.coaching.feedback import fallback_feedback
from vojo_speech.cost import CostLog
from vojo_speech.transcribe import Transcript, Word, get_transcriber


@dataclass
class Measured:
    transcript: Transcript
    words: list[Word]
    duration: float
    ambiguous: list[FillerHit]
    pacing: dict
    prosody: dict
    timings: dict
    cost: CostLog

    def payload(self, confirmed: list[int] | None = None, content: dict | None = None) -> dict:
        fillers = count_fillers(self.words, self.duration, confirmed)
        scores = combine(fillers.to_dict(), self.pacing, self.prosody, content)
        filler_idx = {h.index + k for h in fillers.hits for k in range(h.span)}
        return {
            "duration_s": round(self.duration, 2),
            "transcript": self.transcript.text,
            "provider": self.transcript.provider,
            "words": [{"text": w.text, "start_ms": w.start_ms, "end_ms": w.end_ms, "is_filler": i in filler_idx} for i, w in enumerate(self.words)],
            "fillers": fillers.to_dict(),
            "pacing": self.pacing,
            "prosody": self.prosody,
            "scores": scores,
        }


def measure(src_path: str, transcriber=None, transcript: Transcript | None = None) -> Measured:
    timings: dict[str, float] = {}
    cost = CostLog()
    t = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="vojo-") as tmp:
        audio = normalize(src_path, tmp)
        timings["normalize_s"] = round(time.perf_counter() - t, 3)
        t = time.perf_counter()
        if transcript is None:
            transcriber = transcriber or get_transcriber()
            transcript = transcriber.transcribe(audio.path)
            cost.transcription(transcript.provider, audio.duration_s)
        timings["transcribe_s"] = round(time.perf_counter() - t, 3)
        t = time.perf_counter()
        _, ambiguous = first_pass(transcript.words)
        pacing = pacing_mod.analyze_pacing(transcript.words, audio.duration_s)
        prosody = prosody_mod.analyze_prosody(audio.path, audio.samples, audio.sample_rate, transcript.words, audio.duration_s)
        timings["analysis_s"] = round(time.perf_counter() - t, 3)
    return Measured(transcript, transcript.words, audio.duration_s, ambiguous, pacing, prosody, timings, cost)


def finish(m: Measured, prompt: str, use_llm: bool = True) -> dict:
    """Run the judge stage and assemble the final scorecard."""
    t = time.perf_counter()
    # Numbers the model may cite. Fillers here = confirmed-only; the model adds the candidates it confirms.
    provisional = m.payload(confirmed=[])
    measured_for_model = {
        "fillers": provisional["fillers"],
        "pacing": {k: v for k, v in m.pacing.items() if k != "wpm_windows"},
        "prosody": {k: v for k, v in m.prosody.items() if k != "energy"},
    }
    judgment = judge(prompt, m.transcript.text, m.words, m.ambiguous, measured_for_model, m.cost) if use_llm else None
    m.timings["judge_s"] = round(time.perf_counter() - t, 3)
    if judgment:
        content = judgment.model_dump(exclude={"headline", "note_fillers", "note_pacing", "note_delivery", "note_content"})
        out = m.payload(confirmed=judgment.confirmed_filler_indices, content=content)
        out["content"] = content
        out["feedback"] = {
            "headline": judgment.headline,
            "notes": {"fillers": judgment.note_fillers, "pacing": judgment.note_pacing, "delivery": judgment.note_delivery, "content": judgment.note_content},
            "one_tip": judgment.one_tip,
        }
    else:
        out = m.payload(confirmed=None, content=None)   # pause-based fallback for ambiguous words
        out["content"] = None
        out["feedback"] = fallback_feedback({**out, "one_tip": None}).model_dump()
    out["meta"] = {"timings": m.timings, "cost": m.cost.to_dict(), "model": config.CLAUDE_MODEL}
    return out


def analyze_file(src_path: str, prompt: str, transcriber=None, transcript: Transcript | None = None, use_llm: bool = True) -> dict:
    """One-shot: measure then finish. Used by the eval script and tests."""
    return finish(measure(src_path, transcriber, transcript), prompt, use_llm)
