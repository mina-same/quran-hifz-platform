import { useMemo } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { IconCheck, IconPlayerPlay } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useParentChildren, useChildHifz, type ChildHifzEntry } from '@/lib/queries/parent';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;
type Status = ChildHifzEntry['status'];

const STATUS_VARIANT: Record<Status, 'green' | 'gold' | 'gray'> = {
  'مكتمل': 'green',
  'جارٍ': 'gold',
  'لم يبدأ': 'gray',
};

export default function ParentTimeline() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const selectedChildId = usePortalStore((st) => st.selectedChildId);
  const { data: children = [] } = useParentChildren();
  const childId = selectedChildId ?? children[0]?._id;
  const childName = children.find((c) => c._id === childId)?.name;

  const { data: entries = [], isLoading, isRefetching, refetch } = useChildHifz(childId);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.green} colors={[theme.green]} />
        }
      >
        <Card>
          <CardHeader
            title="رحلة الحفظ من البداية حتى الآن"
            subtitle={childName ? `مسيرة حفظ ${childName}` : undefined}
          />
          {isLoading && <SkeletonRows count={5} rowHeight={64} />}
          {!isLoading && entries.length === 0 && <Text style={s.muted}>لا توجد سجلات حفظ بعد.</Text>}

          {!isLoading && entries.length > 0 && (
            <View style={s.timeline}>
              {/* The rail is drawn behind the dots so the surahs read as one
                  continuous journey rather than a plain list. */}
              <View style={s.rail} />
              {entries.map((ev, i) => {
                const variant = STATUS_VARIANT[ev.status] ?? 'green';
                const tone = theme.tone[variant];
                return (
                  <View key={ev._id ?? i} style={s.row}>
                    <View style={[s.dot, { backgroundColor: tone.text }]}>
                      {ev.status === 'مكتمل' && <IconCheck size={13} color={tone.bg} />}
                      {ev.status === 'جارٍ' && <IconPlayerPlay size={12} color={tone.bg} />}
                      {ev.status === 'لم يبدأ' && <View style={[s.hollow, { backgroundColor: tone.bg }]} />}
                    </View>

                    <View style={[s.body, { backgroundColor: tone.bg }]}>
                      <View style={s.head}>
                        <Text style={s.surah} numberOfLines={1}>سورة {ev.surah}</Text>
                        <Badge label={ev.status} variant={variant} />
                      </View>
                      {!!ev.notes && <Text style={s.notes}>{ev.notes}</Text>}
                      {!!ev.completionDate && (
                        <Text style={s.date}>
                          {new Date(ev.completionDate).toLocaleDateString(AR_LOCALE)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16 },
    muted: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },

    timeline: { position: 'relative', paddingTop: 4 },
    // RTL: the rail sits at the start edge, which `right` resolves to here.
    rail: { position: 'absolute', right: 10, top: 8, bottom: 8, width: 2, backgroundColor: theme.border },
    row: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
    dot: {
      width: 22, height: 22, borderRadius: 11, marginTop: 4, flexShrink: 0,
      alignItems: 'center', justifyContent: 'center',
    },
    hollow: { width: 8, height: 8, borderRadius: 4 },
    body: { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    surah: { flex: 1, fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    notes: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    date: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
