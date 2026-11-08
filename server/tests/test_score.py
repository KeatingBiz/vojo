from vojo_speech.analysis.score import combine, fillers_score, pauses_score, uptalk_score, variation_score, wpm_score


def test_curves_reward_healthy_ranges_not_extremes():
    assert fillers_score(0) == 100 and fillers_score(1) == 100
    assert 40 < fillers_score(6) < 60
    assert fillers_score(12) == 0
    assert wpm_score(150) == 100 and wpm_score(120) == 75
    assert pauses_score(2, 0, 0, False) == 100
    assert pauses_score(0, 0, 0, False) == 90          # zero pauses is NOT better than a few
    assert pauses_score(2, 1, 0, True) < 80
    assert variation_score(3.0) == 100 and variation_score(0.3) == 0
    assert uptalk_score(0.1, 12) == 100 and uptalk_score(0.6, 12) < 40
    assert uptalk_score(1.0, 1) == 85                   # too few statements to judge


def test_combine_renormalizes_without_content():
    fillers = {"per_minute": 0.5}
    pacing = {"wpm": 150, "pauses": {"per_minute_over_1s": 2, "over_2s": 0, "over_3s": 0}, "flags": {"long_freeze": False}}
    prosody = {"pitch_variation_semitones": 3.0, "uptalk": {"ratio": 0.1, "statements": 10}}
    s = combine(fillers, pacing, prosody, None)
    assert s["content"] is None and s["vojo_score"] == 100 and s["confidence"] == 100
    s2 = combine(fillers, pacing, prosody, {"on_topic_score": 50, "structure_score": 50, "clarity_score": 50})
    assert s2["content"] == 50 and s2["vojo_score"] == 90
