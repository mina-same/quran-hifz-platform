import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet, Linking } from 'react-native';
import { IconChevronDown, IconChevronUp, IconTarget, IconVideo } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useSpecialTracks, type SpecialTrack, type TrackTeacher } from '@/lib/queries/specialTracks';
import { useQuranPlans, segmentReversed } from '@/lib/queries/quranPlan';
import { SURAHS } from '@/lib/data/surahs';
import { orientSlice } from '@/lib/quranRange';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { AR_LOCALE } from '@/lib/date';

function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function surahName(n: number) {
  return SURAHS.find((su) => su.number === n)?.name ?? '';
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'long', day: 'numeric' });
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط الآن', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'red'> = { active: 'green', upcoming: 'gold', ended: 'red' };

function TrackCard({ track }: { track: SpecialTrack }) {
  const theme = useAppTheme();
  const remaining = daysLeft(track.endDate);
  const [planOpen, setPlanOpen] = useState(false);
  // The track's own Quran plan — where "مقرَّر اليوم" comes from.
  const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: track._id });
  const linkedPlan = linkedPlans[0];

  const todayText = (() => {
    if (!linkedPlan?.todayAssignment) return 'لا يوجد جزء مخصص لليوم';
    // Direction is per segment — read it from the type that is actually due.
    const a = orientSlice(linkedPlan.todayAssignment, segmentReversed(linkedPlan, linkedPlan.todayAssignment.type));
    const pages = a.pageEnd !== a.pageStart ? `${a.pageStart} - ${a.pageEnd}` : `${a.pageStart}`;
    return `مقرَّر اليوم: ${surahName(a.surahStart)} : ${a.ayahStart} — ${surahName(a.surahEnd)} : ${a.ayahEnd} (صفحة ${pages})`;
  })();

  const s = useMemo(() => StyleSheet.create({
    headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    onlineTag: { fontSize: 11, backgroundColor: theme.bluePale, color: theme.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 12 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    infoItem: { width: '46%' },
    infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
    dateBox: { backgroundColor: theme.bg, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dateText: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
    dateRemaining: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    joinBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: theme.tone.blue.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8,
    },
    joinText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.blue.text },
    planBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, marginBottom: 8 },
    planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    planName: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, flexShrink: 1 },
    planPct: { backgroundColor: theme.greenAccent, borderRadius: theme.radiusFull, paddingHorizontal: 8, paddingVertical: 1 },
    planPctText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },
    planDetail: { marginTop: 8, gap: 4 },
    planTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    planFill: { height: '100%', borderRadius: 999, backgroundColor: theme.mode === 'dark' ? theme.greenLight : theme.green },
    planMeta: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    planToday: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.text },
    notes: { fontSize: 12, color: theme.brown, backgroundColor: theme.goldPale, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo },
  }), [theme]);

  return (
    <Card>
      <View style={s.headRow}>
        <Badge label={STATUS_LABEL[track.status]} variant={STATUS_VARIANT[track.status]} />
        <Text style={s.typeTag}>{track.type}</Text>
        {track.isOnline && <Text style={s.onlineTag}>أونلاين</Text>}
      </View>

      <Text style={s.title}>{track.title}</Text>

      <View style={s.infoGrid}>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>المعلمون</Text>
          <Text style={s.infoValue}>{track.teachers.map(getTeacherName).join(' · ') || '—'}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>الوقت</Text>
          <Text style={s.infoValue}>{track.timeSlot}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>الجدول</Text>
          <Text style={s.infoValue}>{track.daysPerWeek}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>المكان</Text>
          <Text style={s.infoValue}>{track.isOnline ? 'أونلاين' : track.location}</Text>
        </View>
      </View>

      <View style={s.dateBox}>
        <Text style={s.dateText}>{fmtDate(track.startDate)} — {fmtDate(track.endDate)}</Text>
        {track.status !== 'ended' && (
          <Text style={[s.dateRemaining, remaining <= 7 && { color: theme.red }]}>
            {remaining > 0 ? `${remaining} يوم متبقي` : 'ينتهي اليوم'}
          </Text>
        )}
      </View>

      {!!linkedPlan && (
        <View style={[s.planBox, !!linkedPlan.todayAssignment && { backgroundColor: theme.greenPale }]}>
          <Pressable haptic="select" style={s.planHead} onPress={() => setPlanOpen((o) => !o)}>
            <View style={s.planLabel}>
              <IconTarget size={14} color={linkedPlan.todayAssignment ? theme.green : theme.textMuted} />
              <Text style={[s.planName, !!linkedPlan.todayAssignment && { color: theme.green }]} numberOfLines={1}>
                {linkedPlan.name}
              </Text>
              {!!linkedPlan.progress && (
                <View style={s.planPct}>
                  <Text style={s.planPctText}>{linkedPlan.progress.percent}%</Text>
                </View>
              )}
            </View>
            {planOpen
              ? <IconChevronUp size={14} color={theme.textMuted} />
              : <IconChevronDown size={14} color={theme.textMuted} />}
          </Pressable>

          {planOpen && (
            <View style={s.planDetail}>
              {!!linkedPlan.progress && (
                <>
                  <View style={s.planTrack}>
                    <View style={[s.planFill, { width: `${linkedPlan.progress.percent}%` }]} />
                  </View>
                  <Text style={s.planMeta}>
                    {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء · ` : ''}
                    {linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </Text>
                </>
              )}
              <Text style={s.planToday}>{todayText}</Text>
            </View>
          )}
        </View>
      )}

      {track.isOnline && !!track.meetLink && track.status === 'active' && (
        <Pressable style={s.joinBtn} onPress={() => Linking.openURL(track.meetLink!)}>
          <IconVideo size={14} color={theme.tone.blue.text} />
          <Text style={s.joinText}>انضم للجلسة الآن</Text>
        </Pressable>
      )}

      {track.notes && <Text style={s.notes}>{track.notes}</Text>}
    </Card>
  );
}

export default function StudentSpecialTracks() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading, isRefetching, refetch } = useSpecialTracks(undefined, undefined, profileId);

  const s = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    sectionTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 6 },
    mutedSmall: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', marginTop: -14 },
  }), [theme]);

  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />
        }
      >
        {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}

        {!isLoading && tracks.length === 0 && (
          <>
            <Text style={s.muted}>لم تُسجَّل في أي مسار بعد</Text>
            <Text style={s.mutedSmall}>تواصل مع معلمك أو الإدارة للانضمام إلى أحد البرامج</Text>
          </>
        )}

        {active.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات النشطة ({active.length})</Text>
            {active.map((t) => <TrackCard key={t._id} track={t} />)}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات القادمة ({upcoming.length})</Text>
            {upcoming.map((t) => <TrackCard key={t._id} track={t} />)}
          </>
        )}
        {ended.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات المنتهية ({ended.length})</Text>
            {ended.map((t) => <TrackCard key={t._id} track={t} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
