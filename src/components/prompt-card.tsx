import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors, radius, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type Props = { text: string; tag: string; sub?: string; reveal?: boolean };

/** The daily prompt. With `reveal` it flips in like a card being turned over. */
export function PromptCard({ text, tag, sub, reveal = false }: Props) {
  const t = useSharedValue(reveal ? 0 : 1);
  useEffect(() => {
    if (!reveal) return;
    t.value = withDelay(80, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    const id = setTimeout(() => haptic.press(), 200);
    return () => clearTimeout(id);
  }, [reveal, t]);
  // 2D only: opacity + lift + slight scale. A perspective/rotateX flip rendered a dark full-width box on iOS mid-animation.
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 18 }, { scale: 0.96 + 0.04 * t.value }],
  }));
  return (
    <Animated.View style={[styles.card, style]}>
      <View style={styles.row}>
        <Text style={type.label}>Today&apos;s prompt</Text>
        <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
      </View>
      <Text style={[type.title, { marginTop: spacing.sm }]}>{text}</Text>
      {sub ? <Text style={[type.small, { marginTop: spacing.md }]}>{sub}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { backgroundColor: colors.bgRaised, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.cardBorder },
  tagText: { ...type.small, fontSize: 12, color: colors.primarySoft },
});
