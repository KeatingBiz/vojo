import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { Glow } from '@/components/glow';
import { colors, fonts } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type Props = { from?: number; onDone: () => void };

/** 3, 2, 1 in big orange numerals with a glow pulse behind each beat. */
export function Countdown({ from = 3, onDone }: Props) {
  const [n, setN] = useState(from);
  const pulse = useSharedValue(0);

  useEffect(() => {
    haptic.press();
    pulse.set(0);
    pulse.set(withSequence(withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }), withTiming(0.25, { duration: 700 })));
    const id = setTimeout(() => {
      if (n <= 1) onDone();
      else setN(n - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [n, onDone, pulse]);

  const glow = useAnimatedStyle(() => ({ opacity: pulse.value, transform: [{ scale: 0.8 + pulse.value * 0.5 }] }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.glow, glow]}><Glow size={320} /></Animated.View>
      <Animated.Text key={n} entering={ZoomIn.springify().damping(12).stiffness(220)} exiting={FadeOut.duration(180)} style={styles.num}>
        {n}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 320, height: 320 },
  glow: { position: 'absolute' },
  num: { fontFamily: fonts.displayBold, fontSize: 160, lineHeight: 176, color: colors.accent, textShadowColor: 'rgba(249,115,22,0.55)', textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
});
