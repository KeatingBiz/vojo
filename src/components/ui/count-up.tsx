import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { haptic } from '@/lib/haptics';

/** Counts from 0 to `to` with an ease-out curve, ticking haptics as it climbs. Leaf component: nothing else re-renders. */
export function CountUp({ to, duration = 1100, style, delay = 0 }: { to: number; duration?: number; delay?: number; style?: StyleProp<TextStyle> }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: ReturnType<typeof setTimeout>;
    const start = Date.now() + delay;
    let lastTick = 0;
    const step = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart: fast start, long slow-down into the final number
      const v = Math.round(to * eased);
      setN(v);
      if (v - lastTick >= 8) { lastTick = v; haptic.tap(); }
      if (t < 1) raf = setTimeout(step, 33);
      else haptic.press();
    };
    raf = setTimeout(step, Math.max(0, delay));
    return () => clearTimeout(raf);
  }, [to, duration, delay]);
  return <Text style={style}>{n}</Text>;
}
