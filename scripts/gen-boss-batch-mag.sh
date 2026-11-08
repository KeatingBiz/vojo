#!/bin/zsh
set -u
SCR="$1"; F="$SCR/bframes_mag"; OUT="$SCR/bclips_mag"; mkdir -p "$OUT"
export MOJO_GUARDS=" The character is a tall blob of dark glassy water with a hooded wave crest, glowing cyan slit eyes, and two long thin arms. It has NO legs and NO feet, never grows legs, never walks, hops, jumps or travels. Its wide puddle base stays planted in the same spot for the entire clip and it stays centered in frame. Locked camera: no zoom, no pan, no cut. Plain solid bright magenta background exactly like the reference, perfectly flat and uniform, no gradient, no vignette, no particles, no splashes, no droplets, no mist, no light flares, no text. No sound, silent clip."
BASE="Smooth, slow, menacing motion. Its liquid surface ripples subtly like disturbed water. The cold cyan light in its chest pulses slowly."
typeset -A LOOP
LOOP[idle]="Idle loop. $BASE It stands tall and still, the hooded crest sways very slightly, the glowing eyes narrow a little then relax, long arms hang almost motionless. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[taunting]="Taunting loop. $BASE It leans forward over the viewer, the raised open hand turns slowly as if asking for proof, the glowing smirk widens briefly, the crest curls further. The last frame must match the first frame exactly so it loops with no visible cut."
LOOP[defeated]="Defeated loop. $BASE It is collapsed into a puddle, wide round eyes blinking in surprise, the flopped crest drips slowly, hands flat on the ground twitching weakly, chest light flickering faintly. The last frame must match the first frame exactly so it loops with no visible cut."
TR="Smoothly and naturally morph from the first pose to the second pose over the whole clip, as a continuous performance of the same character. Its liquid surface ripples gently throughout. End exactly on the second pose."
run() { node scripts/gen-mojo-video.mjs "$@" 2>&1 | grep -v '^\s*at ' | tail -1; }
jobs_running() { jobs -r | wc -l | tr -d ' '; }
launch() { while [ "$(jobs_running)" -ge 3 ]; do sleep 2; done; run "$@" & }
for p in idle taunting defeated; do launch --first "$F/$p.jpg" --last "$F/$p.jpg" --duration 4 --out "$OUT/${p}_loop.mp4" --prompt "${LOOP[$p]}"; done
launch --first "$F/idle.jpg" --last "$F/taunting.jpg" --duration 3 --out "$OUT/idle_to_taunting.mp4" --prompt "$TR"
launch --first "$F/taunting.jpg" --last "$F/idle.jpg" --duration 3 --out "$OUT/taunting_to_idle.mp4" --prompt "$TR"
launch --first "$F/taunting.jpg" --last "$F/defeated.jpg" --duration 3 --out "$OUT/taunting_to_defeated.mp4" --prompt "$TR"
wait; echo BOSS-BATCH-DONE; ls -la "$OUT" | awk '{print $5,$9}'
