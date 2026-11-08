import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

type Props = { label: string; on?: boolean; onPress?: () => void; tint?: string; style?: ViewStyle };

/** Small chip. Haptic on every tap. */
export function Pill({ label, on, onPress, tint = colors.primary, style }: Props) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={[styles.pill, on && { backgroundColor: tint, borderColor: 'rgba(255,255,255,0.35)' }, style]}>
      <Text style={[styles.text, on && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  text: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
});
