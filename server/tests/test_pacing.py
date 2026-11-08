from vojo_speech.analysis.pacing import analyze_pacing, find_pauses
from tests.helpers import words_from


def test_pause_tiers_and_longest():
    w = words_from("one two | three four || five six", wpm=150)
    pauses = find_pauses(w)
    assert len(pauses) == 2
    p = analyze_pacing(w, 15.0)["pauses"]
    assert p["over_1s"] == 2 and p["over_2s"] == 1 and p["over_3s"] == 1
    assert p["longest_s"] > 3.0
    assert p["longest_at_ms"] == pauses[1].start_ms


def test_wpm_and_flags():
    fast = words_from(" ".join(["word"] * 100), wpm=200)
    dur = fast[-1].end_ms / 1000 + 0.3
    r = analyze_pacing(fast, dur)
    assert r["flags"]["rushing"] and not r["flags"]["too_slow"]
    slow = words_from(" ".join(["word"] * 20), wpm=90)
    r2 = analyze_pacing(slow, slow[-1].end_ms / 1000 + 0.3)
    assert r2["flags"]["too_slow"]


def test_long_freeze_flag():
    w = words_from("one two || || three", wpm=150)
    r = analyze_pacing(w, 12.0)
    assert r["flags"]["long_freeze"]
