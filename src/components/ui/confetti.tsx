import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const PALETTE = [colors.accent, colors.accentSoft, colors.primarySoft, colors.cyan, '#FFFFFF'];

function Piece({ seed }: { seed: number }) {
  const rnd = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
  const x0 = rnd(1) * W;
  const drift = (rnd(2) - 0.5) * 160;
  const delay = rnd(3) * 500;
  const dur = 1900 + rnd(4) * 1200;
  const size = 6 + rnd(5) * 8;
  const color = PALETTE[Math.floor(rnd(6) * PALETTE.length)];
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) }));
  }, [t, delay, dur]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.9 ? 1 : (1 - t.value) * 10,
    transform: [
      { translateX: x0 + drift * t.value + Math.sin(t.value * 9 + seed) * 14 },
      { translateY: -40 + (H + 80) * t.value },
      { rotate: `${t.value * 720 * (seed % 2 ? 1 : -1)}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size * 0.6, borderRadius: 2, backgroundColor: color }, style]} />;
}

/** One-shot confetti burst covering the screen. Mount it when there is something to celebrate. */
export function Confetti({ count = 56 }: { count?: number }) {
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {seeds.map((s) => <Piece key={s} seed={s} />)}
    </View>
  );
}
