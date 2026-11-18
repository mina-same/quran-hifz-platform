import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Text from '@/components/ui/Text';
import BottomSheet from '@/components/ui/BottomSheet';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { useEvaluations } from '@/lib/queries/evaluations';
import type { RankStudent } from '@/lib/queries/rankings';
import { AR_LOCALE } from '@/lib/date';

function num(n: number): string {
  return String(Number.isInteger(n) ? n : Number(n.toFixed(2)));
}

/**
 * Where a student's numbers in «لوحة الشرف» come from (web: StudentPointsModal):
 * every evaluated day in the report's period as a card — attendance, each
 * criterion, the day's total.
 */
export default function StudentPointsSheet({
  student, from, to, onClose,
}: {
  student: RankStudent | null;
  from: string | null;
  to: string;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => StyleSheet.create({
    list: { flex: 1 },
    content: { padding: 16, gap: 10, paddingBottom: 40 },
    name: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.text },
    track: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    stats: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, backgroundColor: theme.cardAlt, borderRadius: theme.radiusSm, padding: 10, gap: 2 },
    statVal: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.green },
    statLbl: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    day: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 10, gap: 6 },
    dayOff: { opacity: 0.55 },
    dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayDate: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    dayTotal: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.green },
    crits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    crit: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, backgroundColor: theme.cardAlt, borderRadius: theme.radiusFull, paddingHorizontal: 8, paddingVertical: 2 },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },
    sum: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  }), [theme]);

  const { data: rows = [], isLoading } = useEvaluations(
    student ? { student: student.id, ...(from ? { from } : {}), to } : undefined,
  );
  const days = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const present = days.filter((d) => d.attendanceStatus === 'حاضر').length;
  const absent = days.filter((d) => d.attendanceStatus === 'غائب').length;
  const excused = days.filter((d) => d.attendanceStatus === 'مستأذن').length;

  return (
    <BottomSheet visible={!!student} onClose={onClose} snapPoints={['85%']} rawContent>
      <BottomSheetScrollView style={s.list} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {student && (
          <>
            <View>
              <Text style={s.name}>{student.name}</Text>
              <Text style={s.track}>{student.trackTitle}</Text>
            </View>
            <View style={s.stats}>
              <View style={s.stat}>
                <Text style={s.statVal}>{num(student.points)}</Text>
                <Text style={s.statLbl}>النقاط = مجموع درجات الأيام</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{Math.round(student.avg10 * 10)}٪</Text>
                <Text style={s.statLbl}>المتوسط في أيام الحضور ({present} يوم)</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statVal}>{student.attendancePct}٪</Text>
                <Text style={s.statLbl}>
                  الحضور: {present} حاضر · {absent} غائب{excused ? ` · ${excused} مستأذن (لا يُحتسب)` : ''}
                </Text>
              </View>
            </View>

            {isLoading ? (
              <SkeletonRows />
            ) : days.length === 0 ? (
              <Text style={s.muted}>لا توجد تقييمات في هذه الفترة</Text>
            ) : (
              <>
                {days.map((d) => (
                  <View key={d._id} style={[s.day, d.attendanceStatus !== 'حاضر' && s.dayOff]}>
                    <View style={s.dayHead}>
                      <Text style={s.dayDate}>
                        {new Date(d.date).toLocaleDateString(AR_LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                        {' · '}{d.attendanceStatus}
                      </Text>
                      <Text style={s.dayTotal}>{num(d.total)}<Text style={s.track}>/{num(d.totalMax ?? 10)}</Text></Text>
                    </View>
                    {(d.criteria?.length ?? 0) > 0 && (
                      <View style={s.crits}>
                        {d.criteria!.map((c) => (
                          <Text key={c.key} style={s.crit}>{c.label}: {num(c.value)}/{num(c.max)}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                <View style={s.sum}>
                  <Text style={s.dayDate}>مجموع النقاط</Text>
                  <Text style={s.dayTotal}>{num(days.reduce((n, d) => n + d.total, 0))}</Text>
                </View>
              </>
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
