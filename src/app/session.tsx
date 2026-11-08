import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClayButton } from '@/components/clay-button';
import { LiveMeter } from '@/components/live-meter';
import { MojoVideo } from '@/components/mojo-video';
import { PromptCard } from '@/components/prompt-card';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { Confetti } from '@/components/ui/confetti';
import { Countdown } from '@/components/ui/countdown';
import { ProgressRing } from '@/components/ui/progress-ring';
import { StatusCycler } from '@/components/ui/status-cycler';
import { LoadingRing } from '@/components/ui/loading-ring';
import { ScoreCards } from '@/components/score-cards';
import { TickTimer } from '@/components/ui/tick-timer';
import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { getPrompt } from '@/data/prompts';
import { analyzeRecording, warmUp, type Analysis, type Measured } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { useMic } from '@/lib/use-mic';
import { newRecordingId, saveRecording } from '@/lib/recordings';
import { useVojo } from '@/store/vojo';
import SAMPLE from '@/data/sample-result.json';

type Phase = 'warn' | 'think' | 'countdown' | 'record' | 'grading' | 'results' | 'error';

/** The first two sessions get a heads-up that the prompt and timer appear together. */
const WARN_SESSIONS = 2;

export default function SessionScreen() {
  const { dayIndex, sessions, completeSession, bumpRecordings } = useVojo();
  // `vojo://session?warn=0` skips the heads-up (dev/deep-link convenience).
  const { warn, demo } = useLocalSearchParams<{ warn?: string; demo?: string }>();
  const showWarn = sessions < WARN_SESSIONS && warn !== '0';
  const prompt = getPrompt(Math.min(dayIndex, 5));
  // Returning users go straight to the reveal: the prompt and the countdown land together.
  // Dev preview: `vojo://session?demo=grading|measured|results` opens that phase with a sample scorecard.
  const [phase, setPhase] = useState<Phase>(() => (__DEV__ && demo === 'grading' ? 'grading' : __DEV__ && (demo === 'results' || demo === 'measured') ? 'results' : showWarn ? 'warn' : 'think'));
  // One clock for the ring and the number in each timed window.
  const [thinkStart, setThinkStart] = useState(() => Date.now());
  const [recStart, setRecStart] = useState(0);
  const ring = useSharedValue(1);
  // Ring scales with the screen so the prompt card and footer always fit below it.
  const { height: screenH } = useWindowDimensions();
  const RING = Math.min(300, Math.round(screenH * 0.34));
  const MOJO = Math.round(RING * 0.8);
  // Every phase shares one fixed-height stage so Mojo never jumps when the content below changes.
  const stage = { height: RING + 64, alignItems: 'center' as const, justifyContent: 'center' as const };
  // Ring phases pin the ring to the top so the countdown number has its own room underneath.
  const ringStage = [stage, { justifyContent: 'flex-start' as const }];
  const energy = useSharedValue(0);
  const mic = useMic();
  const [recording, setRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const stopping = useRef(false);
  const [clipUri, setClipUri] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(() => (__DEV__ && demo === 'results' ? (SAMPLE as Analysis) : null));
  const [measured, setMeasured] = useState<Measured | null>(() => (__DEV__ && demo === 'measured' ? (SAMPLE as Measured) : null));
  const [error, setError] = useState<string>('');

  // ---- phase transitions ----
  const toCountdown = useCallback(() => {
    haptic.press();
    warmUp(); // wake the grader now so it is hot when the clip arrives
    setPhase('countdown');
  }, []);

  const startRecording = useCallback(async () => {
    const ok = await mic.start();
    if (!ok) {
      setMicDenied(true);
      setPhase('record');
      return;
    }
    haptic.heavy();
    ring.set(0);
    ring.set(withTiming(1, { duration: prompt.speakSeconds * 1000, easing: Easing.linear }));
    setRecStart(Date.now());
    setRecording(true);
    setPhase('record');
  }, [mic, prompt.speakSeconds, ring]);

  const grade = useCallback(async (uri: string) => {
    setPhase('grading');
    setMeasured(null);
    try {
      // The server streams provisional numbers first, but the score shown must never move afterwards,
      // so we hold the grading screen until the final scorecard arrives.
      const r = await analyzeRecording(uri, prompt.text, (m) => setMeasured(m));
      haptic.success();
      setResult(r);
      setPhase('results');
    } catch (e) {
      haptic.warn();
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('error');
    }
  }, [prompt.text]);

  const finish = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    haptic.heavy();
    const uri = await mic.stop();
    setRecording(false);
    if (!uri) {
      setError('The recording did not save. Try again.');
      setPhase('error');
      return;
    }
    setClipUri(uri);
    grade(uri);
  }, [mic, grade]);

  // Think ring drains over the think window, from the same instant the number started.
  useEffect(() => {
    if (phase !== 'think') return;
    const left = Math.max(0, prompt.thinkSeconds * 1000 - (Date.now() - thinkStart));
    ring.set(left / (prompt.thinkSeconds * 1000));
    ring.set(withTiming(0, { duration: left, easing: Easing.linear }));
  }, [phase, prompt.thinkSeconds, ring, thinkStart]);

  const close = () => {
    haptic.tap();
    router.back();
  };
  // Dev preview `demo=measured` still renders the provisional shape; real sessions only reach results with the final.
  const view: Measured | null = result ?? measured;
  const done = async () => {
    haptic.success();
    completeSession(view?.scores.vojo_score ?? 0);
    if (result && clipUri) {
      try {
        await saveRecording(newRecordingId(), prompt.text, clipUri, result);
        bumpRecordings();
      } catch (e) {
        console.warn('could not save recording', e);
      }
    }
    router.back();
  };

  const label =
    phase === 'warn' ? 'Before you start' : phase === 'think' ? 'Think' : phase === 'countdown' ? 'Get set' : phase === 'record' ? 'Speak' : phase === 'grading' ? 'Grading' : phase === 'error' ? 'Hmm' : 'Results';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SceneBackdrop region={phase === 'results' ? 'cove' : 'path'} />
      <View style={styles.top}>
        <Pressable onPress={close} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Image source={require('@/assets/icons/close.png')} style={{ width: 38, height: 38 }} contentFit="contain" />
        </Pressable>
        <Text style={type.label}>{label}</Text>
        <View style={{ width: 52 }} />
      </View>

      {phase === 'warn' && (
        <View style={styles.body}>
          <View style={stage}><MojoVideo pose="speaking" size={MOJO} /></View>
          <View style={styles.lower}>
          <Animated.View entering={FadeIn.duration(350)} style={styles.warnCard}>
            <Text style={[type.label, { color: colors.accent }]}>Heads up</Text>
            <Text style={[type.title, { marginTop: spacing.sm }]}>The prompt stays hidden until you continue.</Text>
            <Text style={[type.body, { marginTop: spacing.sm, color: colors.muted }]}>
              {`The moment it appears, a ${prompt.thinkSeconds}-second timer starts. Get your answer ready. Then you speak for ${prompt.speakSeconds} seconds, and Mojo grades it.`}
            </Text>
          </Animated.View>
          </View>
          <View style={styles.footer}><ClayButton label="Reveal the prompt" variant="accent" onPress={() => { haptic.press(); setThinkStart(Date.now()); setPhase('think'); }} /></View>
        </View>
      )}

      {phase === 'think' && (
        <View style={styles.body}>
          <View style={ringStage}>
            <ProgressRing size={RING} stroke={12} progress={ring} color={colors.primarySoft}>
              <MojoVideo pose="thinking" size={MOJO} />
            </ProgressRing>
            <Animated.View entering={FadeIn} style={styles.bigWrap}>
              <TickTimer seconds={prompt.thinkSeconds} startedAt={thinkStart} direction="down" onDone={toCountdown} style={styles.big} />
            </Animated.View>
          </View>
          <View style={styles.lower}>
            <PromptCard text={prompt.text} tag={prompt.tag} sub={`Get your answer ready. Then ${prompt.speakSeconds} seconds to speak.`} reveal />
          </View>
          <View style={styles.footer}><ClayButton label="I'm ready now" variant="accent" onPress={toCountdown} /></View>
        </View>
      )}

      {phase === 'countdown' && (
        <View style={styles.body}>
          <View style={stage}>
            <Countdown onDone={startRecording} />
          </View>
          <View style={styles.lower}><Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>{prompt.text}</Text></View>
          <View style={styles.footer}><View style={{ height: 64 }} /></View>
        </View>
      )}

      {phase === 'record' && (
        <View style={styles.body}>
          <View style={ringStage}>
            <ProgressRing size={RING} stroke={12} progress={ring} color={colors.accent}>
              <MojoVideo pose="listening" size={MOJO} energySV={energy} />
            </ProgressRing>
            {recording && (
              <Animated.View entering={FadeIn} style={styles.bigWrap}>
                <TickTimer seconds={prompt.speakSeconds} startedAt={recStart} direction="down" onDone={finish} style={styles.big} />
              </Animated.View>
            )}
          </View>
          <View style={styles.lower}>
            <LiveMeter recorder={mic.recorder} active={recording} energy={energy} />
            <Text style={[type.small, { textAlign: 'center', marginTop: spacing.sm }]}>
              {recording ? 'Mojo is listening. Keep going.' : micDenied ? 'Vojo needs the microphone to hear you.' : 'Starting...'}
            </Text>
          </View>
          <View style={styles.footer}>
            {recording ? (
              <ClayButton label="I'm done" variant="primary" icon={require('@/assets/icons/check.png')} onPress={finish} />
            ) : micDenied ? (
              <ClayButton label="Allow microphone" variant="accent" icon={require('@/assets/icons/mic-lit.png')} onPress={() => { setMicDenied(false); startRecording(); }} />
            ) : (
              <View style={{ height: 64 }} />
            )}
          </View>
        </View>
      )}

      {phase === 'grading' && (
        <View style={styles.body}>
          <View style={ringStage}>
            <LoadingRing size={Math.round(RING * 0.78)} stroke={10}>
              <MojoVideo pose="thinking" size={Math.round(MOJO * 0.82)} />
            </LoadingRing>
          </View>
          <View style={[styles.lower, { justifyContent: 'center', alignItems: 'center' }]}>
            <StatusCycler lines={['Listening back...', 'Counting the ums...', 'Measuring your pace...', 'Reading your tone...', 'Checking you answered the prompt...', 'Writing your notes...']} every={2000} style={styles.loadingLine} />
            <Text style={[type.small, { textAlign: 'center', marginTop: spacing.sm }]}>Measured from your audio. Nothing is guessed.</Text>
          </View>
          <View style={styles.footer}><View style={{ height: 64 }} /></View>
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.body}>
          <View style={stage}><MojoVideo pose="worried" size={MOJO} /></View>
          <View style={styles.lower}>
          <View style={styles.warnCard}>
            <Text style={[type.label, { color: colors.accent }]}>Grading hit a snag</Text>
            <Text style={[type.body, { marginTop: spacing.sm, color: colors.muted }]}>{error}</Text>
          </View>
          </View>
          <View style={styles.footer}>
            {clipUri ? <ClayButton label="Try grading again" variant="accent" onPress={() => { haptic.press(); grade(clipUri); }} /> : <ClayButton label="Back" variant="ghost" onPress={close} />}
          </View>
        </View>
      )}

      {phase === 'results' && view && (
        <View style={styles.body}>
          <Confetti />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
            <ScoreCards data={view} final={result} />
          </ScrollView>
          <View style={styles.footer}><ClayButton label={result ? 'Finish' : 'Finish without notes'} variant={result ? 'accent' : 'ghost'} onPress={done} /></View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, zIndex: 10 },
  close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  warnCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.accentEdge, padding: spacing.lg },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  lower: { flex: 1, minHeight: 0, justifyContent: 'flex-end' },
  bigWrap: { position: 'absolute', bottom: 0 },
  big: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 46, color: colors.text },
  footer: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  loadingLine: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.text, textAlign: 'center' },
});
