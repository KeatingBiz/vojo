#!/bin/zsh
# Generate every Mojo loop + transition clip (except idle loop, already done). Runs 3 at a time.
set -u
SCR="$1"; F="$SCR/frames"; OUT="$SCR/clips"; ONLY="${2:-}"
BASE="Smooth, subtle, lifelike motion at a calm pace. The flame tips on its head flicker and sway gently like a candle. The body breathes slowly."
typeset -A LOOP
LOOP[listening]="Listening loop. $BASE It leans a little toward the viewer, eyes attentive and slightly widened, gives one small slow nod, and keeps one arm cupped forward as in the reference. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[thinking]="Thinking loop. $BASE Its eyes glance up and to the side, then back, as it ponders. The hand on its chin taps once gently. One flame tip curls. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[speaking]="Speaking loop, the character is explaining something. $BASE Its raised arm gestures gently as if making a point, its flame stands slightly taller and brighter, eyebrows lift once for emphasis. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[celebrating]="Celebrating loop. $BASE Both arms are raised and wave happily, eyes closed in joy, the flame surges taller and the orange glow inside blazes brightly and pulses. Pure joy, but the base stays planted. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[worried]="Worried loop. $BASE The flame is small and droops, flickering weakly. The character trembles very slightly, eyes darting nervously, the dim orange ember inside pulses faintly. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[extinguished]="Extinguished loop, almost motionless. The character is a dark cold wisp with closed eyes. A thin trail of faint smoke rises slowly from the top. The single tiny ember at the base flickers faintly. Nothing else moves. The last frame must match the first frame exactly so it loops with no visible cut."
TR="Smoothly and naturally morph from the first pose to the second pose over the whole clip, as a continuous performance of the same character. Flame tips keep flickering gently throughout. End exactly on the second pose."

run() { node scripts/gen-mojo-video.mjs "$@" 2>&1 | grep -v '^\s*at ' | tail -1; }
jobs_running() { jobs -r | wc -l | tr -d ' '; }
want() { [ -z "$ONLY" ] || [[ " $ONLY " == *" $1 "* ]]; }
launch() { local name=$(basename "${@[(I)--out]+1}" .mp4); for ((i=1;i<=$#;i++)); do [ "${@[i]}" = "--out" ] && name=$(basename "${@[i+1]}" .mp4); done; want "$name" || return 0; while [ "$(jobs_running)" -ge 3 ]; do sleep 2; done; run "$@" & }

for p in listening thinking speaking celebrating worried extinguished; do
  launch --first "$F/$p.jpg" --last "$F/$p.jpg" --duration 4 --out "$OUT/${p}_loop.mp4" --prompt "${LOOP[$p]}"
  launch --first "$F/idle.jpg" --last "$F/$p.jpg" --duration 3 --out "$OUT/idle_to_${p}.mp4" --prompt "$TR"
  launch --first "$F/$p.jpg" --last "$F/idle.jpg" --duration 3 --out "$OUT/${p}_to_idle.mp4" --prompt "$TR"
done
wait
echo BATCH-DONE; ls -la "$OUT" | awk '{print $5,$9}'
