import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Explainers } from '@/components/explainers';
import { SceneBackdrop } from '@/components/scene-backdrop';
import { colors, spacing, type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

/** How the Vojo score is built, category by category. */
export default function ScoringScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SceneBackdrop region="path" zoom={2.2} dim={0.8} blur={6} />
      <View style={styles.top}>
        <Pressable onPress={() => { haptic.tap(); router.back(); }} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Image source={require('@/assets/icons/close.png')} style={{ width: 38, height: 38 }} contentFit="contain" />
        </Pressable>
        <Text style={type.label}>How scoring works</Text>
        <View style={{ width: 52 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <Text style={[type.body, { color: colors.muted, marginBottom: spacing.md }]}>Everything measurable is measured from your audio. The coach only judges content and writes the notes. Tap a category.</Text>
        <Explainers />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, zIndex: 10 },
  close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
