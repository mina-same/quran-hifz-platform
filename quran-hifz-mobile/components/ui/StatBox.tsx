import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function StatBox({ label, value, sub, color, icon }: Props) {
  const theme = useAppTheme();
  // Defaulted here rather than in the signature: a default parameter would be
  // evaluated against a frozen theme, and the accent has to follow the mode.
  const accent = color ?? theme.green;

  const styles = useMemo(() => StyleSheet.create({
    box: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: theme.radiusSm,
      padding: 14,
      borderTopWidth: 3,
      alignItems: 'center',
      ...(theme.mode === 'dark'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, borderTopWidth: 3 }
        : theme.shadow.sm),
    },
    icon: { marginBottom: 4 },
    value: {
      fontSize: 28,
      fontFamily: theme.fontCairoBold,
      lineHeight: 34,
    },
    label: {
      fontSize: 12,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      textAlign: 'center',
      marginTop: 2,
    },
    sub: {
      fontSize: 11,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginTop: 2,
    },
  }), [theme]);

  return (
    <View style={[styles.box, { borderTopColor: accent }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}
