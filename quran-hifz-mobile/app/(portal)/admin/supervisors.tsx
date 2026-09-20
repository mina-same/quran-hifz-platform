import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconUserPlus, IconTrash, IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import {
  useAdminSupervisors, useCreateSupervisor, useDeleteSupervisor,
} from '@/lib/queries/adminSupervisors';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { ApiError } from '@/lib/api';

// Same بنين/بنات labels as the admin gender-scope switcher (MoreSheet.tsx).
const GENDER_OPTIONS = [
  { value: 'male', label: 'بنين' },
  { value: 'female', label: 'بنات' },
];

type AddForm = { name: string; email: string; password: string; gender: 'male' | 'female' | '' };
const EMPTY_ADD: AddForm = { name: '', email: '', password: '', gender: '' };

type Credentials = { email: string; password: string };

export default function AdminSupervisors() {
  const theme = useAppTheme();
  const { data: supervisors = [], isLoading, isError, isRefetching, refetch } = useAdminSupervisors();
  const createSupervisor = useCreateSupervisor();
  const deleteSupervisor = useDeleteSupervisor();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [addError, setAddError] = useState('');
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
    name: { flex: 1, fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    email: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'left', writingDirection: 'ltr' },
    actionsRow: { flexDirection: 'row', gap: 8 },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
    sheetBody: { paddingHorizontal: 18, paddingTop: 8, gap: 12 },
    sheetTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, paddingHorizontal: 18, marginBottom: 4 },
    credCenter: { alignItems: 'center', paddingBottom: 4 },
    credBox: { backgroundColor: theme.greenPale, borderRadius: theme.radius, padding: 14, gap: 10 },
    credLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    credValue: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, writingDirection: 'ltr', textAlign: 'left' },
  }), [theme]);

  function setAddField<K extends keyof AddForm>(key: K, value: AddForm[K]) {
    setAddForm((p) => ({ ...p, [key]: value }));
  }

  function openAdd() {
    setAddForm(EMPTY_ADD);
    setAddError('');
    setAddOpen(true);
  }

  async function handleCreate() {
    if (!addForm.name.trim()) { setAddError('الاسم مطلوب'); return; }
    if (!addForm.email.trim()) { setAddError('البريد الإلكتروني مطلوب'); return; }
    if (!addForm.password) { setAddError('كلمة المرور مطلوبة'); return; }
    if (!addForm.gender) { setAddError('يرجى تحديد الفئة (بنين/بنات)'); return; }
    setAddError('');
    try {
      const res = await createSupervisor.mutateAsync({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        gender: addForm.gender,
      });
      setAddOpen(false);
      setCredentials(res.credentials);
    } catch (e) {
      setAddError((e as ApiError).message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteSupervisor.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isError && <Alert variant="error">تعذر تحميل بيانات المشرفين</Alert>}

        <View>
          <Button label="إضافة مشرف" icon={<IconUserPlus size={16} color={theme.white} />} onPress={openAdd} fullWidth />
        </View>

        <Card noPadding>
          <CardHeader title={`المشرفون (${supervisors.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={4} />}
            {!isLoading && supervisors.length === 0 && (
              <Text style={styles.empty}>لا يوجد مشرفون مسجلون بعد</Text>
            )}

            {!isLoading && supervisors.map((sup, i) => (
              <View key={sup._id} style={[styles.row, i < supervisors.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{sup.name.trim().charAt(0)}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{sup.name}</Text>
                  <Badge label={sup.gender === 'male' ? 'بنين' : 'بنات'} variant={sup.gender === 'male' ? 'blue' : 'gold'} />
                  <Badge label={sup.isActive ? 'نشط' : 'غير نشط'} variant={sup.isActive ? 'green' : 'gray'} />
                </View>

                <Text style={styles.email}>{sup.email}</Text>

                <View style={styles.actionsRow}>
                  <IconButton accessibilityLabel="حذف" tone="danger" onPress={() => setDeleteId(sup._id)}>
                    <IconTrash size={15} color={theme.red} />
                  </IconButton>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Add supervisor */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} snapPoints={['70%']}>
        <Text style={styles.sheetTitle}>إضافة مشرف جديد</Text>
        <View style={styles.sheetBody}>
          {!!addError && <Alert variant="error">{addError}</Alert>}
          <FormGroup label="الاسم الكامل" required>
            <FormInput value={addForm.name} onChangeText={(v) => setAddField('name', v)} placeholder="اسم المشرف" />
          </FormGroup>
          <FormGroup label="البريد الإلكتروني" required>
            <FormInput value={addForm.email} onChangeText={(v) => setAddField('email', v)} placeholder="supervisor@example.com" autoCapitalize="none" keyboardType="email-address" />
          </FormGroup>
          <FormGroup label="كلمة المرور" required>
            <FormInput value={addForm.password} onChangeText={(v) => setAddField('password', v)} placeholder="٦ أحرف على الأقل" secureTextEntry />
          </FormGroup>
          <FormGroup label="الفئة" required>
            <FormSelect
              options={GENDER_OPTIONS}
              value={addForm.gender}
              onChange={(v) => setAddField('gender', v as 'male' | 'female')}
              placeholder="اختر الفئة"
            />
          </FormGroup>
          <Button
            label={createSupervisor.isPending ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
            onPress={handleCreate}
            loading={createSupervisor.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>

      {/* Created credentials */}
      <BottomSheet visible={!!credentials} onClose={() => setCredentials(null)} snapPoints={['50%']}>
        <View style={styles.sheetBody}>
          <View style={styles.credCenter}>
            <IconCircleCheck size={40} color={theme.green} />
            <Text style={[styles.sheetTitle, { paddingHorizontal: 0, marginTop: 10 }]}>تم إنشاء حساب المشرف</Text>
            <Text style={{ fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', marginTop: 4 }}>
              احتفظ ببيانات الدخول وأرسلها للمشرف — لن تظهر مرة أخرى
            </Text>
          </View>
          {credentials && (
            <View style={styles.credBox}>
              <View>
                <Text style={styles.credLabel}>البريد الإلكتروني</Text>
                <Text style={styles.credValue}>{credentials.email}</Text>
              </View>
              <View>
                <Text style={styles.credLabel}>كلمة المرور</Text>
                <Text style={styles.credValue}>{credentials.password}</Text>
              </View>
            </View>
          )}
          <Button label="حسناً" onPress={() => setCredentials(null)} fullWidth />
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={!!deleteId}
        title="حذف المشرف"
        message="سيتم حذف حساب المشرف نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        pending={deleteSupervisor.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </SafeAreaView>
  );
}
