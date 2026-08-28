import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { medium } from '@/lib/haptics';

interface TabButtonProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  'aria-label'?: string;
}

/**
 * Tab-bar button for the "المزيد" tab, which opens a bottom sheet instead of
 * navigating anywhere.
 *
 * It replaces the earlier `listeners.tabPress` + `e.preventDefault()` approach:
 * the press never enters react-navigation's navigate path at all, so the empty
 * `more` route can never flash and the sheet opens on the very first tap.
 * `style` is passed straight through so the tab renders identically to its
 * siblings (react-navigation supplies the icon + label as `children`).
 */
export function createMoreTabButton(onPress: () => void) {
  return function MoreTabButton({ children, style, testID, 'aria-label': ariaLabel }: TabButtonProps) {
    return (
      <Pressable
        onPressIn={() => medium()}
        onPress={onPress}
        style={style}
        testID={testID}
        accessibilityRole="button"
        aria-label={ariaLabel}
      >
        {children}
      </Pressable>
    );
  };
}
