"""Build word lists with realistic timestamps from a string. '|' = 1.5s pause, '||' = 3s pause."""
from vojo_speech.transcribe import Word


def words_from(text: str, wpm: float = 150.0, start_ms: int = 300) -> list[Word]:
    per_word = 60_000 / wpm
    out, t = [], start_ms
    for tok in text.split():
        if tok == "|":
            t += 1500
            continue
        if tok == "||":
            t += 3000
            continue
        dur = int(per_word * 0.75)
        out.append(Word(text=tok, start_ms=int(t), end_ms=int(t + dur), confidence=0.95))
        t += per_word
    return out
