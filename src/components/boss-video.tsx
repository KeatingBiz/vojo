import { VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { GroundShadow } from './ground-shadow';
import { useClipRoute } from './use-clip-route';

export type BossPose = 'idle' | 'taunting' | 'defeated';

// The Doubter. Routes: idle <-> taunting, taunting -> defeated. Anything else crossfades straight to the loop.
const LOOP: Record<BossPose, number> = {
  idle: require('@/assets/bosses/doubter/video/idle.mov'),
  taunting: require('@/assets/bosses/doubter/video/taunting.mov'),
  defeated: require('@/assets/bosses/doubter/video/defeated.mov'),
};
const ROUTE: Record<string, number> = {
  'idle>taunting': require('@/assets/bosses/doubter/video/idle_to_taunting.mov'),
  'taunting>idle': require('@/assets/bosses/doubter/video/taunting_to_idle.mov'),
  'taunting>defeated': require('@/assets/bosses/doubter/video/taunting_to_defeated.mov'),
};

type Props = { pose?: BossPose; width?: number };

export function BossVideo({ pose = 'idle', width = 240 }: Props) {
  const height = width * (880 / 720);
  const { a, b, front, go } = useClipRoute(LOOP.idle);
  const current = useRef<BossPose>('idle');

  useEffect(() => {
    if (pose === current.current) return;
    const route = ROUTE[`${current.current}>${pose}`];
    go(route ? [{ source: route, loop: false }, { source: LOOP[pose], loop: true }] : [{ source: LOOP[pose], loop: true }]);
    current.current = pose;
  }, [pose, go]);

  return (
    <View style={{ width, height, alignItems: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: height * 0.03, width: width * 0.8 }}>
        <GroundShadow width={width * 0.8} opacity={0.6} />
      </View>
      <VideoView player={a} style={[styles.video, { opacity: front === 0 ? 1 : 0 }]} contentFit="contain" nativeControls={false} />
      <VideoView player={b} style={[styles.video, { opacity: front === 1 ? 1 : 0 }]} contentFit="contain" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  video: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
});
