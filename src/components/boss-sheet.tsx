import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { colors, fonts, radius, spacing, type } from '@/constants/theme';
import { BOSS_TOPIC } from '@/data/prompts';
import { DOUBTER } from '@/data/boss-lines';
import { haptic } from '@/lib/haptics';
import { ClayButton } from './clay-button';
import { ClipLoop } from './clip-loop';
import { Glow } from './glow';

type Props = { unlocked: boolean; daysLeft: number; week: number; onClose: () => void; onFight: () => void };

/** Tap the Doubter on the island: he rises up and explains what is coming. */
export function BossSheet({ unlocked, daysLeft, week, onClose, onFight }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { haptic.tap(); onClose(); }} />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(220)} style={styles.sheet}>
        <View style={styles.bossWrap}>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: -70 }}><Glow size={360} color={colors.cyan} strength={1.2} /></View>
          <ClipLoop source={require('@/assets/bosses/doubter/video/taunting.mov')} width={210} height={257} />
        </View>
        <Text style={[type.label, { color: colors.cyan, textAlign: 'center' }]}>{DOUBTER.title}</Text>
        <Text style={[styles.name]}>{DOUBTER.name}</Text>
        <Text style={[type.body, { textAlign: 'center', marginTop: spacing.sm }]}>
          {`He rules this season. Every week ends with a fight: three rounds, thirty seconds each. Beat him four times to clear the season. This is week ${week} of 4. He argues:`}
        </Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>&ldquo;{BOSS_TOPIC}&rdquo;</Text>
        </View>
        <View style={styles.lockRow}>
          {!unlocked && <Image source={require('@/assets/icons/lock.png')} style={{ width: 22, height: 22 }} contentFit="contain" />}
          <Text style={[type.small, { textAlign: 'center' }]}>
            {unlocked ? 'He is ready when you are.' : `Finish ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'} to unlock the fight.`}
          </Text>
        </View>
        {unlocked ? (
          <ClayButton label="Face the Doubter" variant="primary" onPress={onFight} />
        ) : (
          <ClayButton label="Keep training" variant="ghost" onPress={() => { haptic.tap(); onClose(); }} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(7,10,25,0.72)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bgRaised, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    borderWidth: 1.5, borderColor: colors.boss, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm,
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  bossWrap: { alignItems: 'center', justifyContent: 'flex-end', marginTop: -150, marginBottom: spacing.xs },
  name: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.text, textAlign: 'center' },
  quote: { backgroundColor: colors.bossDeep, borderRadius: radius.md, borderWidth: 1, borderColor: colors.boss, padding: spacing.md, marginVertical: spacing.md },
  quoteText: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 23, color: colors.cyan, textAlign: 'center' },
});
