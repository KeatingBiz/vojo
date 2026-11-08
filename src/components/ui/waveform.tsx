import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

type Props = { level: SharedValue<number>; active: boolean; bars?: number; height?: number; color?: string };

const STEP_MS = 90;

/** Scrolling bar waveform. History lives in a shared value and every bar animates on the UI thread: no React re-renders while recording. */
export function Waveform({ level, active, bars = 28, height = 56, color = colors.accent }: Props) {
  const hist = useSharedValue<number[]>(Array(bars).fill(0));
  useEffect(() => {
    if (!active) {
      hist.set(Array(bars).fill(0));
      return;
    }
    const id = setInterval(() => {
      const v = Math.max(0.06, level.get() + (Math.random() - 0.5) * 0.08);
      hist.set([...hist.get().slice(1), v]);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [active, bars, hist, level]);
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: bars }, (_, i) => (
        <Bar key={i} index={i} bars={bars} hist={hist} height={height} color={color} />
      ))}
    </View>
  );
}

function Bar({ index, bars, hist, height, color }: { index: number; bars: number; hist: SharedValue<number[]>; height: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    height: withTiming(Math.max(4, hist.value[index] * height), { duration: STEP_MS }),
  }));
  return <Animated.View style={[styles.bar, { backgroundColor: color, opacity: 0.35 + 0.65 * (index / bars) }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: 5, borderRadius: 3 },
});
