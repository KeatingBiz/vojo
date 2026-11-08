import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

// Must match app.json -> expo-splash-screen imageWidth, and the splash PNG is frame 0 of this clip,
// so the native splash and this overlay line up pixel for pixel.
const LOGO = 240;
const RATE = 1.35;

/** Continues the static native splash: the flame catches, the wordmark lands, then it all dissolves. */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const player = useVideoPlayer(require('@/assets/mojo/video/extinguished_to_idle.mov'), (p) => {
    p.muted = true;
    p.loop = false;
    p.playbackRate = RATE;
    p.play();
  });
  const word = useSharedValue(0);
  useEffect(() => {
    word.set(withDelay(900, withTiming(1, { duration: 450 })));
    const buzz = setTimeout(() => haptic.press(), 950);
    const sub = player.addListener('playToEnd', () => {
      setTimeout(() => {
        setGone(true);
        setTimeout(onDone, 320);
      }, 180);
    });
    return () => {
      clearTimeout(buzz);
      sub.remove();
    };
  }, [player, word, onDone]);
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 14 }, { scale: 0.96 + 0.04 * word.value }] }));

  if (gone) return <Animated.View exiting={FadeOut.duration(320)} style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />;
  // The native splash centers its image on the full screen; mirror that exactly.
  const left = (width - LOGO) / 2;
  const top = (height - LOGO) / 2;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap]}>
      <VideoView player={player} style={{ position: 'absolute', left, top, width: LOGO, height: LOGO, backgroundColor: 'transparent' }} contentFit="contain" nativeControls={false} />
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: top + LOGO - 8, alignItems: 'center' }, wordStyle]}>
        <Text style={styles.word}>vojo</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, zIndex: 100 },
  word: { fontFamily: fonts.displayBold, fontSize: 72, lineHeight: 84, color: colors.accent, letterSpacing: 8 },
});
