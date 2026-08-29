import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { IconPencil, IconTrash } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsRow from '@/components/ui/StatsRow';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import IconButton from '@/components/ui/IconButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useStudents, useDeleteStudent, type Student } from '@/lib/queries/students';
import { useAdminParents } from '@/lib/queries/adminParents';
import { SERVER_PATHS } from '@/lib/constants/masarMap';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

function getName(v: { _id: string; name: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'name' in v) return v.name;
  if (typeof v === 'string') return v;
  return '—';
}
function getId(v: unknown): string {
  if (v && typeof v === 'object' && '_id' in v) return (v as { _id: string })._id;
  if (typeof v === 'string') return v;
  return '';
}

/** المسار: real track lives one hop away via halqa.specialTrack, not the unused legacy `path` enum. */
function trackLabel(s: Student): string | null {
  const halqa = typeof s.halqa === 'object' ? s.halqa : null;
  const track = halqa?.specialTrack;
  if (track && typeof track === 'object' && track.title) return track.title;
  if (s.path) return s.path;
  return null;
}

type Tone = 'green' | 'gold' | 'red';
function attendanceTone(pct: number): Tone {
  if (pct >= 90) return 'green';
  if (pct >= 75) return 'gold';
  return 'red';
}

const STATUS_LABEL: Record<Student['status'], string> = { active: 'نشط', new: 'جديد', inactive: 'غير نشط' };
const STATUS_VARIANT: Record<Student['status'], 'green' | 'gold' | 'gray'> = { active: 'green', new: 'gold', inactive: 'gray' };

export default function AdminStudents() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const { data: students = [], isLoading, isError, isRefetching, refetch } = useStudents();
  const { data: parents = [] } = useAdminParents();

  const deleteStudent = useDeleteStudent();

  const [search, setSearch] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteStudent.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  }

  const active = students.filter((st) => st.status === 'active').length;
  const inactive = students.filter((st) => st.status === 'inactive').length;

  const STATS = [
    { label: 'إجمالي الطلاب', value: students.length, color: theme.green },
    { label: 'نشطون',          value: active,          color: theme.gold },
    { label: 'غير نشطين',      value: inactive,        color: theme.red },
  ];

  const q = search.trim();
  const filtered = students.filter((st) => (!q || st.name.includes(q)) && (!pathFilter || st.path === pathFilter));

  // Each student id → the parent account that holds them, for the row's ولي الأمر line.
  const parentByStudentId = new Map<string, { name: string; email: string }>();
  for (const p of parents) {
    for (const c of p.children) parentByStudentId.set(c._id, { name: p.name, email: p.email });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isError && <Alert variant="error">تعذر تحميل بيانات الطلاب</Alert>}

        {!isLoading && <StatsRow stats={STATS} />}

        <Pressable style={s.addBtn} onPress={() => router.push('/(portal)/admin/register' as any)}>
          <Text style={s.addBtnText}>+ تسجيل طالب جديد</Text>
        </Pressable>

        {/* Search + path filter, stacked so neither field gets squeezed on a phone. */}
        <Card>
          <FormInput placeholder="البحث باسم الطالب..." value={search} onChangeText={setSearch} />
          <View style={{ marginTop: 10 }}>
            <FormSelect
              value={pathFilter}
              onChange={setPathFilter}
              options={[{ value: '', label: 'كل المسارات' }, ...SERVER_PATHS.map((p) => ({ value: p, label: p }))]}
              placeholder="كل المسارات"
            />
          </View>
        </Card>

        <Card noPadding>
          <CardHeader title={`الطلاب (${filtered.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && students.length === 0 && <Text style={s.empty}>لا يوجد طلاب مسجلون بعد</Text>}
            {!isLoading && students.length > 0 && filtered.length === 0 && <Text style={s.empty}>لا توجد نتائج</Text>}

            {!isLoading && filtered.map((st, i) => {
              const track = trackLabel(st);
              const linkedParent = parentByStudentId.get(st._id);
              const guardianName = linkedParent?.name || st.parentName || st.guardian || null;
              const guardianContact = linkedParent?.email || st.parentEmail || st.guardianPhone || null;
              const att = theme.tone[attendanceTone(st.attendancePct)];
              return (
                <View key={st._id} style={[s.row, i < filtered.length - 1 && s.rowBorder]}>
                  <View style={s.rowHead}>
                    <Text style={s.name} numberOfLines={1}>{st.name}</Text>
                    <Badge label={STATUS_LABEL[st.status]} variant={STATUS_VARIANT[st.status]} />
                    <View style={[s.attPill, { backgroundColor: att.bg }]}>
                      <Text style={[s.attPillText, { color: att.text }]}>حضور {st.attendancePct}٪</Text>
                    </View>
                  </View>

                  {track && <Badge label={track} variant="gold" style={s.trackBadge} />}

                  <View style={s.chips}>
                    <View style={s.chip}>
                      <Text style={s.chipText} numberOfLines={1}>الحلقة: {getName(st.halqa)}</Text>
                    </View>
                    <View style={s.chip}>
                      <Text style={s.chipText} numberOfLines={1}>المسجد: {getName(st.masjid)}</Text>
                    </View>
                    {typeof st.level === 'number' && (
                      <View style={s.chip}>
                        <Text style={s.chipText} numberOfLines={1}>المستوى: {st.level}</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.guardian}>
                    <Text style={s.guardianName} numberOfLines={1}>ولي الأمر: {guardianName ?? '—'}</Text>
                    {!!guardianContact && (
                      <Text style={s.guardianContact} numberOfLines={1}>{guardianContact}</Text>
                    )}
                  </View>

                  <View style={s.progressWrap}>
                    <View style={s.progressHead}>
                      <Text style={s.progressLabel}>التقدم</Text>
                      <Text style={s.progressPct}>{st.progressPct}٪</Text>
                    </View>
                    <ProgressBar value={st.progressPct} showPercent={false} />
                  </View>

                  <View style={s.actions}>
                    <IconButton accessibilityLabel="تعديل" style={s.flex1} onPress={() => router.push({ pathname: '/(portal)/admin/student-form', params: { id: st._id } } as any)}>
                      <View style={s.actionInner}>
                        <IconPencil size={15} color={theme.textMuted} />
                        <Text style={s.actionText}>تعديل</Text>
                      </View>
                    </IconButton>
                    <IconButton accessibilityLabel="حذف" tone="danger" style={s.flex1} onPress={() => setDeleteId(st._id)}>
                      <View style={s.actionInner}>
                        <IconTrash size={15} color={theme.red} />
                        <Text style={[s.actionText, { color: theme.red }]}>حذف</Text>
                      </View>
                    </IconButton>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={!!deleteId}
        title="حذف الطالب"
        message="سيتم حذف الطالب نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        pending={deleteStudent.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },

    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },

    row: { paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },

    // Name takes the width it needs; the status/attendance pills never get pushed off-screen.
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    name: { flex: 1, fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },

    attPill: { borderRadius: theme.radiusFull, paddingHorizontal: 10, paddingVertical: 4 },
    attPillText: { fontSize: 11, fontFamily: theme.fontCairoBold },

    // A long track title ellipsizes on its own line instead of squeezing the name.
    trackBadge: { alignSelf: 'stretch' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: theme.tone.gray.bg,
      borderRadius: theme.radiusSm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexShrink: 1,
      maxWidth: '100%',
    },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.gray.text },

    guardian: { gap: 2 },
    guardianName: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    // textMuted, not textFaint: `textFaint` is white-on-dark ink and vanishes on a light card.
    guardianContact: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, opacity: 0.85 },

    progressWrap: { gap: 4 },
    progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressPct: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },

    actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
    flex1: { flex: 1 },
    actionInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },


    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  });
}
