import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useCallback, useRef, useState } from 'react';

export type ClipStep = { source: number; loop: boolean };

/**
 * Two alternating video players. `go(steps)` plays the steps in order on the hidden player and
 * swaps it to the front the moment its first frame is actually rendering, so there is never a
 * black frame. Calling `go` again mid-route cancels the old route immediately.
 */
export function useClipRoute(initial: number) {
  const a = useVideoPlayer(initial, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.05;
    p.play();
  });
  const b = useVideoPlayer(null, (p) => {
    p.muted = true;
    p.timeUpdateEventInterval = 0.05;
  });
  const [front, setFront] = useState<0 | 1>(0);
  const frontRef = useRef<0 | 1>(0);
  const players = useRef<[VideoPlayer, VideoPlayer]>([a, b]);
  const routeId = useRef(0);
  const subs = useRef<{ remove(): void }[]>([]);

  const go = useCallback((steps: ClipStep[]) => {
    const id = ++routeId.current;
    subs.current.forEach((s) => s.remove());
    subs.current = [];
    const queue = [...steps];

    const next = () => {
      if (id !== routeId.current) return;
      const step = queue.shift();
      if (!step) return;
      const backIdx: 0 | 1 = frontRef.current === 0 ? 1 : 0;
      const player = players.current[backIdx];
      const old = players.current[frontRef.current];
      player.loop = step.loop;

      let swapped = false;
      const swap = () => {
        if (swapped || id !== routeId.current) return;
        swapped = true;
        frontRef.current = backIdx;
        setFront(backIdx);
        setTimeout(() => {
          if (id === routeId.current) old.pause();
        }, 80);
      };
      const tick = player.addListener('timeUpdate', ({ currentTime }) => {
        if (currentTime > 0.04) {
          tick.remove();
          swap();
        }
      });
      subs.current.push(tick);
      if (!step.loop) {
        const end = player.addListener('playToEnd', () => {
          end.remove();
          next();
        });
        subs.current.push(end);
      }
      player.replaceAsync(step.source).then(() => {
        if (id !== routeId.current) return;
        player.currentTime = 0;
        player.play();
      });
    };
    next();
  }, []);

  return { a, b, front, go };
}
