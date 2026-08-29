import { useMemo } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export type BadgeVariant = 'green' | 'gold' | 'red' | 'blue' | 'gray';

interface Props {
  label: string;
  variant?: BadgeVariant;
  /**
   * A chip is one line by default: a long label (a full special-track title, a
   * masjid name) ellipsizes instead of running off the edge of a phone screen.
   */
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ label, variant = 'gray', numberOfLines = 1, style }: Props) {
  const theme = useAppTheme();
  // theme.tone carries a bg/border/text triple per variant in BOTH modes, so the
  // badge no longer hard-codes light pastels that stayed bright in dark mode.
  const v = theme.tone[variant];

  const styles = useMemo(() => StyleSheet.create({
    badge: {
      borderRadius: theme.radiusFull,
      paddingHorizontal: 10,
      paddingVertical: 3,
      alignSelf: 'flex-start',
      // Shrink before overflowing: only bites when the row runs out of width.
      flexShrink: 1,
      maxWidth: '100%',
    },
    text: {
      fontSize: 11,
      fontFamily: theme.fontCairoBold,
    },
  }), [theme]);

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]} numberOfLines={numberOfLines}>{label}</Text>
    </View>
  );
}
