import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClayButton } from '@/components/clay-button';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { ScoreCards } from '@/components/score-cards';
import { colors, fonts, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { audioUri, deleteRecording, loadRecording, setPinned, type RecordingRecord } from '@/lib/recordings';
import { useVojo } from '@/store/vojo';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** One past session: play it back, read the transcript with fillers lit, and see the full scorecard again. */
export default function ReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rec, setRec] = useState<RecordingRecord | null>(null);
  const bump = useVojo((s) => s.bumpRecordings);
  useEffect(() => {
    loadRecording(id).then(setRec);
  }, [id]);
  const uri = audioUri(id);

  if (!rec) return <SafeAreaView style={styles.safe} />;
  const r = rec.result;
  const pin = async () => {
    haptic.tap();
    await setPinned(rec.id, !rec.pinned);
    setRec({ ...rec, pinned: !rec.pinned });
    bump();
  };
  const remove = () => {
    haptic.warn();
    deleteRecording(rec.id);
    bump();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SceneBackdrop region="cove" zoom={2.2} dim={0.78} blur={6} />
      <View style={styles.top}>
        <Pressable onPress={() => { haptic.tap(); router.back(); }} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Image source={require('@/assets/icons/close.png')} style={{ width: 38, height: 38 }} contentFit="contain" />
        </Pressable>
        <Text style={type.label}>{fmtDate(rec.date)}</Text>
        <Pressable onPress={pin} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel={rec.pinned ? 'Unpin' : 'Pin'}>
          <Text style={[styles.pin, rec.pinned && { color: colors.accent }]}>{rec.pinned ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.prompt}>{rec.prompt}</Text>
        <View style={{ marginBottom: spacing.md }}>
          <ClayButton label="Listen to your answer" variant="accent" disabled={!uri} onPress={() => { haptic.press(); router.push({ pathname: '/listen', params: { id: rec.id } }); }} />
          {!uri && <Text style={[type.small, { textAlign: 'center', marginTop: 6 }]}>Audio for this session was not kept.</Text>}
        </View>
        <ScoreCards data={r} final={r} mojo={false} animate={false} label="VOJO SCORE" />
        <ClayButton label="Delete this recording" variant="ghost" onPress={remove} />
        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, zIndex: 10 },
  close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  pin: { fontSize: 28, color: colors.muted, lineHeight: 32 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  prompt: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, color: colors.text, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
});
