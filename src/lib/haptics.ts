import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

/**
 * Every call is fire-and-forget and swallows failures — a device without a
 * haptic motor should never break an interaction. Vibration is a garnish.
 */
const fire = (fn: () => Promise<void>) => {
  if (!enabled || Platform.OS === 'web') return;
  void fn().catch(() => undefined);
};

export const haptics = {
  /** Taps, chips, toggles. */
  light: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Committing something — completing a set, adding an exercise. */
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Session start/finish. Used sparingly so it keeps its weight. */
  heavy: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** PR celebration — three ascending taps. Worth the extra ceremony. */
  celebrate: () => {
    if (!enabled || Platform.OS === 'web') return;
    void (async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await new Promise((r) => setTimeout(r, 90));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise((r) => setTimeout(r, 90));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore — device has no haptic engine.
      }
    })();
  },
};
