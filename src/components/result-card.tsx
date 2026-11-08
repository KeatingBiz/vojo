import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { RichText } from '@/components/ui/rich-text';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';

export type Chip = { label: string; value: string; warn?: boolean; /** Bigger, lit chip for the headline metric. */ hero?: boolean; /** Brand-colored chip (filler words). */ lit?: boolean };

type Props = {
  title: string;
  score: number | null;
  chips: Chip[];
  /** One short coach sentence with **marked** highlights; undefined while the coach is still writing. */
  note?: string;
  /** Words to light up inside the note even if unmarked. */
  noteTerms?: string[];
  delay?: number;
};

function status(score: number | null) {
  if (score === null) return { label: 'Pending', color: colors.muted };
  if (score >= 85) return { label: 'Strong', color: colors.cyan };
  if (score >= 65) return { label: 'Solid', color: colors.primarySoft };
  return { label: 'Work on', color: colors.accent };
}

/** One grading category: status pill, score bar, a few number chips, and one coach sentence. */
export function ResultCard({ title, score, chips, note, noteTerms, delay = 0 }: Props) {
  const st = status(score);
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(380)} style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.pill, { borderColor: st.color }]}><Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text></View>
      </View>
      <View style={styles.barRow}>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, score ?? 0)}%`, backgroundColor: st.color }]} /></View>
        <Text style={[styles.scoreText, { color: st.color }]}>{score === null ? '–' : score}</Text>
      </View>
      <View style={styles.chips}>
        {chips.map((c) => (
          <View key={c.label} style={[styles.chip, c.warn && styles.chipWarn, c.lit && styles.chipLit, c.hero && styles.chipHero]}>
            <Text style={[styles.chipValue, c.warn && { color: colors.accent }, c.lit && { color: colors.accent }, c.hero && styles.chipHeroValue]}>{c.value}</Text>
            <Text style={[styles.chipLabel, c.lit && { color: colors.text }, c.hero && { color: colors.primarySoft }]}>{c.label}</Text>
          </View>
        ))}
      </View>
      {note ? (
        <Animated.View entering={FadeIn.duration(300)}><RichText text={note} terms={noteTerms} style={styles.note} /></Animated.View>
      ) : (
        <View style={styles.skeleton} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.md, marginBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.text },
  pill: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.bgRaised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  scoreText: { fontFamily: fonts.displayBold, fontSize: 18, width: 34, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.bgRaised, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.cardBorder },
  chipWarn: { borderColor: colors.accentEdge },
  chipLit: { borderColor: colors.accent, backgroundColor: 'rgba(249,115,22,0.12)' },
  chipHero: { borderColor: colors.primary, backgroundColor: 'rgba(124,58,237,0.18)', paddingHorizontal: 14, paddingVertical: 8 },
  chipHeroValue: { fontSize: 22, color: colors.text },
  chipValue: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.text },
  chipLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 1 },
  note: { ...type.body, fontSize: 15, lineHeight: 21, marginTop: 12 },
  skeleton: { height: 14, borderRadius: 7, backgroundColor: colors.bgRaised, marginTop: 14, width: '78%' },
});
