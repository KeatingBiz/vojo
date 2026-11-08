import * as Haptics from 'expo-haptics';

// Every tap in Vojo makes a sound you can feel. Fire-and-forget; errors (simulator, web) are ignored.
const quiet = (p: Promise<void>) => p.catch(() => {});
export const haptic = {
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  select: () => quiet(Haptics.selectionAsync()),
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
