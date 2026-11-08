import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { EXPLAINERS } from '@/data/scoring';
import { haptic } from '@/lib/haptics';

/** "What the scores mean": one collapsible row per category, stating the exact targets the grader uses. */
export function Explainers() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={styles.card}>
      <Text style={type.label}>What the scores mean</Text>
      {EXPLAINERS.map((e) => {
        const on = open === e.key;
        return (
          <View key={e.key} style={styles.row}>
            <Pressable onPress={() => { haptic.tap(); setOpen(on ? null : e.key); }} style={styles.rowHead} accessibilityRole="button" accessibilityState={{ expanded: on }}>
              <Text style={styles.title}>{e.title}</Text>
              <Text style={styles.weight}>{e.weight}</Text>
              <Text style={[styles.chev, on && { transform: [{ rotate: '90deg' }] }]}>›</Text>
            </Pressable>
            {on && (
              <Animated.View entering={FadeIn.duration(200)} style={{ paddingBottom: spacing.sm }}>
                <Text style={styles.k}>Measured</Text><Text style={styles.v}>{e.what}</Text>
                <Text style={styles.k}>Target</Text><Text style={[styles.v, { color: colors.text }]}>{e.target}</Text>
                <Text style={styles.k}>Why it matters</Text><Text style={styles.v}>{e.why}</Text>
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.md, marginBottom: spacing.sm },
  row: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 10, paddingTop: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.text, flex: 1 },
  weight: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chev: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.primarySoft, width: 16, textAlign: 'center' },
  k: { ...type.label, fontSize: 11, marginTop: 10 },
  v: { ...type.body, fontSize: 14, lineHeight: 20, marginTop: 2, color: colors.muted },
});
