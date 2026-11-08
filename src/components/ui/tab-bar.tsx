import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { colors, fonts, radius } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

export type TabKey = 'today' | 'journey' | 'you';
export const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'journey', label: 'Journey' },
  { key: 'you', label: 'You' },
];

const PAD = 6;
const MARGIN = 16;

const ICONS: Record<TabKey, { lit: number; off: number }> = {
  today: { lit: require('@/assets/icons/lock-lit.png'), off: require('@/assets/icons/lock-off.png') },
  journey: { lit: require('@/assets/icons/path-lit.png'), off: require('@/assets/icons/path-off.png') },
  you: { lit: require('@/assets/icons/mojo-lit.png'), off: require('@/assets/icons/mojo-off.png') },
};

/** Clay icon whose lit version fades in as the pager approaches this tab. */
function TabIcon({ name, index, progress }: { name: TabKey; index: number; progress: SharedValue<number> }) {
  // True crossfade: the off icon fades out as the lit one fades in, so differing silhouettes never stack.
  const lit = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.abs(progress.value - index)) }));
  const off = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(progress.value - index)) }));
  const SIZE = 30;
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Animated.View style={[{ position: 'absolute', width: SIZE, height: SIZE }, off]}>
        <Image source={ICONS[name].off} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width: SIZE, height: SIZE }, lit]}>
        <Image source={ICONS[name].lit} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

type Props = { active: number; progress: SharedValue<number>; onChange: (i: number) => void };

/** Bottom tabs. The highlight pill tracks the pager's scroll position live. */
export function TabBar({ active, progress, onChange }: Props) {
  const { width } = useWindowDimensions();
  const inner = width - MARGIN * 2 - PAD * 2;
  const tabW = inner / TABS.length;
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, TABS.length - 1], [0, tabW * (TABS.length - 1)]) }],
  }));
  return (
    <View style={styles.bar}>
      <Animated.View pointerEvents="none" style={[styles.pill, { width: tabW }, pill]} />
      {TABS.map((t, i) => {
        const on = i === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              haptic.select();
              onChange(i);
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}>
            <TabIcon name={t.key} index={i} progress={progress} />
            <Text style={[styles.label, on && { color: colors.text }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22,20,50,0.78)',
    borderRadius: radius.lg,
    padding: PAD,
    marginHorizontal: MARGIN,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  pill: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.md, backgroundColor: 'rgba(42,39,80,0.9)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, gap: 3 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.faint },
});
