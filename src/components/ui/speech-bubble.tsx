import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type Props = { text: string; side?: 'left' | 'right'; tint?: string; style?: ViewStyle; onDone?: () => void };

/** Typewriter speech bubble. Tail points down-left or down-right toward the speaker. */
export function SpeechBubble({ text, side = 'left', tint = colors.card, style, onDone }: Props) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    haptic.select();
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 24);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[styles.wrap, style]}>
      <View style={[styles.bubble, { backgroundColor: tint }]}>
        <Text style={styles.text}>{shown}</Text>
      </View>
      <View style={[styles.tail, { backgroundColor: tint }, side === 'left' ? { left: 28 } : { right: 28 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  bubble: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 64,
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 24, color: colors.text },
  tail: { position: 'absolute', bottom: -7, width: 16, height: 16, transform: [{ rotate: '45deg' }], borderRadius: 3 },
});
