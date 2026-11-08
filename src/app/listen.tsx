import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CinematicPlayer } from '@/components/cinematic-player';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { colors, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { audioUri, loadRecording, type RecordingRecord } from '@/lib/recordings';

/** Full-screen playback of one answer: Mojo, one sentence at a time, nothing else. Autoplays. */
export default function ListenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rec, setRec] = useState<RecordingRecord | null>(null);
  useEffect(() => {
    loadRecording(id).then(setRec);
  }, [id]);
  const uri = audioUri(id);
  const player = useAudioPlayer(uri ? { uri } : null, { updateInterval: 100 });
  useEffect(() => {
    if (!uri || !rec) return;
    const t = setTimeout(() => player.play(), 700);
    return () => clearTimeout(t);
  }, [uri, rec, player]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SceneBackdrop region="cove" zoom={2.3} dim={0.86} blur={8} />
      <View style={styles.top}>
        <Pressable onPress={() => { haptic.tap(); player.pause(); router.back(); }} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Image source={require('@/assets/icons/close.png')} style={{ width: 38, height: 38 }} contentFit="contain" />
        </Pressable>
        <Text style={type.label}>Your answer</Text>
        <View style={{ width: 52 }} />
      </View>
      {rec && uri ? (
        <CinematicPlayer player={player} result={rec.result} />
      ) : rec ? (
        <View style={styles.center}><Text style={type.body}>Audio for this session was not kept.</Text></View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, zIndex: 10 },
  close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
