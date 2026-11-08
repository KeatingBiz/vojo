import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { GroundShadow } from './ground-shadow';

/** One looping transparent clip on a single player. For map figures and other small, cheap uses. */
export function ClipLoop({ source, width, height, shadow = true }: { source: number; width: number; height?: number; shadow?: boolean }) {
  const h = height ?? width;
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={{ width, height: h, alignItems: 'center' }}>
      {shadow && (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: h * 0.04, width: width * 0.62 }}>
          <GroundShadow width={width * 0.62} />
        </View>
      )}
      <VideoView player={player} style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} contentFit="contain" nativeControls={false} />
    </View>
  );
}
