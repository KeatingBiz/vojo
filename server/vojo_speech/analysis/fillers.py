"""Filler-word counting from a word-timestamped transcript. Deterministic; the LLM only resolves flagged ambiguities."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from vojo_speech import config
from vojo_speech.transcribe import Word

_PUNCT = re.compile(r"[^\w']+")


def norm(text: str) -> str:
    return _PUNCT.sub("", text.lower()).replace("'", "")


def ends_sentence(text: str) -> bool:
    return text.rstrip().endswith((".", "?", "!"))


@dataclass
class FillerHit:
    index: int
    text: str
    kind: str            # sound | word | phrase | like | so | right
    start_ms: int
    end_ms: int
    span: int = 1        # words covered (2 for "you know")


@dataclass
class FillerReport:
    total: int
    per_filler: dict[str, int]
    per_minute: float
    per_100_words: float
    hits: list[FillerHit]
    ambiguous: list[FillerHit] = field(default_factory=list)   # candidates awaiting LLM confirmation
    word_count: int = 0

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "per_filler": self.per_filler,
            "per_minute": round(self.per_minute, 2),
            "per_100_words": round(self.per_100_words, 2),
            "timestamps": [{"index": h.index, "text": h.text, "kind": h.kind, "start_ms": h.start_ms, "end_ms": h.end_ms} for h in self.hits],
            "ambiguous_pending": len(self.ambiguous),
        }


def _gap_before(words: list[Word], i: int) -> int:
    return words[i].start_ms - words[i - 1].end_ms if i > 0 else 10_000


def _gap_after(words: list[Word], i: int) -> int:
    return words[i + 1].start_ms - words[i].end_ms if i + 1 < len(words) else 10_000


def first_pass(words: list[Word]) -> tuple[list[FillerHit], list[FillerHit]]:
    """Return (confirmed hits, ambiguous candidates)."""
    toks = [norm(w.text) for w in words]
    hits: list[FillerHit] = []
    ambiguous: list[FillerHit] = []
    i = 0
    while i < len(words):
        t = toks[i]
        w = words[i]
        # phrases first
        if i + 1 < len(words):
            pair = (t, toks[i + 1])
            if pair in config.PHRASE_FILLERS:
                hits.append(FillerHit(i, f"{words[i].text} {words[i+1].text}", "phrase", w.start_ms, words[i + 1].end_ms, span=2))
                i += 2
                continue
        if t in config.SOUND_FILLERS:
            hits.append(FillerHit(i, w.text, "sound", w.start_ms, w.end_ms))
        elif t in config.WORD_FILLERS:
            hits.append(FillerHit(i, w.text, "word", w.start_ms, w.end_ms))
        elif t == "like":
            prev = toks[i - 1] if i > 0 else ""
            if prev in config.LIKE_VERB_PREV:
                pass                                     # "I like", "looks like": never a filler
            elif i > 0 and toks[i - 1] in config.SOUND_FILLERS:
                hits.append(FillerHit(i, w.text, "like", w.start_ms, w.end_ms))   # "um, like" is always filler
            else:
                ambiguous.append(FillerHit(i, w.text, "like", w.start_ms, w.end_ms))
        elif t == "so":
            sentence_initial = i == 0 or ends_sentence(words[i - 1].text) or _gap_before(words, i) >= config.AMBIGUOUS_PAUSE_MS * 2
            if sentence_initial:
                ambiguous.append(FillerHit(i, w.text, "so", w.start_ms, w.end_ms))
        elif t == "right":
            is_tag = w.text.rstrip().endswith("?") or (ends_sentence(w.text) and i > 0 and not ends_sentence(words[i - 1].text) and toks[i - 1] not in {"the", "a", "my", "your", "turn"})
            if is_tag:
                ambiguous.append(FillerHit(i, w.text, "right", w.start_ms, w.end_ms))
        i += 1
    return hits, ambiguous


def resolve_without_llm(words: list[Word], ambiguous: list[FillerHit]) -> list[FillerHit]:
    """Fallback when Claude is unavailable: a pause on either side makes the candidate a filler."""
    out = []
    for h in ambiguous:
        if _gap_before(words, h.index) >= config.AMBIGUOUS_PAUSE_MS or _gap_after(words, h.index) >= config.AMBIGUOUS_PAUSE_MS:
            out.append(h)
    return out


def build_report(words: list[Word], hits: list[FillerHit], ambiguous: list[FillerHit], duration_s: float) -> FillerReport:
    hits = sorted(hits, key=lambda h: h.index)
    per: dict[str, int] = {}
    for h in hits:
        key = norm(h.text) if h.kind != "phrase" else " ".join(norm(p) for p in h.text.split())
        per[key] = per.get(key, 0) + 1
    minutes = max(duration_s, 1.0) / 60.0
    n = len(words)
    return FillerReport(
        total=len(hits),
        per_filler=dict(sorted(per.items(), key=lambda kv: -kv[1])),
        per_minute=len(hits) / minutes,
        per_100_words=(len(hits) / n * 100) if n else 0.0,
        hits=hits,
        ambiguous=ambiguous,
        word_count=n,
    )


def count_fillers(words: list[Word], duration_s: float, confirmed_indices: list[int] | None = None) -> FillerReport:
    """`confirmed_indices` = the ambiguous candidates the LLM judged to be fillers. None = no LLM, use the pause fallback."""
    hits, ambiguous = first_pass(words)
    if confirmed_indices is None:
        extra = resolve_without_llm(words, ambiguous)
    else:
        keep = set(confirmed_indices)
        extra = [h for h in ambiguous if h.index in keep]
    return build_report(words, hits + extra, ambiguous, duration_s)
