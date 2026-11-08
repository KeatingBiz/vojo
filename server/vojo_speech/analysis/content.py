"""One Claude Haiku call: content judgment, ambiguous-filler confirmation, and the coaching copy.
Never asks the model about tone or confidence; those come from the audio."""
from __future__ import annotations

import json
import os

from pydantic import BaseModel, Field, ValidationError

from vojo_speech import config
from vojo_speech.analysis.fillers import FillerHit
from vojo_speech.cost import CostLog
from vojo_speech.transcribe import Word

SYSTEM = (
    "You are the coach inside Vojo, a daily speaking-practice app. You receive a prompt, the verbatim transcript of a 60-second "
    "spoken answer, measured numbers from the audio, and a list of ambiguous filler-word candidates.\n\n"
    "Part 1, judge CONTENT only: did they answer the prompt, did the answer have a point, support and an ending, how clear was it. "
    "Never guess at tone, nerves or confidence from text; that is measured elsewhere.\n\n"
    "Part 2, fillers: for each ambiguous candidate (word index with context), return the indices where the word is a verbal filler "
    "(a crutch with no grammatical role) rather than a verb, comparison, conjunction or genuine question. Your final filler total is "
    "CONFIRMED_FILLERS plus the number of candidates you confirm; cite that total in your copy.\n\n"
    "Part 3, coaching copy, kept SHORT because it sits on small cards: a headline of at most 10 words that names the single biggest "
    "takeaway; then one note per category (fillers, pacing, delivery, content), each ONE sentence of at most 22 words that cites a number "
    "you were given, says what it reads as, and what to do; then one specific tip of at most 20 words. In every note and the tip, wrap the "
    "2 to 4 words or numbers a learner most needs to remember in **double asterisks** (the number, the filler word itself, the key "
    "instruction such as **pause** or **land the sentence**). Tone: witty, encouraging, adult. "
    "Never childish, never shaming. Never claim feelings (\"you sounded nervous\"); describe the measurement and what it can read as. "
    "If a category is clean, say so and name the number. Quote only words that appear in the transcript. Respond with JSON only."
)


class Judgment(BaseModel):
    on_topic_score: int = Field(ge=0, le=100)
    on_topic_reason: str
    answered_the_prompt: bool
    structure_score: int = Field(ge=0, le=100)
    structure_notes: str
    clarity_score: int = Field(ge=0, le=100)
    confirmed_filler_indices: list[int]
    best_moment: str
    headline: str
    note_fillers: str
    note_pacing: str
    note_delivery: str
    note_content: str
    one_tip: str


def _context(words: list[Word], i: int, n: int = 4) -> str:
    lo, hi = max(0, i - n), min(len(words), i + n + 1)
    return " ".join((f"[{w.text}]" if k == i else w.text) for k, w in enumerate(words[lo:hi], start=lo))


def judge(prompt: str, transcript: str, words: list[Word], ambiguous: list[FillerHit], measured: dict, cost: CostLog) -> Judgment | None:
    """Returns None when ANTHROPIC_API_KEY is missing so the pipeline can run math-only."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    import anthropic

    client = anthropic.Anthropic()
    cands = "\n".join(f"- index {h.index} ({h.kind}): {_context(words, h.index)}" for h in ambiguous) or "- none"
    user = (
        f"PROMPT:\n{prompt}\n\nTRANSCRIPT (verbatim, with fillers):\n{transcript}\n\n"
        f"MEASUREMENTS (CONFIRMED_FILLERS = {measured['fillers']['total']}):\n{json.dumps(measured, indent=1)}\n\n"
        f"AMBIGUOUS FILLER CANDIDATES:\n{cands}"
    )
    last_err: Exception | None = None
    for _ in range(2):
        try:
            res = client.messages.parse(
                model=config.CLAUDE_MODEL,
                max_tokens=2048,
                thinking={"type": "disabled"},   # Haiku 5.5 thinks by default; off here for latency, the task is small
                system=SYSTEM,
                messages=[{"role": "user", "content": user}],
                output_format=Judgment,
            )
            cost.claude("judge", res.usage.input_tokens, res.usage.output_tokens)
            out = res.parsed_output
            if out is None:
                raise ValueError("empty parse")
            valid = {h.index for h in ambiguous}
            out.confirmed_filler_indices = [i for i in out.confirmed_filler_indices if i in valid]
            return out
        except (ValidationError, ValueError, anthropic.APIStatusError, anthropic.APIConnectionError) as e:
            last_err = e
    raise RuntimeError(f"Judgment failed twice: {last_err}")
