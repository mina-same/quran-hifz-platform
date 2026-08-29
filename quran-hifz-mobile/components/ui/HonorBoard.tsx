import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export interface HonorRow {
  id: string;
  name: string;
  value: number | string;
}

interface Props {
  /** Exactly the top 3, already sorted best-first. Degrades gracefully with fewer than 3. */
  top3: HonorRow[];
}

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_HEIGHT = [64, 44, 32]; // rank1, rank2, rank3

/** Podium-style top-3 showcase. Displayed as [rank2, rank1, rank3] so with RTL row layout
 * rank 1 lands center, rank 2 on the visual right, rank 3 on the visual left. */
export default function HonorBoard({ top3 }: Props) {
  const theme = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
    col: { flex: 1, alignItems: 'center', gap: 4 },
    medal: { fontSize: 20 },
    name: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, maxWidth: 90 },
    value: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    bar: { width: '100%', borderRadius: theme.radiusSm, marginTop: 4 },
  }), [theme]);

  // Silver reads as a light grey in light mode and a dimmer slate in dark mode.
  const podiumColor = (rank: number) => {
    if (rank === 0) return theme.gold;
    if (rank === 1) return theme.mode === 'dark' ? '#64748B' : '#CBD5E1';
    return theme.brown;
  };

  if (top3.length === 0) return null;

  // original index (0,1,2) drives medal/height regardless of display order below.
  const display = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <View style={styles.row}>
      {display.map((row) => {
        const rank = top3.indexOf(row);
        return (
          <View key={row.id} style={styles.col}>
            <Text style={styles.medal}>{MEDAL[rank] ?? `#${rank + 1}`}</Text>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            <Text style={styles.value}>{row.value}</Text>
            <View style={[styles.bar, { height: PODIUM_HEIGHT[rank] ?? 32, backgroundColor: podiumColor(rank) }]} />
          </View>
        );
      })}
    </View>
  );
}
