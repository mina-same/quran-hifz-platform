import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * App-wide haptic feedback. Never import `expo-haptics` directly from a screen —
 * go through this module so the taxonomy stays consistent and the user's
 * "الاهتزاز عند اللمس" preference is honoured everywhere.
 *
 * Every helper is fire-and-forget: a haptic that fails must never throw into a
 * press handler and swallow the actual action, so each call catches its own
 * rejection.
 *
 * Android goes through `performAndroidHapticsAsync`, which maps onto the
 * platform's own HapticFeedbackConstants. The SDK 56 docs explicitly steer away
 * from impactAsync/notificationAsync on Android, since those fall back to the
 * raw Vibrator API and feel like a phone buzz rather than a UI tick.
 */

// Module-level (not store) state on purpose: press handlers call these
// synchronously and must not await a store/AsyncStorage read first.
let enabled = true;

// expo-haptics does support web via the browser Vibration API, but a buzzing
// web build is not wanted — native only, deliberately.
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const isAndroid = Platform.OS === 'android';

/** Mirrors the persisted `qh_haptics_enabled` preference. Called from portalStore. */
export function setHapticsEnabled(next: boolean) {
  enabled = next;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

function run(ios: () => Promise<void>, android: Haptics.AndroidHaptics) {
  if (!enabled || !supported) return;
  const fire = isAndroid ? () => Haptics.performAndroidHapticsAsync(android) : ios;
  fire().catch(() => {});
}

/** Ordinary press: buttons, cards, list rows, tab bar. The default. */
export function tap() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    Haptics.AndroidHaptics.Virtual_Key,
  );
}

/** Value change: segmented tabs, filters, pickers, switches, checkboxes. */
export function select() {
  run(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Segment_Tick);
}

/** Weightier press: long-press, opening a sheet, destructive confirm, record start/stop. */
export function medium() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Long_Press,
  );
}

/** A mutation settled successfully. */
export function success() {
  run(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/** A mutation settled with a recoverable warning. */
export function warning() {
  run(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    Haptics.AndroidHaptics.Reject,
  );
}

/** A mutation failed, or input was rejected. */
export function error() {
  run(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    Haptics.AndroidHaptics.Reject,
  );
}

/** Named export bundle, so call sites can read as `haptics.tap()`. */
export const haptics = { tap, select, medium, success, warning, error };
