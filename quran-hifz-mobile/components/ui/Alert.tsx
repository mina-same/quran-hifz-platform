import { Children } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { theme } from '@/lib/theme';

type Variant = 'success' | 'info' | 'warning' | 'error';

const COLORS: Record<Variant, { bg: string; border: string; text: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', text: '#1E40AF' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' },
};

interface Props {
  variant?: Variant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function Alert({ variant = 'info', icon, children }: Props) {
  const c = COLORS[variant];
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

const styles = StyleSheet.create({
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
});
