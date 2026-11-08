#!/bin/zsh
# gen-until-fit.sh <scratch> <name> <firstPose> <lastPose> <duration> <prompt>
# Generates up to 3 times, keeps the first clip whose first/last character height is within 0.9..1.12 of the references.
set -u
SCR="$1"; NAME="$2"; A="$3"; B="$4"; DUR="$5"; PROMPT="$6"; LO="${7:-0.9}"; HI="${8:-1.12}"; F="$SCR/frames"; OUT="$SCR/clips"
for try in 1 2 3; do
  tmp="$OUT/${NAME}.try$try.mp4"
  node scripts/gen-mojo-video.mjs --first "$F/$A.jpg" --last "$F/$B.jpg" --duration "$DUR" --out "$tmp" --prompt "$PROMPT" 2>&1 | grep -vE '^\s+at |^Node.js|^$' | tail -2
  [ -s "$tmp" ] || { echo "$NAME try$try: no file"; sleep 20; continue; }
  r=$(python3 scripts/measure-clip.py "$tmp" "$F/$A.jpg" "$F/$B.jpg")
  echo "$NAME try$try ratios: $r"
  ok=$(python3 -c "a,b=map(float,'$r'.split()); print(int($LO<=a<=$HI and $LO<=b<=$HI))")
  if [ "$ok" = "1" ]; then mv "$tmp" "$OUT/$NAME.mp4"; echo "$NAME KEPT try$try"; exit 0; fi
done
echo "$NAME FAILED all tries"; exit 1
