import { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function Card({ children, noPadding, style, ...rest }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: theme.radius,
      padding: 16,
      // A drop shadow reads as nothing on a near-black background, so dark mode
      // separates the card from the page with a hairline border instead.
      ...(theme.mode === 'dark'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }
        : theme.shadow.md),
    },
    noPadding: {
      padding: 0,
    },
  }), [theme]);

  return (
    <View style={[styles.card, noPadding && styles.noPadding, style]} {...rest}>
      {children}
    </View>
  );
}
