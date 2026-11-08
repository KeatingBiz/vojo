import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

/**
 * Plays a clip forever with no restart hitch. Two players alternate: the idle one waits paused on
 * frame 0 and takes over the instant the other reaches its end. Works best with clips whose last
 * frame already matches their first (baked crossfade loops).
 */
export function SeamlessLoop({ source, style }: { source: number; style?: ViewStyle }) {
  const a = useVideoPlayer(source, (p) => { p.muted = true; p.loop = false; p.play(); });
  const b = useVideoPlayer(source, (p) => { p.muted = true; p.loop = false; });
  const [front, setFront] = useState<0 | 1>(0);
  const frontRef = useRef<0 | 1>(0);

  useEffect(() => {
    const players = [a, b] as const;
    const subs = players.map((p, i) =>
      p.addListener('playToEnd', () => {
        if (i !== frontRef.current) return;
        const nextIdx: 0 | 1 = i === 0 ? 1 : 0;
        const next = players[nextIdx];
        next.play();
        frontRef.current = nextIdx;
        setFront(nextIdx);
        p.currentTime = 0;
      })
    );
    return () => subs.forEach((s) => s.remove());
  }, [a, b]);

  return (
    <View style={style}>
      <VideoView player={b} style={[StyleSheet.absoluteFill, { opacity: front === 1 ? 1 : 0 }]} contentFit="cover" nativeControls={false} />
      <VideoView player={a} style={[StyleSheet.absoluteFill, { opacity: front === 0 ? 1 : 0 }]} contentFit="cover" nativeControls={false} />
    </View>
  );
}
