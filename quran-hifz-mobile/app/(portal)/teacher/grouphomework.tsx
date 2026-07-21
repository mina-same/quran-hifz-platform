import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import ContextCard, { halqaToContext, trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useHalqat } from '@/lib/queries/halqat';
import { useSpecialTracks } from '@/lib/queries/specialTracks';
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from '@/lib/queries/groupHomework';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export default function TeacherGroupHomework() {
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', dueDay: DAYS[0] });

  const { data: halqat = [], isLoading: loadingHalqat } = useHalqat({ teacher: profileId });
  const { data: tracks = [], isLoading: loadingTracks } = useSpecialTracks(undefined, profileId);

  const { data: homeworks = [], isLoading: loadingHw } = useGroupHomework(
    selected
      ? selected.kind === 'halqa'
        ? { halqa: selected.id }
        : { specialTrack: selected.id }
      : undefined,
  );
  const createHW = useCreateGroupHomework();
  const deleteHW = useDeleteGroupHomework();

  const isLoading = loadingHalqat || loadingTracks;

  async function handleAdd() {
    if (!selected || !form.title.trim() || !form.desc.trim()) return;
    await createHW.mutateAsync({
      ...(selected.kind === 'halqa' ? { halqa: selected.id } : { specialTrack: selected.id }),
      title: form.title,
      description: form.desc,
      dueDay: form.dueDay,
      dueDate: new Date().toISOString(),
    });
    setForm({ title: '', desc: '', dueDay: DAYS[0] });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!selected) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
          {isLoading && <Text style={s.muted}>جارٍ التحميل...</Text>}
          {!isLoading && halqat.length === 0 && tracks.length === 0 && (
            <Text style={s.muted}>لا توجد حلقات أو مسارات مسندة إليك</Text>
          )}
          {halqat.map((h) => (
            <Pressable key={h._id} onPress={() => setSelected(halqaToContext(h))}>
              <ContextCard context={halqaToContext(h)} />
            </Pressable>
          ))}
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
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={s.backLink}>‹ رجوع لاختيار الحلقة/المسار</Text>
        </Pressable>

        {saved && <Text style={s.successBanner}>تم إضافة الواجب الجماعي ✓</Text>}
        {createHW.isError && <Text style={s.errorBanner}>فشلت الإضافة، حاول مجدداً.</Text>}

        <Pressable style={s.addBtn} onPress={() => setShowForm((v) => !v)}>
          <Text style={s.addBtnText}>+ واجب جديد لـ {selected.title}</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title="إضافة واجب جماعي" />
            <Text style={s.label}>عنوان الواجب</Text>
            <TextInput style={s.input} placeholder="عنوان الواجب..." value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>الوصف</Text>
            <TextInput style={[s.input, { minHeight: 60 }]} placeholder="وصف الواجب..." value={form.desc} onChangeText={(v) => setForm((f) => ({ ...f, desc: v }))} multiline textAlignVertical="top" textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>موعد التسليم</Text>
            <View style={s.chipsRow}>
              {DAYS.map((d) => (
                <Pressable key={d} style={[s.chip, form.dueDay === d && s.chipActive]} onPress={() => setForm((f) => ({ ...f, dueDay: d }))}>
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
          <CardHeader title="الواجبات الجماعية الحالية" />
          {loadingHw && <Text style={s.muted}>جارٍ التحميل...</Text>}
          {!loadingHw && homeworks.length === 0 && <Text style={s.muted}>لا توجد واجبات جماعية بعد</Text>}
          {homeworks.map((hw, i) => (
            <View key={hw._id} style={[s.hwItem, i > 0 && s.border]}>
              <Text style={s.hwTitle}>{hw.title}</Text>
              <Text style={s.hwDesc}>{hw.description}</Text>
              <View style={s.hwFoot}>
                <Badge label={`موعد: ${hw.dueDay}`} variant="gold" />
                <Pressable onPress={() => deleteHW.mutate(hw._id)} disabled={deleteHW.isPending}>
                  <Text style={s.delText}>حذف</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: 16, gap: 14 },
  muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
  backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  errorBanner: { backgroundColor: '#fef2f2', color: '#991B1B', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  addBtn: { backgroundColor: theme.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: '#DCFCE7', borderColor: theme.green },
  chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  saveBtn: { backgroundColor: theme.green, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
  saveBtnText: { color: theme.white, fontFamily: theme.fontCairoBold },
  cancelBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
  cancelText: { color: theme.textMuted, fontFamily: theme.fontCairo },
  hwItem: { paddingVertical: 12 },
  border: { borderTopWidth: 1, borderTopColor: theme.border },
  hwTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
  hwDesc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 6 },
  hwFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
});
