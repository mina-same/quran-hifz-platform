import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Svg, { Circle, G } from 'react-native-svg';
import { theme } from '@/lib/theme';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
}

/** Multi-segment ring chart with a centered label — the mobile-native equivalent of the web's recharts-based Donut. */
export default function Donut({ data, size = 140, strokeWidth = 16, centerLabel, centerValue, showLegend = true }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetSoFar = 0;

  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {total === 0 || data.length === 0 ? (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={theme.border}
                strokeWidth={strokeWidth}
                fill="none"
              />
            ) : (
              data.map((slice, i) => {
                const fraction = slice.value / total;
                const dash = fraction * circumference;
                const circle = (
                  <Circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offsetSoFar}
                    strokeLinecap={data.length > 1 ? 'butt' : 'round'}
                    fill="none"
                  />
                );
                offsetSoFar += dash;
                return circle;
              })
            )}
          </G>
        </Svg>
        {(centerLabel || centerValue !== undefined) && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {centerValue !== undefined && <Text style={styles.centerValue}>{centerValue}</Text>}
            {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          </View>
        )}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {data.map((slice, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{slice.label}</Text>
              <Text style={styles.legendValue}>{slice.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerValue: { fontSize: 22, fontFamily: theme.fontCairoBold, color: theme.text },
  centerLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  legendValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
});
