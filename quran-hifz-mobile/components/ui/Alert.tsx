import { Children, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type Variant = 'success' | 'info' | 'warning' | 'error';

/** Alert's own vocabulary, mapped onto the theme's shared tone palette. */
const TONE_FOR: Record<Variant, 'green' | 'blue' | 'gold' | 'red'> = {
  success: 'green',
  info:    'blue',
  warning: 'gold',
  error:   'red',
};

interface Props {
  variant?: Variant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function Alert({ variant = 'info', icon, children }: Props) {
  const theme = useAppTheme();
  const c = theme.tone[TONE_FOR[variant]];

  const styles = useMemo(() => StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderRadius: theme.radius,
      padding: 14,
    },
    icon: { marginTop: 1 },
    content: { flex: 1 },
    text: {
      fontSize: 13,
      fontFamily: theme.fontCairo,
      lineHeight: 20,
    },
  }), [theme]);

  // Interpolated message text (`<Alert>عن غياب: {names} — ...</Alert>`) arrives as an
  // array of strings, not a single string — without wrapping those too, React Native
  // throws "Text strings must be rendered within a <Text> component".
  const parts = Children.toArray(children);
  const isTextOnly = parts.length > 0 && parts.every((p) => typeof p === 'string' || typeof p === 'number');
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        {isTextOnly ? (
          <Text style={[styles.text, { color: c.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
