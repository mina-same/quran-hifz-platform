import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';

interface Props {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showPercent?: boolean;
}

export default function ProgressBar({
  value, max = 100, label, color = theme.green, showPercent = true,
}: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={styles.wrapper}>
      {(label || showPercent) && (
        <View style={styles.row}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercent && <Text style={styles.pct}>{pct}%</Text>}
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: theme.textMuted,
    fontFamily: theme.fontCairo,
  },
  pct: {
    fontSize: 12,
    color: theme.text,
    fontFamily: theme.fontCairoBold,
  },
  track: {
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
