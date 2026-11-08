# Vojo speech analysis service

`POST /analyze` takes a recorded answer plus the prompt and streams a scorecard as two NDJSON lines: the measured numbers
(about 3s after upload) and then the full scorecard with coaching copy (one merged Claude call, 2 to 4s later). Add `?stream=false` for a single JSON body. Measurable things (fillers, pace, pauses, pitch, uptalk)
are deterministic math on the audio. Claude Haiku only judges content and writes the coaching copy.

## Setup

```bash
cd server
uv venv --python 3.12 .venv && uv pip install -p .venv/bin/python -r requirements-dev.txt
cp .env.example .env      # fill in keys (see below)
```

Keys (`.env` locally, Vercel env vars in prod):

| var | needed for |
|---|---|
| `DEEPGRAM_API_KEY` **or** `ASSEMBLYAI_API_KEY` | transcription with word timestamps and fillers kept. Deepgram is used when both exist (faster). `TRANSCRIBER=assemblyai` forces the other. |
| `ANTHROPIC_API_KEY` | content judgment + feedback copy. Without it the service runs math-only and uses templated copy. |
| `VOJO_API_SECRET` | optional; when set every request must send `X-Vojo-Key`. |

## Run locally

```bash
set -a; source .env; set +a
.venv/bin/uvicorn main:app --reload --port 8099
curl -F audio=@tests/fixtures/b-clean.m4a -F prompt="What is your favorite color?" localhost:8099/analyze | jq .scores
```

## Tests and eval

```bash
.venv/bin/python -m pytest -q                 # no network, no keys
.venv/bin/python tests/make_fixtures.py       # rough TTS clips (plumbing only)
.venv/bin/python eval/run.py tests/fixtures   # table across every clip; add --no-llm to skip Claude
```

Record three real clips on your phone (about a minute each) and drop them in `tests/fixtures/`:
`a-fillers-<handcount>.m4a` (stuffed with um/uh/like), `b-clean.m4a` (steady, sentences land), `c-uptalk.m4a` (every sentence rises).
The eval table should separate them on the `fill`, `pitch sd` and `uptalk` columns. Transcripts are cached under `eval/out/` so re-runs are free.

## Tuning

Every threshold and scoring curve constant is in `vojo_speech/config.py` with a comment. Curves are documented in `vojo_speech/analysis/score.py`.
`confidence` is derived only from measured signals (filler rate, pauses, pitch variation, uptalk ratio). The LLM never produces it.

## Deploy

```bash
vercel          # preview
vercel --prod
```

`vercel.json` uses the FastAPI preset: `main.py` exports `app`. ffmpeg comes from the `imageio-ffmpeg` wheel when the system binary is missing.

## Output shape

See `vojo_speech/pipeline.py` → `analyze_file`. Top level: `duration_s, transcript, words[] (with is_filler), fillers, pacing, prosody, content, scores, feedback, meta (timings + cost)`.
