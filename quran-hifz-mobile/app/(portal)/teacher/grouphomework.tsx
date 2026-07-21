import { useState } from 'react';
import { ScrollView, View, Text, TextInput, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { useHalqat } from '@/lib/queries/halqat';
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from '@/lib/queries/groupHomework';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';

export default function TeacherGroupHomework() {
  const authUser = usePortalStore((s) => s.authUser);
  const { data: halqat = [] } = useHalqat({ teacher: authUser?.profileId });
  const firstHalqa = halqat[0];

  const { data: hws = [], isLoading } = useGroupHomework(firstHalqa?._id);
  const createHW = useCreateGroupHomework();
  const deleteHW = useDeleteGroupHomework();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDay: 'الأحد' });

  async function handleAdd() {
    if (!form.title.trim() || !firstHalqa) return;
    await createHW.mutateAsync({
      halqa: firstHalqa._id,
      teacher: authUser?.profileId,
      title: form.title,
      description: form.description,
      dueDay: form.dueDay,
      dueDate: new Date().toISOString(),
    });
    setForm({ title: '', description: '', dueDay: 'الأحد' });
    setShowForm(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {createHW.isSuccess && <Text style={s.successBanner}>تم إضافة الواجب الجماعي ✓</Text>}
        {createHW.isError && <Text style={s.errorBanner}>{(createHW.error as Error).message}</Text>}

        <Pressable style={[s.addBtn, !firstHalqa && s.disabled]} onPress={() => firstHalqa && setShowForm(true)}>
          <Text style={s.addBtnText}>+ واجب جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title="إضافة واجب جماعي" />
            <Text style={s.label}>عنوان الواجب</Text>
            <TextInput style={s.input} placeholder="عنوان الواجب..." value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <Text style={s.label}>الوصف</Text>
            <TextInput style={[s.input, { minHeight: 60 }]} placeholder="وصف الواجب..." value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline textAlignVertical="top" />
            <Text style={s.label}>موعد التسليم</Text>
            <TextInput style={s.input} placeholder="مثال: الأحد" value={form.dueDay} onChangeText={(v) => setForm((f) => ({ ...f, dueDay: v }))} />
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd} disabled={createHW.isPending}>
                <Text style={s.saveBtnText}>{createHW.isPending ? 'جارٍ الحفظ...' : 'إضافة'}</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelText}>إلغاء</Text></Pressable>
            </View>
          </Card>
        )}

        <Card>
          <CardHeader title="الواجبات الجماعية الحالية" />
          {isLoading && (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={theme.green} />
            </View>
          )}
          {!isLoading && !firstHalqa && <Text style={s.hwDesc}>لا توجد حلقات مسجلة لهذا المعلم</Text>}
          {!isLoading && hws.map((hw, i) => (
            <View key={hw._id} style={[s.hwItem, i > 0 && s.border]}>
              <Text style={s.hwTitle}>{hw.title}</Text>
              <Text style={s.hwDesc}>{hw.description}</Text>
              <View style={s.hwFoot}>
                <Badge variant="gold" label={`موعد: ${hw.dueDay}`} />
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
  successBanner: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  errorBanner: { backgroundColor: '#fef2f2', color: '#991b1b', fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
  addBtn: { backgroundColor: theme.green, borderRadius: 8, padding: 12, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
  label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.white },
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
