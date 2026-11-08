import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, TABS } from '@/components/ui/tab-bar';
import { colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { HomeScreen } from '@/screens/home';
import { JourneyScreen } from '@/screens/journey';
import { YouScreen } from '@/screens/you';

export const TAB_BAR_HEIGHT = 74;
const TONE: Record<string, string> = { today: colors.bg, journey: colors.water, you: colors.bg };

function hexToRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Three edge-to-edge pages side by side. Everything follows the live scroll position. */
export default function Root() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // `vojo://?tab=you` opens on a tab (deep links, dev previews).
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const initialTab = Math.max(0, TABS.findIndex((t) => t.key === tabParam));
  const [tab, setTab] = useState(initialTab);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const progress = useSharedValue(initialTab); // 0..2, fractional while dragging
  const lastIdx = useSharedValue(initialTab);

  const commit = useCallback((i: number) => {
    haptic.select();
    setTab(i);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const p = e.contentOffset.x / width;
      progress.value = p;
      const i = Math.round(p);
      if (i !== lastIdx.value) {
        lastIdx.value = i;
        runOnJS(commit)(i);
      }
    },
  });

  const goTo = (i: number) => {
    scroll.current?.scrollTo({ x: i * width, animated: true });
    if (i !== tab) {
      lastIdx.value = i;
      setTab(i);
    }
  };

  const waterStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1, 2], [0, 1, 0]) }));
  const tone = TONE[TABS[tab].key];

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.water }, waterStyle]} />
      <Animated.ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        contentOffset={{ x: initialTab * width, y: 0 }}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}>
        {TABS.map((t) => (
          <View key={t.key} style={{ width, overflow: 'hidden' }}>
            {t.key === 'today' ? <HomeScreen /> : t.key === 'journey' ? <JourneyScreen /> : <YouScreen />}
          </View>
        ))}
      </Animated.ScrollView>
      <View pointerEvents="box-none" style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <LinearGradient pointerEvents="none" colors={[hexToRgba(tone, 0), hexToRgba(tone, 0.92), tone]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <TabBar active={tab} progress={progress} onChange={goTo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 28 },
});
