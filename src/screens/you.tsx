import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClayButton } from '@/components/clay-button';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { SCORING } from '@/data/scoring';
import { haptic } from '@/lib/haptics';
import { listRecordings, type RecordingSummary } from '@/lib/recordings';
import { useVojo } from '@/store/vojo';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Quiet by default: streak and XP, a grid of past scores, two rows that open detail. */
export function YouScreen() {
  const insets = useSafeAreaInsets();
  const { streak, bestStreak, xp, season, week, resetDemo, recordingsVersion } = useVojo();
  const [recs, setRecs] = useState<RecordingSummary[]>([]);
  useEffect(() => {
    listRecordings().then(setRecs);
  }, [recordingsVersion]);

  const tapTile = (id: string) => {
    haptic.tap();
    router.push({ pathname: '/replay', params: { id } });
  };

  return (
    <View style={styles.page}>
      <SceneBackdrop region="falls" zoom={1.7} dim={0.45} blur={4} light="natural" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: 74 + Math.max(insets.bottom, 10) + 16, paddingHorizontal: spacing.lg }}>
        {/* Streak + XP */}
        <View style={styles.hero}>
          <Image source={streak > 0 ? require('@/assets/icons/streak-flame.png') : require('@/assets/icons/streak-out.png')} style={{ width: 84, height: 84 }} contentFit="contain" />
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
          <View style={styles.metaRow}>
            <Text style={type.small}>{`Best ${bestStreak}`}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[type.small, { color: colors.primarySoft, fontFamily: fonts.bodyBold }]}>{`${xp} XP`}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={type.small}>{`Season ${season}, week ${week}`}</Text>
          </View>
        </View>

        {/* Past sessions */}
        <View style={styles.listHead}>
          <Text style={styles.h2}>Sessions</Text>
        </View>
        {recs.length === 0 ? (
          <View style={styles.empty}><Text style={[type.body, { color: colors.muted }]}>Your first session lands here.</Text></View>
        ) : (
          <View style={styles.grid}>
            {recs.map((r) => {
              const elite = r.score >= SCORING.elite;
              return (
                <Pressable key={r.id} onPress={() => tapTile(r.id)} style={[styles.tile, elite && styles.tileElite]} accessibilityRole="button" accessibilityLabel={`Session ${day(r.date)}, score ${r.score}`}>
                  <Text style={[styles.tileScore, elite && { color: colors.accent }]}>{r.score}</Text>
                  <Text style={styles.tileDate}>{day(r.date)}</Text>
                  {r.pinned && <Text style={styles.pin}>★</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Detail rows */}
        <Pressable onPress={() => { haptic.tap(); router.push('/scoring'); }} style={styles.rowLink} accessibilityRole="button">
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>How scoring works</Text>
            <Text style={type.small}>Fillers 30 · Pace 25 · Delivery 25 · Content 20</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        <View style={{ height: spacing.xl }} />
        <ClayButton label="Reset demo progress" variant="ghost" onPress={() => { haptic.warn(); resetDemo(); }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: spacing.md, marginBottom: spacing.md },
  streakNum: { fontFamily: fonts.displayBold, fontSize: 56, lineHeight: 62, color: colors.text, marginTop: 4 },
  streakLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.accent, marginTop: -4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaDot: { color: colors.faint, marginHorizontal: 8 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  h2: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.text },
  empty: { backgroundColor: 'rgba(28,26,58,0.82)', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.lg, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', flexGrow: 1, aspectRatio: 1, borderRadius: radius.lg, backgroundColor: 'rgba(28,26,58,0.86)', borderWidth: 1.5, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  tileElite: { borderColor: colors.accentEdge, backgroundColor: 'rgba(249,115,22,0.10)' },
  tileScore: { fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 40, color: colors.text },
  tileDate: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  pin: { position: 'absolute', top: 8, right: 10, color: colors.accent, fontSize: 13 },
  rowLink: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(28,26,58,0.86)', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.md, marginTop: spacing.lg },
  rowTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.text },
  chev: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.primarySoft, lineHeight: 28 },
});
