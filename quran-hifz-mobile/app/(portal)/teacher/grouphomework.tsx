import { useMemo, useState } from 'react';
import {
  ScrollView, View, TextInput, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useTracks } from '@/lib/queries/tracks';
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from '@/lib/queries/groupHomework';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export default function TeacherGroupHomework() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', dueDay: DAYS[0] });

  const { data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, profileId);

  const { data: homeworks = [], isLoading: loadingHw, refetch: refetchHw, isRefetching: refetchingHw } = useGroupHomework(
    selected ? { track: selected.id } : undefined,
  );
  const createHW = useCreateGroupHomework();
  const deleteHW = useDeleteGroupHomework();

  const isLoading = loadingTracks;
  const isRefreshing = refetchingTracks || refetchingHw;
  function handleRefresh() {
    refetchTracks();
    refetchHw();
  }

  async function handleAdd() {
    if (!selected || !form.title.trim() || !form.desc.trim()) return;
    try {
      await createHW.mutateAsync({
        track: selected.id,
        title: form.title,
        description: form.desc,
        dueDay: form.dueDay,
        dueDate: new Date().toISOString(),
      });
    } catch (e) {
      toast.error((e as Error).message);
      return; // createHW.isError also renders the inline banner (as on web)
    }
    setForm({ title: '', desc: '', dueDay: DAYS[0] });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!selected) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={72} />}
          {!isLoading && tracks.length === 0 && (
            <Text style={s.muted}>لا توجد حلقات أو مسارات مسجلة لهذا المعلم</Text>
          )}
          {!isLoading && tracks.length > 0 && (
            <Text style={s.heading}>اختر الحلقة أو المسار لإسناد واجب جماعي له</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable onPress={() => setSelected(null)}>
          <Text style={s.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        <Text style={s.title}>الواجبات الجماعية — {selected.title}</Text>
        {saved && <Text style={s.successBanner}>تم إضافة الواجب الجماعي بنجاح ✓</Text>}
        {createHW.isError && <Text style={s.errorBanner}>فشلت الإضافة، حاول مجدداً.</Text>}

        <Pressable style={s.addBtn} onPress={() => setShowForm((v) => !v)}>
          <Text style={s.addBtnText}>+ واجب جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title="إضافة واجب جماعي" />
            <Text style={s.label}>عنوان الواجب *</Text>
            <TextInput style={s.input} placeholder="مثال: مراجعة سورة البقرة" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>وصف الواجب *</Text>
            <TextInput style={[s.input, { minHeight: 60 }]} placeholder="تفاصيل ما يجب على الطلاب فعله..." value={form.desc} onChangeText={(v) => setForm((f) => ({ ...f, desc: v }))} multiline textAlignVertical="top" textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>موعد التسليم</Text>
            <View style={s.chipsRow}>
              {DAYS.map((d) => (
                <Pressable haptic="select" key={d} style={[s.chip, form.dueDay === d && s.chipActive]} onPress={() => setForm((f) => ({ ...f, dueDay: d }))}>
                  <Text style={[s.chipText, form.dueDay === d && s.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd} disabled={createHW.isPending}>
                <Text style={s.saveBtnText}>{createHW.isPending ? 'جارٍ الحفظ...' : 'إضافة'}</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelText}>إلغاء</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <CardHeader title="الواجبات الجماعية" />
          {loadingHw && <SkeletonRows count={3} rowHeight={64} />}
          {!loadingHw && homeworks.length === 0 && <Text style={s.muted}>لا توجد واجبات جماعية بعد</Text>}
          {homeworks.map((hw, i) => (
            <View key={hw._id} style={[s.hwItem, i > 0 && s.border]}>
              <Text style={s.hwTitle}>{hw.title}</Text>
              <Text style={s.hwDesc}>{hw.description}</Text>
              <View style={s.hwFoot}>
                <Badge label={`موعد التسليم: ${hw.dueDay}`} variant="gold" />
                <Pressable haptic="medium" onPress={() => deleteHW.mutate(hw._id, { onError: (e) => toast.error((e as Error).message) })} disabled={deleteHW.isPending}>
                  <Text style={s.delText}>حذف</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>

        <IndividualHomeworkCard />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Local-only card, same as web's IndividualHomeworkCard (no backend there either).
const STUDENTS = ['عبدالله الحميداني', 'يوسف الزهراني', 'أحمد الشهري', 'فارس العسيري', 'سالم الدوسري'];
type IndivHW = { student: string; title: string; dueDay: string; note: string };

function IndividualHomeworkCard() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const [showForm, setShowForm] = useState(false);
  const [list, setList] = useState<IndivHW[]>([]);
  const [form, setForm] = useState({ student: STUDENTS[0], title: '', dueDay: '', note: '' });

  function add() {
    if (!form.student || !form.title) return;
    setList((prev) => [{ ...form }, ...prev]);
    setForm({ student: STUDENTS[0], title: '', dueDay: '', note: '' });
    setShowForm(false);
  }

  return (
    <Card>
      <CardHeader
        title="الواجبات الفردية"
        right={
          <Pressable haptic="select" onPress={() => setShowForm((v) => !v)}>
            <Text style={s.indivToggle}>+ واجب فردي</Text>
          </Pressable>
        }
      />
      {showForm && (
        <View style={s.indivForm}>
          <Text style={s.label}>الطالب</Text>
          <View style={s.chipsRow}>
            {STUDENTS.map((n) => (
              <Pressable haptic="select" key={n} style={[s.chip, form.student === n && s.chipActive]} onPress={() => setForm((f) => ({ ...f, student: n }))}>
                <Text style={[s.chipText, form.student === n && s.chipTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>الموعد</Text>
          <TextInput style={s.input} placeholder="مثال: الثلاثاء" value={form.dueDay} onChangeText={(v) => setForm((f) => ({ ...f, dueDay: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
          <Text style={s.label}>الواجب</Text>
          <TextInput style={s.input} placeholder="عنوان الواجب الفردي" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
          <Text style={s.label}>ملاحظة للطالب</Text>
          <TextInput style={s.input} placeholder="سبب الواجب الفردي..." value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
          <Pressable style={[s.saveBtn, { marginTop: 12 }]} onPress={add}>
            <Text style={s.saveBtnText}>إرسال للطالب وولي أمره</Text>
          </Pressable>
        </View>
      )}
      {list.length === 0 ? (
        <Text style={s.muted}>لا توجد واجبات فردية حتى الآن</Text>
      ) : (
        list.map((hw, i) => (
          <View key={i} style={[s.hwItem, i > 0 && s.border]}>
            <Text style={s.hwTitle}>{hw.student}</Text>
            <Text style={s.hwDesc}>{hw.title}</Text>
            <View style={s.chipsRow}>
              {!!hw.dueDay && <Badge label={`موعد: ${hw.dueDay}`} variant="gold" />}
              {!!hw.note && <Badge label={hw.note} variant="gray" />}
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    heading: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    title: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    successBanner: { backgroundColor: theme.greenPale, color: theme.green, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    errorBanner: { backgroundColor: theme.redPale, color: theme.red, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 , textAlign: 'left'},
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.inputBg },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    chipActive: { backgroundColor: theme.greenPale, borderColor: theme.green },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    row: { flexDirection: 'row', gap: 12, marginTop: 12 },
    saveBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
    saveBtnText: { color: theme.white, fontFamily: theme.fontCairoBold },
    cancelBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
    cancelText: { color: theme.textMuted, fontFamily: theme.fontCairo },
    hwItem: { paddingVertical: 12 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    hwTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
    hwDesc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 6 },
    hwFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
    indivToggle: { fontSize: 12, color: theme.green, fontFamily: theme.fontCairoBold },
    indivForm: { padding: 12, backgroundColor: theme.cream, borderRadius: 8, marginBottom: 12 },
  });
}
