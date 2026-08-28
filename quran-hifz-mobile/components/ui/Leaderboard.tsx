import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { theme } from '@/lib/theme';
import ProgressBar from './ProgressBar';

export interface LeaderboardRow {
  id: string;
  name: string;
  value: number;
  max?: number;
  sub?: string;
}

interface Props {
  rows: LeaderboardRow[];
  variant?: 'leader' | 'watch';
}

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('');
}

/** Ranked list with an avatar + inline meter per row — variant 'leader' (top achievers) or 'watch' (needs-attention). */
export default function Leaderboard({ rows, variant = 'leader' }: Props) {
  const tone = variant === 'leader' ? theme.green : theme.red;

  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <View key={row.id} style={[styles.row, i > 0 && styles.rowBorder]}>
          <Text style={styles.rank}>{i + 1}</Text>
          <View style={[styles.avatar, { backgroundColor: variant === 'leader' ? theme.greenPale : theme.redPale }]}>
            <Text style={[styles.avatarText, { color: tone }]}>{initialsOf(row.name)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            {row.sub && <Text style={styles.sub} numberOfLines={1}>{row.sub}</Text>}
            <ProgressBar value={row.value} max={row.max ?? 100} color={tone} showPercent={false} />
          </View>
          <Text style={[styles.value, { color: tone }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  rank: { width: 16, fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted, textAlign: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontFamily: theme.fontCairoBold },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
  sub: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  value: { fontSize: 14, fontFamily: theme.fontCairoBold, minWidth: 30, textAlign: 'left' },
});
