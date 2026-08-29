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
  /** 1 = half-width tile, 2 = full-width tile — mirrors the web BentoTile's span prop. */
  span?: 1 | 2;
}

/** Flat bento-grid tile: small uppercase eyebrow label instead of a bordered CardHeader row. Place inside a flexWrap row. */
export default function Tile({ label, value, sub, color, icon, span = 1 }: Props) {
  const theme = useAppTheme();
  const accent = color ?? theme.green;

  const styles = useMemo(() => StyleSheet.create({
    tile: {
      backgroundColor: theme.card,
      borderRadius: theme.radius,
      padding: 14,
      ...(theme.mode === 'dark'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }
        : theme.shadow.sm),
    },
    span1: { width: '48%' },
    span2: { width: '100%' },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    eyebrow: {
      fontSize: 10,
      fontFamily: theme.fontCairoBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    value: { fontSize: 22, fontFamily: theme.fontCairoBold },
    sub: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
  }), [theme]);

  return (
    <View style={[styles.tile, span === 2 ? styles.span2 : styles.span1]}>
      <View style={styles.head}>
        <Text style={styles.eyebrow} numberOfLines={1}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>{value}</Text>
      {sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

export const tileGridStyle = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 };
