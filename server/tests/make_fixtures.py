"""Make rough test clips with macOS `say` (no fillers survive TTS well; these only exercise the plumbing).
Usage: python tests/make_fixtures.py   → tests/fixtures/*.wav

REAL CLIPS (these are the ones that matter). Record on your phone, ~45-60s each, export as m4a into tests/fixtures/:
  a-fillers.m4a   deliberately full of "um", "uh", "like", "you know"; hand-count the fillers and write the number in the filename, e.g. a-fillers-14.m4a
  b-clean.m4a     clean and steady, natural pauses, pitch falling at the end of sentences
  c-uptalk.m4a    every sentence ends rising, like a question
Then: python eval/run.py tests/fixtures
"""
import os
import shutil
import subprocess

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "fixtures")
CLIPS = {
    "tts-fillers": "Um, so, my favorite color is, uh, blue. Like, it just feels, you know, calm. Um, basically it reminds me of the sea. Uh, yeah.",
    "tts-clean": "My favorite color is blue. It reminds me of the sea on a quiet morning. When I wear it, I feel calm and steady. That is why it feels like me.",
}
if __name__ == "__main__":
    if not shutil.which("say"):
        raise SystemExit("macOS `say` not found; record real clips instead (see docstring).")
    os.makedirs(OUT, exist_ok=True)
    for name, text in CLIPS.items():
        aiff = os.path.join(OUT, f"{name}.aiff")
        subprocess.run(["say", "-r", "160", "-o", aiff, text], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", aiff, "-ac", "1", "-ar", "16000", os.path.join(OUT, f"{name}.wav")], check=True)
        os.unlink(aiff)
        print("wrote", name)
