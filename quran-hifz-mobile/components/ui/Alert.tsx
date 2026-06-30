import { View, Text, StyleSheet } from 'react-native';
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
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        {typeof children === 'string' ? (
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
