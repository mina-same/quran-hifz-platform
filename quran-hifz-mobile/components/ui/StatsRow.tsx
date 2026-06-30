import { View, StyleSheet } from 'react-native';
import StatBox from './StatBox';

interface Stat {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}

interface Props {
  stats: Stat[];
}

export default function StatsRow({ stats }: Props) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <StatBox key={i} {...s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
