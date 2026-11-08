from vojo_speech.analysis.fillers import count_fillers, first_pass
from tests.helpers import words_from


def test_sound_and_phrase_fillers_counted():
    w = words_from("Um, so I think, you know, the best part was, uh, the food. Basically it was great.")
    r = count_fillers(w, 10.0, confirmed_indices=[])
    assert r.per_filler["um"] == 1
    assert r.per_filler["uh"] == 1
    assert r.per_filler["you know"] == 1
    assert r.per_filler["basically"] == 1
    assert r.total == 4


def test_like_as_verb_is_never_a_filler():
    w = words_from("I like pizza. It looks like rain. They like it.")
    hits, ambiguous = first_pass(w)
    assert hits == []
    assert ambiguous == []


def test_like_after_um_is_always_a_filler():
    w = words_from("It was, um, like, a big deal.")
    hits, _ = first_pass(w)
    assert [h.text for h in hits] == ["um,", "like,"]


def test_ambiguous_like_goes_to_llm_and_pause_fallback():
    w = words_from("It was | like a big deal.")
    hits, ambiguous = first_pass(w)
    assert hits == [] and len(ambiguous) == 1
    # no LLM: the pause before it makes it a filler
    assert count_fillers(w, 10.0).total == 1
    # LLM said no
    assert count_fillers(w, 10.0, confirmed_indices=[]).total == 0
    # LLM said yes
    assert count_fillers(w, 10.0, confirmed_indices=[ambiguous[0].index]).total == 1


def test_sentence_initial_so_is_ambiguous_only():
    w = words_from("So I went home. It was so hot.")
    _, ambiguous = first_pass(w)
    assert [a.text for a in ambiguous] == ["So"]


def test_rates():
    w = words_from("um um um um um um um um um um")  # 10 fillers
    r = count_fillers(w, 60.0, confirmed_indices=[])
    assert r.per_minute == 10
    assert r.per_100_words == 100
