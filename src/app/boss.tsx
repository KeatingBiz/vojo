import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BossVideo, type BossPose } from '@/components/boss-video';
import { ClayButton } from '@/components/clay-button';
import { MojoVideo } from '@/components/mojo-video';
import type { MojoPose } from '@/components/mojo';
import { Confetti } from '@/components/ui/confetti';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SpeechBubble } from '@/components/ui/speech-bubble';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { DOUBTER } from '@/data/boss-lines';
import { haptic } from '@/lib/haptics';
import { useMic } from '@/lib/use-mic';
import { LiveMeter } from '@/components/live-meter';
import { useVojo } from '@/store/vojo';

type Phase = 'intro' | 'boss' | 'you' | 'react' | 'verdict';
const TURN_SECONDS = 30;

export default function BossScreen() {
  const { completeBoss } = useVojo();
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState(false);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(TURN_SECONDS);
  const ring = useSharedValue(0);
  const mic = useMic();
  const energy = useSharedValue(0);

  const bossPose: BossPose = phase === 'verdict' ? 'defeated' : phase === 'boss' || phase === 'intro' ? 'taunting' : 'idle';
  const mojoPose: MojoPose = phase === 'verdict' ? 'celebrating' : phase === 'you' ? (recording ? 'speaking' : 'listening') : phase === 'react' ? 'idle' : 'worried';

  const beginTurn = async () => {
    haptic.press();
    const ok = await mic.start();
    if (!ok) return;
    setLeft(TURN_SECONDS);
    setRecording(true);
  };
  const endTurn = async () => {
    if (!recording) return;
    setRecording(false);
    haptic.heavy();
    await mic.stop();
    setTyped(false);
    setPhase('react');
  };
  // Your-turn timer
  useEffect(() => {
    if (!recording) return;
    ring.set(0);
    ring.set(withTiming(1, { duration: TURN_SECONDS * 1000 }));
    const id = setInterval(() => {
      setLeft((v) => {
        const n = v - 1;
        if (n <= 5 && n > 0) haptic.tap();
        if (n <= 0) endTurn();
        return Math.max(0, n);
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const afterReact = () => {
    if (round >= 2) {
      haptic.success();
      setPhase('verdict');
    } else {
      setRound((r) => r + 1);
      setTyped(false);
      setPhase('boss');
    }
  };

  const bubble =
    phase === 'intro' ? DOUBTER.intro + ' ' + DOUBTER.claim
    : phase === 'boss' ? DOUBTER.rounds[round]
    : phase === 'react' ? DOUBTER.reactions[round]
    : phase === 'verdict' ? DOUBTER.defeat
    : null;

  const leave = (won: boolean) => {
    haptic.press();
    completeBoss(won);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SceneBackdrop region="shore" zoom={2.2} dim={0.45} />
      <View style={styles.top}>
        <Pressable onPress={() => { haptic.tap(); router.back(); }} hitSlop={12} style={styles.close}><Image source={require('@/assets/icons/close.png')} style={{ width: 38, height: 38 }} contentFit="contain" /></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[type.label, { color: colors.cyan }]}>{DOUBTER.name}</Text>
          <View style={styles.pips}>{[0, 1, 2].map((i) => <View key={i} style={[styles.pip, i < round + (phase === 'verdict' ? 1 : 0) && styles.pipOn, i === round && phase !== 'verdict' && styles.pipNow]} />)}</View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {phase === 'verdict' && <Confetti />}

      {/* Arena */}
      <View style={styles.arena}>
        <View style={styles.bubbleRow}>
          {bubble && (
            <SpeechBubble
              key={`${phase}-${round}`}
              text={bubble}
              side="right"
              tint={colors.bossDeep}
              onDone={() => setTyped(true)}
            />
          )}
        </View>
        <View style={styles.fighters}>
          <View style={styles.mojoSide}>
            {phase === 'you' ? (
              <ProgressRing size={200} stroke={9} progress={ring} color={colors.accent}>
                <MojoVideo pose={mojoPose} size={160} energySV={energy} />
              </ProgressRing>
            ) : (
              <MojoVideo pose={mojoPose} size={170} />
            )}
          </View>
          <View style={styles.bossSide}>
            <BossVideo pose={bossPose} width={170} />
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {phase === 'intro' && typed && (
          <Animated.View entering={FadeInUp}><ClayButton label="I disagree" variant="accent" onPress={() => { haptic.press(); setTyped(false); setPhase('boss'); }} /></Animated.View>
        )}
        {phase === 'boss' && typed && (
          <Animated.View entering={FadeInUp}><ClayButton label="My turn" variant="accent" onPress={() => setPhase('you')} /></Animated.View>
        )}
        {phase === 'you' && (
          <View>
            <LiveMeter recorder={mic.recorder} active={recording} energy={energy} color={colors.accent} />
            <Text style={[type.small, { textAlign: 'center', marginVertical: spacing.sm }]}>
              {recording ? `${left}s. Make your point.` : `${TURN_SECONDS} seconds. Argue back.`}
            </Text>
            {recording ? <ClayButton label="That's my answer" variant="primary" onPress={endTurn} /> : <ClayButton label="Start talking" variant="accent" icon={require('@/assets/icons/mic-lit.png')} onPress={beginTurn} />}
          </View>
        )}
        {phase === 'react' && typed && (
          <Animated.View entering={FadeInUp}><ClayButton label={round >= 2 ? 'Finish him' : 'Next round'} variant="accent" onPress={() => { haptic.press(); afterReact(); }} /></Animated.View>
        )}
        {phase === 'verdict' && (
          <Animated.View entering={FadeIn.delay(400)}>
            <View style={styles.verdict}>
              <Text style={[type.label, { color: colors.cyan }]}>Boss defeated</Text>
              <Text style={[type.title, { marginTop: 4 }]}>{DOUBTER.verdict}</Text>
              <Text style={[type.small, { marginTop: spacing.xs }]}>+150 XP. Next week unlocks.</Text>
            </View>
            <ClayButton label="Claim victory" variant="accent" onPress={() => leave(true)} />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 16, fontFamily: fonts.bodyBold },
  pips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pip: { width: 22, height: 6, borderRadius: 3, backgroundColor: colors.cardBorder },
  pipOn: { backgroundColor: colors.cyan },
  pipNow: { backgroundColor: colors.accent },
  arena: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'flex-end' },
  bubbleRow: { minHeight: 110, justifyContent: 'flex-end', marginBottom: spacing.md },
  fighters: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  mojoSide: { alignItems: 'center', justifyContent: 'flex-end', height: 210 },
  bossSide: { alignItems: 'center', justifyContent: 'flex-end' },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm, minHeight: 120 },
  verdict: { backgroundColor: colors.bossDeep, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.boss, padding: spacing.lg, marginBottom: spacing.md },
});
