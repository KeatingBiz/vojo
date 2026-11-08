import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClayButton } from '@/components/clay-button';
import { DayTimer } from '@/components/day-timer';
import { MojoVideo } from '@/components/mojo-video';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { StreakPill } from '@/components/streak-pill';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { getPrompt } from '@/data/prompts';
import { useVojo } from '@/store/vojo';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { streak, xp, dayIndex, todayDone, lastScore, week } = useVojo();
  const prompt = getPrompt(Math.min(dayIndex, 5));
  const bossDay = dayIndex === 6;

  return (
    <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: 74 + Math.max(insets.bottom, 10) + 8 }]}>
      <SceneBackdrop region="cove" zoom={2.4} dim={0.8} blur={7} />
      <View style={styles.header}>
        <StreakPill days={streak} />
        <View style={styles.xpChip}>
          <Text style={styles.xp}>{xp} XP</Text>
        </View>
      </View>
      <DayTimer done={todayDone} />

      <View style={styles.stage}>
        <MojoVideo pose={todayDone ? 'celebrating' : bossDay ? 'worried' : 'idle'} size={290} />
      </View>

      {bossDay ? (
        <View style={styles.bossCard}>
          <Text style={[type.label, { color: colors.cyan }]}>Boss day</Text>
          <Text style={[type.title, { marginTop: spacing.sm }]}>{`Week ${week} fight. The Doubter is waiting at the shore.`}</Text>
          <Text style={[type.small, { marginTop: spacing.sm }]}>Three rounds. Hold your ground.</Text>
        </View>
      ) : todayDone ? (
        <View style={styles.doneCard}>
          <Text style={type.label}>Done for today</Text>
          <Text style={[type.title, { marginTop: spacing.sm }]}>Score {lastScore}. Streak {streak}.</Text>
          <Text style={[type.small, { marginTop: spacing.sm }]}>Come back tomorrow to keep the flame lit.</Text>
        </View>
      ) : (
        <View style={styles.sealed}>
          <View style={styles.sealedRow}>
            <Text style={type.label}>Today&apos;s prompt</Text>
            <View style={styles.tag}><Text style={styles.tagText}>{prompt.tag}</Text></View>
          </View>
          <View style={styles.sealedBody}>
            <Image source={require('@/assets/icons/lock.png')} style={{ width: 44, height: 44 }} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={type.title}>Sealed until you start.</Text>
              <Text style={[type.small, { marginTop: 4 }]}>{`${prompt.thinkSeconds} seconds to think once it's revealed. Then speak for a minute.`}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {bossDay ? (
          <ClayButton label="Face the Doubter" variant="primary" onPress={() => router.push('/boss')} />
        ) : (
          <ClayButton label={todayDone ? 'Practice again' : "Start today's session"} variant="accent" onPress={() => router.push('/session')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xp: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.primarySoft },
  xpChip: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.cardBorder, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1.5, borderColor: colors.accentEdge, padding: spacing.lg },
  bossCard: { backgroundColor: colors.bossDeep, borderRadius: 24, borderWidth: 1.5, borderColor: colors.boss, padding: spacing.lg },
  footer: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  sealed: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.cardBorder, padding: spacing.lg },
  sealedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sealedBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  tag: { backgroundColor: colors.bgRaised, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.cardBorder },
  tagText: { ...type.small, fontSize: 12, color: colors.primarySoft },
});
