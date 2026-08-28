import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { textStart } from '@/lib/theme';

/**
 * Drop-in replacement for react-native's <Text> that starts every line at the
 * right, where Arabic reads from.
 *
 * The app forces RTL, and RN then swaps left/right text alignment — so a bare
 * <Text> (and, worse, one that says `textAlign: 'right'`) ends up visually
 * LEFT-aligned. See the `textStart` / `textEnd` comment in lib/theme.ts.
 *
 * The base style comes first in the array, so any `textAlign` a call site passes
 * — 'center' for a banner, `textEnd` for a deliberate flush-left label — still wins.
 */
export default function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { textAlign: textStart },
});
