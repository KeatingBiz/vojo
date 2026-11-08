import { VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { Glow } from './glow';
import { GroundShadow } from './ground-shadow';
import type { MojoPose } from './mojo';
import { useClipRoute, type ClipStep } from './use-clip-route';

export type { MojoPose };

// Transparent HEVC loops + transitions. Idle is the hub: every state is reached via idle.
const LOOP: Record<MojoPose, number> = {
  idle: require('@/assets/mojo/video/idle.mov'),
  listening: require('@/assets/mojo/video/listening.mov'),
  thinking: require('@/assets/mojo/video/thinking.mov'),
  speaking: require('@/assets/mojo/video/speaking.mov'),
  celebrating: require('@/assets/mojo/video/celebrating.mov'),
  worried: require('@/assets/mojo/video/worried.mov'),
  extinguished: require('@/assets/mojo/video/extinguished.mov'),
  hop: require('@/assets/mojo/video/idle.mov'), // hop = idle loop + code-driven squash/stretch
};
const TO: Partial<Record<MojoPose, number>> = {
  listening: require('@/assets/mojo/video/idle_to_listening.mov'),
  thinking: require('@/assets/mojo/video/idle_to_thinking.mov'),
  speaking: require('@/assets/mojo/video/idle_to_speaking.mov'),
  celebrating: require('@/assets/mojo/video/idle_to_celebrating.mov'),
  worried: require('@/assets/mojo/video/idle_to_worried.mov'),
  extinguished: require('@/assets/mojo/video/idle_to_extinguished.mov'),
};
const BACK: Partial<Record<MojoPose, number>> = {
  listening: require('@/assets/mojo/video/listening_to_idle.mov'),
  thinking: require('@/assets/mojo/video/thinking_to_idle.mov'),
  speaking: require('@/assets/mojo/video/speaking_to_idle.mov'),
  celebrating: require('@/assets/mojo/video/celebrating_to_idle.mov'),
  worried: require('@/assets/mojo/video/worried_to_idle.mov'),
  extinguished: require('@/assets/mojo/video/extinguished_to_idle.mov'),
};

// Direct shortcuts for beats that must not detour through idle.
const DIRECT: Record<string, number> = {
  'thinking>listening': require('@/assets/mojo/video/thinking_to_listening.mov'),
};

const GLOW: Record<MojoPose, number> = {
  idle: 0.55, listening: 0.65, thinking: 0.45, speaking: 0.7, celebrating: 1, worried: 0.2, extinguished: 0, hop: 0.7,
};

function planRoute(from: MojoPose, to: MojoPose): ClipStep[] {
  const steps: ClipStep[] = [];
  const direct = DIRECT[`${from}>${to}`];
  if (direct) return [{ source: direct, loop: false }, { source: LOOP[to], loop: true }];
  if (from !== 'idle' && BACK[from]) steps.push({ source: BACK[from]!, loop: false });
  if (to !== 'idle' && TO[to]) steps.push({ source: TO[to]!, loop: false });
  steps.push({ source: LOOP[to], loop: true });
  return steps;
}

type Props = { pose?: MojoPose; size?: number; energy?: number; /** Live mic level on the UI thread; avoids re-rendering the players. */ energySV?: SharedValue<number>; grounded?: boolean };

export function MojoVideo({ pose = 'idle', size = 260, energy = 0, energySV, grounded = true }: Props) {
  const { a, b, front, go } = useClipRoute(LOOP.idle);
  const current = useRef<MojoPose>('idle');

  const glow = useSharedValue(GLOW.idle);
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withSequence(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [breath]);
  useEffect(() => {
    glow.value = withTiming(Math.min(1, GLOW[pose] + energy * 0.5), { duration: pose === 'celebrating' ? 250 : 600 });
  }, [pose, energy, glow]);

  // Code-driven hop: squash, spring up, stretch, land. Runs on the idle loop so the face never changes.
  const hop = useSharedValue(0);
  useEffect(() => {
    if (pose !== 'hop') {
      hop.value = withTiming(0, { duration: 200 });
      return;
    }
    hop.value = withRepeat(
      withSequence(
        withTiming(-0.12, { duration: 160, easing: Easing.out(Easing.quad) }), // squash
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),    // up
        withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),      // down
        withTiming(-0.08, { duration: 110 }),                                    // land squash
        withTiming(0, { duration: 160 }),
        withTiming(0, { duration: 500 })                                        // rest
      ),
      -1,
      false
    );
  }, [pose, hop]);
  const shadowStyle = useAnimatedStyle(() => {
    const h = Math.max(0, hop.value);
    return { opacity: 1 - h * 0.6, transform: [{ scale: 1 - h * 0.35 }] };
  });
  const hopStyle = useAnimatedStyle(() => {
    const h = hop.value;
    const lift = Math.max(0, h) * size * 0.22;
    const squash = h < 0 ? -h : 0;
    const stretch = Math.max(0, h) * 0.08;
    return {
      transform: [
        { translateY: -lift },
        { scaleY: 1 - squash * 1.4 + stretch },
        { scaleX: 1 + squash * 0.9 - stretch * 0.5 },
      ],
    };
  });

  useEffect(() => {
    if (pose === current.current) return;
    const route = planRoute(current.current, pose);
    current.current = pose;
    go(route);
  }, [pose, go]);

  const glowStyle = useAnimatedStyle(() => {
    const g = Math.min(1, glow.value + (energySV ? energySV.value * 0.5 : 0));
    return {
      opacity: g * (0.75 + 0.25 * breath.value),
      transform: [{ scale: 0.9 + 0.15 * g + 0.06 * breath.value }],
    };
  });
  const glowSize = size * 0.62;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {grounded && (
        <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle, { bottom: size * 0.045, width: size * 0.62 }]}>
          <GroundShadow width={size * 0.62} />
        </Animated.View>
      )}
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle, { bottom: size * 0.02 }]}>
        <Glow size={glowSize * 1.9} />
      </Animated.View>
      <Animated.View style={[{ width: size, height: size, transformOrigin: 'center bottom' }, hopStyle]}>
        <VideoView player={a} style={[styles.video, { opacity: front === 0 ? 1 : 0 }]} contentFit="contain" nativeControls={false} />
        <VideoView player={b} style={[styles.video, { opacity: front === 1 ? 1 : 0 }]} contentFit="contain" nativeControls={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  video: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  shadow: { position: 'absolute', alignItems: 'center' },
});
