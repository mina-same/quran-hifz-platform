import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconAlertCircle, IconUserCheck, IconUserOff } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useAssignStudent, type Track } from '@/lib/queries/tracks';
import { useStudents, type Student } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';

type AppTheme = ReturnType<typeof useAppTheme>;

function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}
function avatarTone(theme: AppTheme, i: number) {
  const order = ['green', 'gold', 'blue', 'red'] as const;
  return theme.tone[order[i % order.length]];
}
function capacityColor(theme: AppTheme, pct: number) {
  if (pct >= 90) return theme.red;
  if (pct >= 70) return theme.amber;
  return theme.mode === 'dark' ? theme.greenLight : theme.green;
}
function trackIdOf(v: Student['track']): string {
  return typeof v === 'object' ? v._id : v;
}

/** Track roster management — transfer-only, since a student's track is
 * exclusive: shows who's currently on the track (a live query, not a stored
 * array) and offers "نقل طالب" (moves a student's `track` field here), never
 * "add" alongside an existing track. Self-contained (fetches its own students
 * list and owns its own picker/search state) so it can be embedded both in
 * the admin tracks list and the shared TrackDetail screen. */
export default function TrackStudentsPanel({ track }: { track: Track }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const readOnly = usePortalStore((st) => st.readOnly);
  const { data: allStudents = [] } = useStudents();
  const assignStudent = useAssignStudent();
  const [addStudentId, setAddStudentId] = useState('');
  const [search, setSearch] = useState('');

  const enrolled = allStudents.filter((st) => trackIdOf(st.track) === track._id);
  const enrolledCnt = enrolled.length;
  const capPct = Math.min(100, Math.round((enrolledCnt / track.maxStudents) * 100));
  const barClr = capacityColor(theme, capPct);
  const isFull = enrolledCnt >= track.maxStudents;
  const q = search.trim();
  const available = allStudents.filter((st) => trackIdOf(st.track) !== track._id && (!q || st.name.includes(q)));
  const shown = enrolled.filter((st) => !q || st.name.includes(q));

  return (
    <View style={{ gap: 10 }}>
      <View style={s.capacityBox}>
        <View style={s.capacityHead}>
          <View style={s.iconLabel}>
            <IconUserCheck size={14} color={theme.textMuted} />
            <Text style={s.capacityLabel}>طاقة المسار</Text>
          </View>
          <Text style={[s.capacityValue, { color: barClr }]}>{enrolledCnt} / {track.maxStudents}</Text>
        </View>
        <View style={s.capacityTrack}>
          <View style={[s.capacityFill, { width: `${capPct}%`, backgroundColor: barClr }]} />
        </View>
        {isFull && (
          <View style={[s.iconLabel, { marginTop: 8 }]}>
            <IconAlertCircle size={13} color={theme.red} />
            <Text style={s.fullWarning}>وصل المسار للحد الأقصى</Text>
          </View>
        )}
      </View>

      {!isFull && !readOnly && (
        <View style={s.addStudentBox}>
          <Text style={s.addStudentLabel}>نقل طالب إلى هذا المسار</Text>
          <View style={s.row}>
            <View style={s.flex1}>
              <FormSelect
                value={addStudentId}
                onChange={setAddStudentId}
                options={available.map((st) => ({ value: st._id, label: st.name }))}
                placeholder="اختر طالباً"
              />
            </View>
            <Button
              label="نقل"
              onPress={() => {
                if (!addStudentId) return;
                assignStudent.mutate({ id: track._id, studentId: addStudentId });
                setAddStudentId('');
              }}
              disabled={!addStudentId || assignStudent.isPending}
            />
          </View>
        </View>
      )}

      <View style={s.enrolledHead}>
        <Text style={s.enrolledTitle}>الطلاب المسجّلون</Text>
        {enrolledCnt > 0 && (
          <View style={s.searchBox}>
            <FormInput placeholder="بحث..." value={search} onChangeText={setSearch} />
          </View>
        )}
      </View>

      {enrolledCnt === 0 ? (
        <View style={s.emptyBox}>
          <IconUserOff size={26} color={theme.textMuted} />
          <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>
        </View>
      ) : (
        shown.map((st, idx) => {
          const tone = avatarTone(theme, idx);
          return (
            <View key={st._id} style={s.studentRow}>
              <View style={s.studentIdentity}>
                <View style={[s.avatar, { backgroundColor: tone.bg }]}>
                  <Text style={[s.avatarText, { color: tone.text }]}>{avatarInitials(st.name)}</Text>
                </View>
                <View style={s.flex1}>
                  <Text style={s.studentName} numberOfLines={1}>{st.name}</Text>
                  <Text style={s.studentIndex}>#{idx + 1}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
    flex1: { flex: 1 },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    capacityBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, gap: 6 },
    capacityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    capacityLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold },
    capacityTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    capacityFill: { height: '100%', borderRadius: 999 },
    fullWarning: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.red },
    addStudentBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 10, padding: 12 },
    addStudentLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    enrolledHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    enrolledTitle: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    searchBox: { width: 150 },
    emptyBox: { alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 10, paddingVertical: 16 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    studentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: theme.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9 },
    studentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    studentName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    studentIndex: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
