import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { tap, select, medium } from '@/lib/haptics';

type HapticKind = 'tap' | 'select' | 'medium' | 'none';

export interface Props extends PressableProps {
  /**
   * Which feedback to fire. 'tap' (default) for actions, 'select' for value
   * changes (filters, toggles, option pickers), 'medium' for heavier moments,
   * 'none' when the screen fires its own haptic and this would double up.
   */
  haptic?: HapticKind;
}

const FIRE: Record<Exclude<HapticKind, 'none'>, () => void> = { tap, select, medium };

/**
 * Drop-in replacement for react-native's <Pressable> that vibrates on press.
 *
 * Fires on **onPressIn**, not onPress: at finger-down the feedback lands with
 * the touch instead of trailing it, which is what makes a tap feel physical
 * rather than laggy. The trade-off is a buzz on a press the user drags away
 * from and cancels — standard iOS behaviour.
 *
 * `onLongPress` presses get a medium impact, since a long-press has no other
 * signal that it registered.
 */
export default function Pressable({ haptic = 'tap', onPressIn, onLongPress, disabled, ...rest }: Props) {
  return (
    <RNPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && haptic !== 'none') FIRE[haptic]();
        onPressIn?.(e);
      }}
      onLongPress={
        onLongPress
          ? (e) => {
              if (!disabled) medium();
              onLongPress(e);
            }
          : undefined
      }
    />
  );
}
