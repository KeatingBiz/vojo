import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { ClipLoop } from './clip-loop';
import { Glow } from './glow';

// Node positions as fractions of the 9:16 island image (measured on the rendered frame).
// Order follows the path: sandy cove -> five stone platforms -> the Doubter's shore.
export const NODES = [
  { x: 330 / 720, y: 1020 / 1280 },
  { x: 540 / 720, y: 880 / 1280 },
  { x: 160 / 720, y: 815 / 1280 },
  { x: 355 / 720, y: 690 / 1280 },
  { x: 160 / 720, y: 565 / 1280 },
  { x: 315 / 720, y: 455 / 1280 },
  { x: 470 / 720, y: 270 / 1280 },
];
// Lantern / mushroom spots that release embers (same coordinate space).
const EMBERS = [
  { x: 0.2, y: 0.45 }, { x: 0.44, y: 0.36 }, { x: 0.63, y: 0.52 }, { x: 0.52, y: 0.66 },
  { x: 0.27, y: 0.62 }, { x: 0.33, y: 0.86 }, { x: 0.8, y: 0.47 }, { x: 0.12, y: 0.73 },
];

const WATER = colors.water;
const CLEAR = 'rgba(18,36,61,0)';

function Pulse({ size, color }: { size: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }), -1, false);
  }, [t]);
  const s = useAnimatedStyle(() => ({ opacity: 0.85 * (1 - t.value), transform: [{ scale: 1 + t.value * 1.1 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color }, s]} />;
}

function Ember({ x, y, seed }: { x: number; y: number; seed: number }) {
  const t = useSharedValue(0);
  const dur = 3200 + (seed % 5) * 600;
  useEffect(() => {
    t.value = withDelay((seed * 530) % 2600, withRepeat(withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, dur, seed]);
  const s = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateY: -t.value * 70 }, { translateX: Math.sin(t.value * 6 + seed) * 6 }, { scale: 1 - t.value * 0.5 }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentSoft }, s]} />;
}

/** Slow breathing of the whole island so the still never feels frozen. */
function Breathing({ children, style }: { children: React.ReactNode; style: object }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [t]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.018 * t.value }, { translateY: -4 * t.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

function ShoreGlow({ x, y }: { x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [t]);
  const s = useAnimatedStyle(() => ({ opacity: 0.35 + 0.45 * t.value, transform: [{ scale: 0.95 + 0.12 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 130, top: y - 150 }, s]}>
      <Glow size={260} color={colors.cyan} strength={1.1} />
    </Animated.View>
  );
}

type Props = { width: number; height: number; completed: boolean[]; current: number; onNode: (i: number) => void; onBoss: () => void };

/**
 * The island, full-bleed: the page is water, the island art sits in it with feathered edges and
 * lives through code-driven motion (breathing, pulsing shore glow, rising embers). The week's
 * checkpoints, Mojo and the Doubter are placed on top in their own layer.
 */
export function Island({ width, height, completed, current, onNode, onBoss }: Props) {
  const vidW = width * 1.04;
  const vidH = (vidW * 16) / 9;
  const left = (width - vidW) / 2;
  const top = (height - vidH) / 2 + height * 0.015;
  const px = (f: number) => left + f * vidW;
  const py = (f: number) => top + f * vidH;

  return (
    <View style={{ width, height, backgroundColor: WATER, overflow: 'hidden' }}>
      <Breathing style={{ position: 'absolute', left, top, width: vidW, height: vidH }}>
        <Image source={require('@/assets/journey/island-still.jpg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient pointerEvents="none" colors={[WATER, CLEAR]} style={{ position: 'absolute', left: 0, top: 0, width: vidW, height: vidH * 0.1 }} />
        <LinearGradient pointerEvents="none" colors={[CLEAR, WATER]} style={{ position: 'absolute', left: 0, top: vidH * 0.94, width: vidW, height: vidH * 0.06 }} />
        <LinearGradient pointerEvents="none" colors={[WATER, CLEAR]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, top: 0, width: vidW * 0.04, height: vidH }} />
        <LinearGradient pointerEvents="none" colors={[CLEAR, WATER]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: vidW * 0.96, top: 0, width: vidW * 0.04, height: vidH }} />
      </Breathing>

      <ShoreGlow x={px(NODES[6].x)} y={py(NODES[6].y)} />
      {EMBERS.map((e, i) => <Ember key={i} x={px(e.x)} y={py(e.y)} seed={i + 1} />)}

      <View style={[StyleSheet.absoluteFill, { zIndex: 5 }]} pointerEvents="box-none">
        {NODES.slice(0, 6).map((n, i) => {
          const done = completed[i];
          const isNow = i === current;
          const locked = i > current;
          const d = isNow ? 62 : 52;
          const fill = done ? colors.accent : isNow ? colors.primary : 'rgba(28,26,58,0.9)';
          const ring = done ? colors.accentSoft : isNow ? colors.accent : 'rgba(255,255,255,0.28)';
          return (
            <Pressable
              key={i}
              onPress={() => {
                if (locked) haptic.warn();
                else haptic.press();
                onNode(i);
              }}
              style={{ position: 'absolute', left: px(n.x) - d / 2, top: py(n.y) - d / 2, width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
              {(done || isNow) && (
                <View pointerEvents="none" style={{ position: 'absolute' }}>
                  <Glow size={d * 2.2} />
                </View>
              )}
              {isNow && <Pulse size={d} color={colors.accent} />}
              <View style={[styles.node, { width: d * 0.74, height: d * 0.74, borderRadius: d, borderColor: ring, backgroundColor: fill, opacity: locked ? 0.7 : 1 }]}>
                {done ? <Text style={styles.check}>✓</Text> : <Text style={[styles.num, locked && { color: colors.muted }]}>{i + 1}</Text>}
              </View>
            </Pressable>
          );
        })}

        {/* The Doubter, standing on his shore. */}
        <Pressable
          onPress={() => {
            haptic.heavy();
            onBoss();
          }}
          style={{ position: 'absolute', left: px(NODES[6].x) - 60, top: py(NODES[6].y) - 150, width: 120, height: 170, alignItems: 'center', justifyContent: 'flex-end' }}>
          {current === 6 && <View style={{ position: 'absolute', bottom: 0 }}><Pulse size={70} color={colors.cyan} /></View>}
          <ClipLoop source={require('@/assets/bosses/doubter/video/idle.mov')} width={104} height={127} />
        </Pressable>

        <View pointerEvents="none" style={{ position: 'absolute', left: px(NODES[current].x) - 42, top: py(NODES[current].y) - 78 }}>
          <ClipLoop source={current === 6 ? require('@/assets/mojo/video/worried.mov') : require('@/assets/mojo/video/idle.mov')} width={84} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  node: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  check: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  num: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.text },
});
