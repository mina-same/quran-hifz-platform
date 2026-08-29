import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import CardHeader from '@/components/ui/CardHeader';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useParentChildren, useChildRecordings } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

export default function ParentRecordings() {
  const theme = useAppTheme();
  const selectedChildId = usePortalStore((s) => s.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;

  const { data: recordings = [], isLoading, isRefetching, refetch } = useChildRecordings(childId);

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    item: { paddingVertical: 12 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
    date: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo, flex: 1 },
    points: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.gold },
    segment: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 2 },
    noteLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, marginTop: 4 },
    note: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
  }), [theme]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.spinner} colors={[theme.spinner]} />
        }
      >
        <Card>
          <CardHeader
            title="الدروس المسجّلة"
            subtitle="جميع دروس ابنك مرتبة من الأحدث — سجّلها المعلم مباشرة في الحلقة"
          />
          {isLoading && <SkeletonRows count={4} rowHeight={56} />}
          {!isLoading && recordings.length === 0 && <Text style={s.muted}>لا توجد دروس مسجّلة</Text>}
          {recordings.map((r, i) => (
            <View key={r._id} style={[s.item, i > 0 && s.border]}>
              <View style={s.itemHead}>
                {!!r.type && <Badge label={r.type} variant="blue" />}
                <Text style={s.date}>{new Date(r.recordedAt).toLocaleDateString(AR_LOCALE)}</Text>
                {r.points > 0 && <Text style={s.points}>{r.points} نقطة</Text>}
              </View>
              {!!r.segment && <Text style={s.segment}>{r.segment}</Text>}
              {!!r.teacherNote && (
                <>
                  <Text style={s.noteLabel}>ملاحظة المعلم</Text>
                  <Text style={s.note}>{r.teacherNote}</Text>
                </>
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
