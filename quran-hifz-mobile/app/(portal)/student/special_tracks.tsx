import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useSpecialTracks, type SpecialTrack, type TrackTeacher } from '@/lib/queries/specialTracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}
function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط الآن', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'red'> = { active: 'green', upcoming: 'gold', ended: 'red' };

function TrackCard({ track }: { track: SpecialTrack }) {
  const remaining = daysLeft(track.endDate);
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

      {track.isOnline && track.meetLink && track.status === 'active' && (
        <Text style={s.meetLink}>رابط الجلسة: {track.meetLink}</Text>
      )}

      {track.notes && <Text style={s.notes}>{track.notes}</Text>}
    </Card>
  );
}

export default function StudentSpecialTracks() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading } = useSpecialTracks(undefined, undefined, profileId);

  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}

        {!isLoading && tracks.length === 0 && (
          <Text style={s.muted}>لم تُسجَّل في أي مسار استثنائي بعد</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
  sectionTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 6 },
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
  meetLink: { fontSize: 11, color: theme.blue, fontFamily: theme.fontCairo, marginBottom: 8 },
  notes: { fontSize: 12, color: theme.brown, backgroundColor: theme.goldPale, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo },
});
