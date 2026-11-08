import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Glow } from './glow';

export type MojoPose =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'celebrating'
  | 'worried'
  | 'extinguished'
  | 'hop';

const SOURCES: Record<MojoPose, number> = {
  idle: require('@/assets/mojo/idle.png'),
  listening: require('@/assets/mojo/listening.png'),
  thinking: require('@/assets/mojo/thinking.png'),
  speaking: require('@/assets/mojo/speaking.png'),
  celebrating: require('@/assets/mojo/celebrating.png'),
  worried: require('@/assets/mojo/worried.png'),
  extinguished: require('@/assets/mojo/extinguished.png'),
  hop: require('@/assets/mojo/idle.png'),
};

// Animated loops (transparent WebP, 24fps, seamless). Poses without a loop fall back to the still.
const LOOPS: Partial<Record<MojoPose, number>> = {
  idle: require('@/assets/mojo/video/idle.webp'),
};

// How bright the inner glow sits for each mood, before any live input (mic) is added.
const GLOW: Record<MojoPose, number> = {
  idle: 0.55,
  listening: 0.65,
  thinking: 0.45,
  speaking: 0.7,
  celebrating: 1,
  worried: 0.2,
  extinguished: 0,
  hop: 0.7,
};

type Props = {
  pose?: MojoPose;
  size?: number;
  /** Optional 0..1 live energy (e.g. mic level) layered on top of the mood glow. */
  energy?: number;
};

export function Mojo({ pose = 'idle', size = 260, energy = 0 }: Props) {
  const breath = useSharedValue(0);
  const glow = useSharedValue(GLOW[pose]);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breath]);

  useEffect(() => {
    const target = Math.min(1, GLOW[pose] + energy * 0.5);
    glow.value = withTiming(target, { duration: pose === 'celebrating' ? 250 : 500 });
  }, [pose, energy, glow]);

  const hasLoop = LOOPS[pose] != null;

  const bodyStyle = useAnimatedStyle(() => {
    // A loop already breathes on its own; only synthesize breathing for stills.
    if (hasLoop) return { transform: [{ translateY: 0 }, { scaleY: 1 }, { scaleX: 1 }] };
    const lift = pose === 'celebrating' ? 1.5 : 1;
    return {
      transform: [
        { translateY: -3 * breath.value * lift },
        { scaleY: 1 + 0.025 * breath.value * lift },
        { scaleX: 1 - 0.012 * breath.value },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (0.75 + 0.25 * breath.value),
    transform: [{ scale: 0.9 + 0.15 * glow.value + 0.06 * breath.value }],
  }));

  const glowSize = size * 0.62;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle, { bottom: size * 0.02 }]}>
        <Glow size={glowSize * 1.9} />
      </Animated.View>
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Image
          source={LOOPS[pose] ?? SOURCES[pose]}
          autoplay
          style={{ width: size, height: size }}
          contentFit="contain"
          transition={220}
          accessibilityLabel={`Mojo, ${pose}`}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
