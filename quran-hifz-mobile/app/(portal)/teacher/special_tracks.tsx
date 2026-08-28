import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import {
  useSpecialTracks,
  type SpecialTrack,
  type TrackTeacher,
} from '@/lib/queries/specialTracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function TrackCard({ track, onOpenDetail }: { track: SpecialTrack; onOpenDetail: () => void }) {
  const enrolled = track.enrolledStudents.length;
  const pct = track.maxStudents > 0 ? Math.min(100, Math.round((enrolled / track.maxStudents) * 100)) : 0;

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
          <Text style={s.infoLabel}>الوقت</Text>
          <Text style={s.infoValue}>{track.timeSlot}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>الأيام</Text>
          <Text style={s.infoValue}>{track.daysPerWeek}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>البداية</Text>
          <Text style={s.infoValue}>{fmtDate(track.startDate)}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>النهاية</Text>
          <Text style={s.infoValue}>{fmtDate(track.endDate)}</Text>
        </View>
      </View>

      <Text style={s.infoLabel}>المكان</Text>
      <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.isOnline ? 'أونلاين' : track.location}</Text>

      {track.teachers.length > 0 && (
        <>
          <Text style={s.infoLabel}>المعلمون</Text>
          <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.teachers.map(getTeacherName).join('، ')}</Text>
        </>
      )}

      <View style={s.capacityBox}>
        <View style={s.capacityRow}>
          <Text style={s.capacityLabel}>الطلاب</Text>
          <Text style={s.capacityValue}>{enrolled} / {track.maxStudents}</Text>
        </View>
        <ProgressBar value={pct} showPercent={false} />
      </View>

      {track.isOnline && track.meetLink && (
        <Text style={s.meetLink}>رابط الجلسة: {track.meetLink}</Text>
      )}

      <Button label={`عرض التفاصيل (${enrolled} طالب)`} variant="secondary" onPress={onOpenDetail} fullWidth />
    </Card>
  );
}

export default function TeacherSpecialTracks() {
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading, refetch, isRefetching } = useSpecialTracks(undefined, profileId);

  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  function openDetail(id: string) {
    router.push({ pathname: '/(portal)/teacher/track-detail', params: { id } } as any);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isLoading && <SkeletonRows count={3} rowHeight={220} gap={14} />}

        {!isLoading && tracks.length === 0 && (
          <Text style={s.muted}>لا توجد مسارات مُسنَدة إليك</Text>
        )}

        {active.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات النشطة ({active.length})</Text>
            {active.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات القادمة ({upcoming.length})</Text>
            {upcoming.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
        {ended.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات المنتهية ({ended.length})</Text>
            {ended.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
  sectionTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 6 },
  headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
  onlineTag: { fontSize: 11, backgroundColor: theme.bluePale, color: theme.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
  title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  infoItem: { width: '46%' },
  infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
  infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
  capacityBox: { backgroundColor: theme.bg, borderRadius: 10, padding: 10, marginBottom: 10 },
  capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  capacityLabel: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
  capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.text },
  meetLink: { fontSize: 11, color: theme.blue, fontFamily: theme.fontCairo, marginBottom: 10 },
});
