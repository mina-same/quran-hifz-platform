import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function StatBox({ label, value, sub, color = theme.green, icon }: Props) {
  return (
    <View style={[styles.box, { borderTopColor: color }]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radiusSm,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
});
