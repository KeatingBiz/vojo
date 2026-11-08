import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, fonts, radius, spacing } from '@/constants/theme';

export function StreakPill({ days }: { days: number }) {
  const lit = days > 0;
  return (
    <View style={styles.pill}>
      <Image source={lit ? require('@/assets/icons/streak-flame.png') : require('@/assets/icons/streak-out.png')} style={{ width: 26, height: 26 }} contentFit="contain" />
      <Text style={[styles.count, !lit && { color: colors.faint }]}>{days}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  count: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.text },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted },
});
