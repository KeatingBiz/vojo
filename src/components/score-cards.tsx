import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Glow } from '@/components/glow';
import { MojoVideo } from '@/components/mojo-video';
import { ResultCard } from '@/components/result-card';
import { CountUp } from '@/components/ui/count-up';
import { ProgressRing } from '@/components/ui/progress-ring';
import { RichText } from '@/components/ui/rich-text';
import { StatusCycler } from '@/components/ui/status-cycler';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { SCORING } from '@/data/scoring';
import type { Analysis, Measured } from '@/lib/api';

/** Score reveal: how long the ring and number take to climb. */
export const SCORE_MS = 1700;

type Props = {
  /** Numbers to show. */
  data: Measured;
  /** Full scorecard with coach notes; null while still pending (dev preview only in practice). */
  final: Analysis | null;
  /** Show celebrating Mojo at the ring's shoulder. */
  mojo?: boolean;
  /** Animate the ring and number from zero. */
  animate?: boolean;
  label?: string;
};

/** The Vojo score ring, headline, four category cards and the tip. Shared by the session results and the replay screen. */
export function ScoreCards({ data, final, mojo = true, animate = true, label }: Props) {
  const score = data.scores.vojo_score;
  const ring = useSharedValue(animate ? 0 : score / 100);
  useEffect(() => {
    if (!animate) return;
    ring.set(withTiming(score / 100, { duration: SCORE_MS, easing: Easing.out(Easing.poly(4)) }));
  }, [animate, score, ring]);
  const elite = useAnimatedStyle(() => ({ opacity: withTiming(ring.value >= SCORING.elite / 100 ? 1 : 0, { duration: 250 }) }));

  return (
    <View>
      <View style={styles.scoreStage}>
        <View style={styles.scoreGlow} pointerEvents="none"><Glow size={300} color={score >= SCORING.elite ? colors.accent : colors.primary} strength={0.9} /></View>
        <ProgressRing size={200} stroke={14} progress={ring} color={colors.primarySoft} track="rgba(28,26,58,0.9)">
          <View style={{ alignItems: 'center' }}>
            {animate ? <CountUp to={score} duration={SCORE_MS} style={styles.total} /> : <Text style={styles.total}>{score}</Text>}
            <Text style={styles.scoreLabel}>{label ?? (final ? 'VOJO SCORE' : 'SO FAR')}</Text>
          </View>
        </ProgressRing>
        <Animated.View pointerEvents="none" style={[styles.eliteRing, elite]}>
          <ProgressRing size={200} stroke={14} progress={ring} color={colors.accent} track="transparent" />
        </Animated.View>
        {mojo && <View style={styles.mojoCorner}><MojoVideo pose="celebrating" size={120} grounded={false} /></View>}
      </View>
      {final ? (
        <Animated.Text entering={FadeIn.duration(350)} style={styles.headline}>{final.feedback.headline}</Animated.Text>
      ) : (
        <StatusCycler lines={['Mojo is writing your notes...', 'Checking you answered the prompt...', 'Almost there...']} every={2200} style={[styles.headline, { color: colors.muted }]} />
      )}

      <ResultCard
        title="Filler words"
        score={data.scores.fillers}
        delay={150}
        chips={[
          { label: 'total', value: `${data.fillers.total}`, hero: true, warn: data.fillers.total > 3 },
          { label: 'per minute', value: data.fillers.per_minute.toFixed(1) },
          ...Object.entries(data.fillers.per_filler).map(([k, v]) => ({ label: k, value: `×${v}`, lit: true })),
        ]}
        note={final?.feedback.notes.fillers}
        noteTerms={Object.keys(data.fillers.per_filler)}
      />
      <ResultCard
        title="Pace & pauses"
        score={data.scores.pacing}
        delay={300}
        chips={[
          { label: data.pacing.flags.rushing ? 'wpm · rushing' : data.pacing.flags.too_slow ? 'wpm · slow' : 'words / min', value: `${Math.round(data.pacing.wpm)}`, hero: true, warn: data.pacing.flags.rushing || data.pacing.flags.too_slow },
          { label: 'pauses over 1s', value: `${data.pacing.pauses.over_1s}` },
          { label: 'longest pause', value: `${data.pacing.pauses.longest_s.toFixed(1)}s`, warn: data.pacing.flags.long_freeze },
        ]}
        note={final?.feedback.notes.pacing}
      />
      <ResultCard
        title="Delivery"
        score={data.scores.prosody}
        delay={450}
        chips={[
          { label: 'confidence', value: `${data.scores.confidence}%`, hero: true },
          { label: data.prosody.monotone ? 'pitch range · flat' : 'pitch range', value: `${data.prosody.pitch_variation_semitones.toFixed(1)} st`, warn: data.prosody.monotone },
          { label: 'lines ending up', value: `${data.prosody.uptalk.rising}/${data.prosody.uptalk.statements}`, warn: data.prosody.uptalk.ratio > 0.3 },
        ]}
        note={final?.feedback.notes.delivery}
      />
      <ResultCard
        title="Content"
        score={final?.scores.content ?? null}
        delay={600}
        chips={final?.content ? [
          { label: 'on topic', value: `${final.content.on_topic_score}`, hero: true },
          { label: 'structure', value: `${final.content.structure_score}` },
          { label: 'clarity', value: `${final.content.clarity_score}` },
        ] : [{ label: 'coach is reading', value: '…' }]}
        note={final?.feedback.notes.content}
      />
      {final && (
        <Animated.View entering={FadeInUp.delay(750).duration(380)} style={styles.tipCard}>
          <Text style={[type.label, { color: colors.cyan }]}>One tip for tomorrow</Text>
          <RichText text={final.feedback.one_tip} style={[type.body, { marginTop: 6 }]} highlightColor={colors.cyan} />
          {final.content?.best_moment ? <Text style={[type.small, { marginTop: 10, fontStyle: 'italic' }]}>{`Best moment: “${final.content.best_moment}”`}</Text> : null}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  total: { fontFamily: fonts.displayBold, fontSize: 66, color: colors.text, lineHeight: 72 },
  scoreLabel: { fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 2.6, color: colors.accent, marginTop: -2 },
  scoreGlow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  eliteRing: { position: 'absolute' },
  scoreStage: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, marginBottom: spacing.sm },
  mojoCorner: { position: 'absolute', right: 0, bottom: -10 },
  headline: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28, color: colors.text, textAlign: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  tipCard: { backgroundColor: colors.bossDeep, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.boss, padding: spacing.md, marginBottom: spacing.sm },
});
