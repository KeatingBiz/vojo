import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = { size: number; stroke?: number; color?: string; children?: React.ReactNode };

/**
 * Indeterminate spinner in the ProgressRing's language: a quarter arc sweeping the track.
 * Transform-only animation, so it never costs a native commit.
 */
export function LoadingRing({ size, stroke = 12, color = colors.primarySoft, children }: Props) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withRepeat(withTiming(360, { duration: 1500, easing: Easing.linear }), -1, false));
  }, [spin]);
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  // 100° arc from the top, round caps.
  const a = (100 * Math.PI) / 180;
  const d = `M ${c} ${stroke / 2} A ${r} ${r} 0 0 1 ${c + r * Math.sin(a)} ${c - r * Math.cos(a)}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={colors.card} strokeWidth={stroke} fill="none" />
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, arc]}>
        <Svg width={size} height={size}><Path d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" /></Svg>
      </Animated.View>
      {children}
    </View>
  );
}
