#!/bin/zsh
# Regenerate the whole Mojo set through the size-checked generator, 3 at a time.
set -u
SCR="$1"
BASE="Smooth, subtle, lifelike motion at a calm pace. The flame tips on its head flicker and sway gently like a candle. The body breathes slowly."
LOOPEND="The last frame must match the first frame exactly so it loops with no visible cut."
TR="Smoothly and naturally morph from the first pose to the second pose over the whole clip, as a continuous performance of the same character. Flame tips keep flickering gently throughout. End exactly on the second pose."
typeset -A LOOP
LOOP[idle]="Seamless idle loop. $BASE It blinks once naturally near the middle of the clip. The warm orange glow inside the lower body pulses softly. $LOOPEND"
LOOP[listening]="Listening loop. $BASE It tilts its head slightly, eyes attentive and a little widened, gives one small slow nod, and keeps one arm cupped forward as in the reference. $LOOPEND"
LOOP[thinking]="Thinking loop. $BASE Its eyes glance up and to the side, then back, as it ponders. The hand on its chin taps once gently. One flame tip curls. $LOOPEND"
LOOP[speaking]="Speaking loop, the character is explaining something with gestures only. $BASE Its raised arm gestures gently as if making a point, its flame stands slightly taller and brighter, eyebrows lift once for emphasis. $LOOPEND"
LOOP[celebrating]="Celebrating loop. $BASE Both arms are raised and wave happily, eyes closed in two happy arcs, the flame surges taller and the orange glow inside blazes brightly and pulses. Pure joy, but the base stays planted. $LOOPEND"
LOOP[worried]="Worried loop. $BASE The flame is small and droops, flickering weakly. The character trembles very slightly, eyes darting nervously, the dim orange ember inside pulses faintly. $LOOPEND"
LOOP[extinguished]="Extinguished loop, almost motionless. The character is a dark cold wisp with closed eyes. A thin trail of faint smoke rises slowly from the top. The single tiny ember at the base flickers faintly. Nothing else moves. $LOOPEND"
LOOP[hop]="Hop-in-place loop. The character does two happy little hops straight up and down, staying in exactly the same spot: it squashes down like soft jelly, springs straight up a short distance with its flame tips stretching upward, then lands back on the same spot with a soft squash and settles. The whole body lifts as one blob. Eyes bright and cheerful, small arms lift slightly on each hop. $LOOPEND"
jobs_running() { jobs -r | wc -l | tr -d ' '; }
launch() { while [ "$(jobs_running)" -ge 3 ]; do sleep 2; done; ./scripts/gen-until-fit.sh "$SCR" "$@" & }
for p in idle listening thinking speaking celebrating worried extinguished; do launch ${p}_loop $p $p 4 "${LOOP[$p]}"; done
launch hop_loop idle idle 4 "${LOOP[hop]}"
for p in listening thinking speaking celebrating worried extinguished; do
  launch idle_to_$p idle $p 3 "$TR"
  launch ${p}_to_idle $p idle 3 "$TR"
done
launch thinking_to_listening thinking listening 3 "Smoothly and naturally morph from the first pose to the second pose over the whole clip, as a continuous performance of the same character: it finishes its thought, drops the hand from its chin, and tilts its head attentively. Flame tips keep flickering gently throughout. End exactly on the second pose."
wait; echo ALL-DONE
