import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

interface Props {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showPercent?: boolean;
}

export default function ProgressBar({ value, max = 100, label, color, showPercent = true }: Props) {
  const theme = useAppTheme();
  const fill = color ?? theme.greenAccent;
  const pct = Math.min(100, Math.round((value / max) * 100));

  const styles = useMemo(() => StyleSheet.create({
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
      backgroundColor: theme.mode === 'dark' ? theme.cardAlt : theme.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
  }), [theme]);

  return (
    <View style={styles.wrapper}>
      {(label || showPercent) && (
        <View style={styles.row}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercent && <Text style={styles.pct}>{pct}%</Text>}
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}
