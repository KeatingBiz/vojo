import type { AudioPlayer } from 'expo-audio';
import { useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, withTiming } from 'react-native-reanimated';

import { MojoVideo, type MojoPose } from '@/components/mojo-video';
import { colors, fonts, spacing, type } from '@/constants/theme';
import type { Analysis } from '@/lib/api';
import { haptic } from '@/lib/haptics';

type Props = { player: AudioPlayer; result: Analysis; onEnded?: () => void };
type Sentence = { from: number; to: number; start_ms: number; end_ms: number };

const REACT_MS = 1100;

function sentences(words: Analysis['words']): Sentence[] {
  const out: Sentence[] = [];
  let from = 0;
  words.forEach((w, i) => {
    const last = i === words.length - 1;
    if (last || /[.?!]$/.test(w.text.trim())) {
      out.push({ from, to: i, start_ms: words[from].start_ms, end_ms: w.end_ms });
      from = i + 1;
    }
  });
  return out;
}

/**
 * Your answer as a scene: Mojo listens and reacts, and the transcript arrives one sentence at a time,
 * each word lighting as it is spoken, the previous line gone. Subscribes to the player at 10 Hz.
 */
export function CinematicPlayer({ player, result, onEnded }: Props) {
  const status = useAudioPlayerStatus(player);
  const t = status.currentTime * 1000;
  const playing = status.playing;
  const ended = !playing && status.duration > 0 && status.currentTime >= status.duration - 0.25;
  const words = result.words;
  const lines = useMemo(() => sentences(words), [words]);

  // Current word and sentence.
  let idx = -1;
  for (let k = 0; k < words.length; k++) {
    if (words[k].start_ms <= t) idx = k;
    else break;
  }
  const inWord = idx >= 0 && t <= words[idx].end_ms + 60;
  let sIdx = 0;
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].start_ms - 250 <= t) sIdx = k;
    else break;
  }
  const line = lines[sIdx];

  // Mojo: glow with speech, flinch on fillers.
  const energy = useSharedValue(0);
  useEffect(() => {
    energy.set(withTiming(playing ? (inWord ? 0.7 : 0.15) : 0, { duration: 120 }));
  }, [playing, inWord, energy]);
  const [reaction, setReaction] = useState<MojoPose | null>(null);
  const lastFiller = useRef(-1);
  useEffect(() => {
    if (!playing) return;
    if (idx >= 0 && idx !== lastFiller.current && words[idx].is_filler) {
      lastFiller.current = idx;
      haptic.tap();
      setReaction('worried');
      const id = setTimeout(() => setReaction(null), REACT_MS);
      return () => clearTimeout(id);
    }
  }, [idx, playing, words]);
  useEffect(() => {
    if (status.currentTime < 0.3) lastFiller.current = -1;
  }, [status.currentTime]);
  const endedRef = useRef(false);
  useEffect(() => {
    if (ended && !endedRef.current) {
      endedRef.current = true;
      haptic.success();
      onEnded?.();
    }
    if (!ended) endedRef.current = false;
  }, [ended, onEnded]);
  const pose: MojoPose = ended ? (result.scores.vojo_score >= 65 ? 'celebrating' : 'idle') : reaction ?? (playing ? 'listening' : 'idle');

  const toggle = () => {
    haptic.press();
    if (playing) player.pause();
    else {
      if (ended) player.seekTo(0);
      player.play();
    }
  };
  const progress = status.duration ? status.currentTime / status.duration : 0;

  return (
    <Pressable style={styles.wrap} onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'}>
      <View style={styles.stage}><MojoVideo pose={pose} size={230} energySV={energy} /></View>
      <View style={styles.lineWrap}>
        {ended ? (
          <Animated.View key="end" entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
            <Text style={styles.endLabel}>VOJO SCORE</Text>
            <Text style={styles.endScore}>{result.scores.vojo_score}</Text>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{result.feedback.headline}</Text>
          </Animated.View>
        ) : line ? (
          <Animated.Text key={sIdx} entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)} style={styles.line}>
            {words.slice(line.from, line.to + 1).map((w, k) => {
              const i = line.from + k;
              const spoken = i <= idx;
              return (
                <Text key={i} style={[styles.word, spoken && styles.spoken, w.is_filler && (spoken ? styles.fillerHit : styles.fillerDim), i === idx && inWord && playing && styles.now]}>
                  {(k ? ' ' : '') + w.text}
                </Text>
              );
            })}
          </Animated.Text>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0.5, progress * 100)}%` }]} /></View>
        <Text style={styles.hint}>{playing ? 'tap to pause' : ended ? 'tap to play again' : 'tap to play'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.lg },
  stage: { alignItems: 'center', justifyContent: 'center', height: 260, marginTop: spacing.sm },
  lineWrap: { flex: 1, justifyContent: 'center', minHeight: 160 },
  line: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 36, textAlign: 'center' },
  word: { color: 'rgba(165,163,196,0.45)' },
  spoken: { color: colors.text },
  now: { color: colors.primarySoft },
  fillerDim: { color: 'rgba(249,115,22,0.4)' },
  fillerHit: { color: colors.accent },
  endLabel: { fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 2.6, color: colors.accent },
  endScore: { fontFamily: fonts.displayBold, fontSize: 72, lineHeight: 80, color: colors.text },
  bottom: { paddingBottom: spacing.md, gap: 8 },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(42,39,80,0.9)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  hint: { ...type.small, textAlign: 'center' },
});
