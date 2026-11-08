import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

type Variant = 'primary' | 'accent' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: number;
};

const FACE: Record<Variant, string> = {
  primary: colors.primary,
  accent: colors.accent,
  ghost: colors.card,
};
const EDGE: Record<Variant, string> = {
  primary: colors.primaryEdge,
  accent: colors.accentEdge,
  ghost: colors.cardEdge,
};

const DEPTH = 6;

/**
 * Chunky Duolingo-style button: a lit face sitting on a darker edge that presses down into it.
 * No animation library on purpose: Pressable's own pressed state drives the push, so nothing else
 * animating on the screen can interfere with how it renders.
 */
export function ClayButton({ label, onPress, variant = 'primary', disabled, style, icon }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.wrap, disabled && { opacity: 0.5 }, style]}>
      {({ pressed }) => (
        <>
          <View style={[styles.edge, { backgroundColor: EDGE[variant] }]} />
          <View style={[styles.face, { backgroundColor: FACE[variant] }, pressed && styles.facePressed]}>
            <View style={styles.row}>
              {icon ? <Image source={icon} style={{ width: 28, height: 28 }} contentFit="contain" /> : null}
              <Text style={[styles.label, variant === 'ghost' && { color: colors.muted }]}>{label}</Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 58 + DEPTH, width: '100%' },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    height: 58,
    borderRadius: radius.md,
  },
  face: {
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.28)',
  },
  facePressed: { transform: [{ translateY: DEPTH }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.text,
    letterSpacing: 0.3,
  },
});
