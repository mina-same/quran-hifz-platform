import { useId, useMemo, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import Text from '@/components/ui/Text';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

export interface ReportChartPoint {
  label: string;
  value: number;
}

interface Props {
  data: ReportChartPoint[];
  /** Line/area colour (pass a theme token). */
  color: string;
  height?: number;
  /** Y domain is fixed at [0, yMax] — web's charts use [0, 10]. */
  yMax?: number;
  /** Fill the area under the line with a fading gradient (web AreaChart). */
  area?: boolean;
  /** Name shown with the tapped value — web's tooltip series label. */
  valueLabel?: string;
}

const PAD_LEFT = 26;
const PAD_RIGHT = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;

/** Phone port of web's recharts Area/Line trend charts: horizontal grid, 0–yMax
 * Y axis, date X axis (thinned to fit), dots, and tap-a-point to show its value
 * in place of the hover tooltip. Drawn LTR (time runs left → right like web). */
export default function ReportChartLine({ data, color, height = 200, yMax = 10, area = false, valueLabel }: Props) {
  const theme = useAppTheme();
  const gradId = `rcl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const s = useMemo(() => StyleSheet.create({
    tip: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.text, textAlign: 'center', marginTop: 6, minHeight: 18 },
    tipBold: { fontFamily: theme.fontCairoBold },
  }), [theme]);

  const plotW = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const n = data.length;
  const xOf = (i: number) => PAD_LEFT + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (v: number) => PAD_TOP + plotH - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax * 10) / 10);
  // Thin the X labels so at most ~5 fit on a phone width.
  const labelEvery = Math.max(1, Math.ceil(n / 5));

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.value)}`).join(' ');
  const areaPath = n > 0 ? `${linePath} L${xOf(n - 1)},${yOf(0)} L${xOf(0)},${yOf(0)} Z` : '';
  const colW = n > 1 ? plotW / (n - 1) : plotW;
  const sel = picked !== null && picked < n ? data[picked] : null;

  return (
    <View>
      <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {area && (
              <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
            )}
            {ticks.map((t) => (
              <Line key={`g${t}`} x1={PAD_LEFT} x2={PAD_LEFT + plotW} y1={yOf(t)} y2={yOf(t)} stroke={theme.border} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <SvgText key={`y${t}`} x={PAD_LEFT - 6} y={yOf(t) + 4} fontSize={10} fill={theme.textMuted} textAnchor="end">
                {String(t)}
              </SvgText>
            ))}
            {data.map((d, i) => i % labelEvery === 0 ? (
              <SvgText key={`x${i}`} x={xOf(i)} y={height - 6} fontSize={10} fill={theme.textMuted} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null)}
            {area && n > 1 && <Path d={areaPath} fill={`url(#${gradId})`} />}
            {n > 1 && <Path d={linePath} fill="none" stroke={color} strokeWidth={2} />}
            {picked !== null && picked < n && (
              <Line x1={xOf(picked)} x2={xOf(picked)} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={theme.textMuted} strokeWidth={1} strokeDasharray="3 3" />
            )}
            {data.map((d, i) => (
              <Circle key={`d${i}`} cx={xOf(i)} cy={yOf(d.value)} r={picked === i ? 6 : 4} fill={color} stroke={theme.card} strokeWidth={2} />
            ))}
            {/* Invisible per-point hit columns — tap stands in for web's hover tooltip. */}
            {data.map((_, i) => (
              <Rect
                key={`h${i}`}
                x={xOf(i) - colW / 2}
                y={0}
                width={Math.max(colW, 1)}
                height={height}
                fill="transparent"
                onPress={() => setPicked(picked === i ? null : i)}
              />
            ))}
          </Svg>
        )}
      </View>
      <Text style={s.tip}>
        {sel ? (
          <>
            {sel.label} — {valueLabel ? `${valueLabel}: ` : ''}<Text style={s.tipBold}>{sel.value}</Text>
          </>
        ) : ' '}
      </Text>
    </View>
  );
}
