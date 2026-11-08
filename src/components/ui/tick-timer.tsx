import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

type Props = {
  seconds: number;
  /** Date.now() when the window started. Pass the same instant you started the ring animation. */
  startedAt: number;
  /** 'down' shows seconds remaining (ceil), 'up' shows seconds elapsed (floor). */
  direction?: 'down' | 'up';
  onDone: () => void;
  style?: StyleProp<TextStyle>;
};

/** Reads one wall clock 10x/s inside its own component, so the number tracks the ring and the parent never re-renders. */
export function TickTimer({ seconds, startedAt, direction = 'down', onDone, style }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(false);
  const lastShown = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const remaining = Math.max(0, seconds - elapsed);
  const shown = direction === 'down' ? Math.ceil(remaining) : Math.min(seconds, Math.floor(elapsed));
  useEffect(() => {
    if (lastShown.current !== shown) {
      lastShown.current = shown;
      if (direction === 'down' && (shown === 10 || (shown <= 5 && shown > 0))) haptic.tap();
    }
    if (remaining <= 0 && !done.current) {
      done.current = true;
      onDone();
    }
  }, [shown, remaining, direction, onDone]);
  return <Text style={style}>{shown}</Text>;
}
