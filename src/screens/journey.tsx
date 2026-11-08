import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BossSheet } from '@/components/boss-sheet';
import { Island } from '@/components/island';
import { colors, fonts, type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useVojo } from '@/store/vojo';

export function JourneyScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { completed, dayIndex, week, season } = useVojo();
  const [showBoss, setShowBoss] = useState(false);
  const pageH = height;
  const unlocked = dayIndex === 6;

  const onNode = (i: number) => {
    if (i > dayIndex) return;
    if (i === dayIndex) return router.push('/session');
    haptic.tap();
  };

  return (
    <View style={{ width, height: pageH, backgroundColor: colors.water }}>
      <Island width={width} height={pageH} completed={completed} current={dayIndex} onNode={onNode} onBoss={() => setShowBoss(true)} />
      <View pointerEvents="none" style={[styles.header, { top: insets.top + 30 }]}>
        <Text style={[type.label, { textAlign: 'center' }]}>{`Season ${season}  ·  Week ${week} of 4`}</Text>
        <Text style={styles.title}>The Doubter&apos;s Shore</Text>
      </View>
      {showBoss && (
        <BossSheet
          unlocked={unlocked}
          daysLeft={6 - dayIndex}
          week={week}
          onClose={() => setShowBoss(false)}
          onFight={() => { setShowBoss(false); router.push('/boss'); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.text, textAlign: 'center', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
});
