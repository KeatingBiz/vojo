"""Every tunable threshold lives here. Change numbers, not code, when the eval table says a curve is off."""

# ---- audio ----
SAMPLE_RATE = 16_000
MIN_CLIP_SECONDS = 5.0           # shorter than this cannot be graded fairly
MAX_CLIP_SECONDS = 180.0         # the app caps at 60s; 3 min is a generous ceiling
SILENT_RMS = 0.004               # mean RMS (0..1 full scale) below this = silent clip, reject before paying for transcription

# ---- fillers ----
SOUND_FILLERS = {"um", "uh", "hmm", "mhm", "ah", "er", "hm", "uhm", "umm", "erm", "mm"}
WORD_FILLERS = {"basically", "literally", "actually"}
PHRASE_FILLERS = [("you", "know"), ("kind", "of"), ("sort", "of"), ("i", "mean")]
# "like", "so" (sentence-initial), "right" (tag) are ambiguous: heuristics first, then the LLM confirms.
# Words before "like" that mark it as a verb or comparison, never a filler.
LIKE_VERB_PREV = {"i", "you", "we", "they", "he", "she", "it", "people", "would", "d", "really", "dont", "don't",
                  "do", "does", "did", "didnt", "didn't", "looks", "look", "looked", "feels", "feel", "felt", "sounds", "sound",
                  "seems", "seem", "seemed", "something", "anything", "nothing", "things", "much", "more", "just", "not", "to"}
# A pause this long on either side of an ambiguous word is a strong filler signal when no LLM is available.
AMBIGUOUS_PAUSE_MS = 250

# ---- pacing ----
PAUSE_MIN_MS = 300               # gaps shorter than this are articulation, not pauses
PAUSE_TIERS_S = (1.0, 2.0, 3.0)  # reported counts of pauses longer than each tier
LONG_FREEZE_S = 4.0
WPM_RUSHING = 190
WPM_TOO_SLOW = 110
WPM_IDEAL = (130, 170)           # full marks inside this band
WPM_WINDOW_S = 10                # windowed WPM for rushing-early / trailing-late detection

# ---- prosody ----
PITCH_FLOOR_HZ = 75
PITCH_CEILING_HZ = 500
PITCH_TIME_STEP_S = 0.01
MONOTONE_ST = 1.5                # F0 std dev in semitones below this = monotone
UPTALK_TAIL_S = 0.40             # final voiced window of each statement that gets a slope fit
UPTALK_MIN_FRAMES = 4            # fewer voiced frames than this = cannot classify, skipped
UPTALK_RISE_ST_PER_S = 4.0       # slope above this = rising; below the negative = falling
DRIFT_WINDOW_S = 15.0            # first vs last window for the nervous-climb measure
ENERGY_FRAME_S = 0.02

# ---- scoring curves (documented in analysis/score.py) ----
WEIGHTS = {"fillers": 0.30, "pacing": 0.25, "prosody": 0.25, "content": 0.20}
FILLERS_PER_MIN_FREE = 1.0       # up to this many per minute costs nothing
FILLERS_PER_MIN_ZERO = 12.0      # this rate scores 0
PAUSES_PER_MIN_IDEAL = (1.0, 4.0)
VARIATION_FULL_ST = 2.5
VARIATION_ZERO_ST = 0.3
UPTALK_RATIO_FREE = 0.15
UPTALK_RATIO_ZERO = 0.75

# ---- models & cost (USD). Verify against provider pricing pages; these feed the per-request cost log only ----
CLAUDE_MODEL = "claude-haiku-5-5"
CLAUDE_IN_PER_MTOK = 0.10
CLAUDE_OUT_PER_MTOK = 0.50
DEEPGRAM_PER_MIN = 0.0077        # nova-3 pay-as-you-go
ASSEMBLYAI_PER_MIN = 0.0025      # universal, pay-as-you-go
