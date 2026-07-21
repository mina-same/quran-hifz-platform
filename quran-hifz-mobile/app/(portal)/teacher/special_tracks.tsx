import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  useSpecialTracks,
  type SpecialTrack,
  type EnrolledStudent,
  type TrackTeacher,
} from '@/lib/queries/specialTracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

function getEnrolledName(v: EnrolledStudent | string) {
  return typeof v === 'object' ? v.name : v;
}
function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<SpecialTrack['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<SpecialTrack['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function TrackCard({ track }: { track: SpecialTrack }) {
  const [open, setOpen] = useState(track.status === 'active');
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

      <Pressable style={s.toggleBtn} onPress={() => setOpen((o) => !o)}>
        <Text style={s.toggleBtnText}>طلاب هذا المسار ({enrolled}) {open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <View style={s.studentsList}>
          {enrolled === 0 ? (
            <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>
          ) : (
            track.enrolledStudents.map((st, i) => (
              <View key={i} style={[s.studentRow, i > 0 && s.border]}>
                <Text style={s.studentName}>{getEnrolledName(st)}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </Card>
  );
}

export default function TeacherSpecialTracks() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading } = useSpecialTracks(undefined, profileId);

  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}

        {!isLoading && tracks.length === 0 && (
          <Text style={s.muted}>لا توجد مسارات مُسنَدة إليك</Text>
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
  toggleBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, alignItems: 'center' },
  toggleBtnText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  studentsList: { marginTop: 8 },
  studentRow: { paddingVertical: 8 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  studentName: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.text },
});
