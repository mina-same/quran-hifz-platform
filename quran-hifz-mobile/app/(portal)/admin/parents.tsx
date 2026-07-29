import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconUserPlus, IconPencil, IconX, IconCircleCheck, IconLink } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import BottomSheet from '@/components/ui/BottomSheet';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import {
  useAdminParents, useCreateParent, useUpdateParent, useLinkChild, useUnlinkChild,
  type ParentUser,
} from '@/lib/queries/adminParents';
import { useStudents } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { ApiError } from '@/lib/api';

type AddForm = { name: string; email: string; password: string };
const EMPTY_ADD: AddForm = { name: '', email: '', password: '' };

type EditForm = { name: string; email: string; newPassword: string };
type Credentials = { email: string; password: string };

function ChildChip({ name, onRemove, theme }: { name: string; onRemove: () => void; theme: ReturnType<typeof useAppTheme> }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: theme.greenPale, borderRadius: theme.radiusFull,
      paddingHorizontal: 10, paddingVertical: 4,
    }}>
      <Text style={{ fontSize: 12, fontFamily: theme.fontCairo, color: theme.green }}>{name}</Text>
      <Pressable onPress={onRemove} hitSlop={6}>
        <IconX size={13} color={theme.green} />
      </Pressable>
    </View>
  );
}

export default function AdminParents() {
  const theme = useAppTheme();
  const { data: parents = [], isLoading, isError, isRefetching, refetch } = useAdminParents();
  const { data: students = [], isRefetching: studentsRefetching, refetch: refetchStudents } = useStudents();

  const refreshing = isRefetching || studentsRefetching;
  const onRefresh = () => {
    refetch();
    refetchStudents();
  };
  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const linkChild = useLinkChild();
  const unlinkChild = useUnlinkChild();

  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [addError, setAddError] = useState('');
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const [editItem, setEditItem] = useState<ParentUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', newPassword: '' });
  const [editError, setEditError] = useState('');

  const [linkParent, setLinkParent] = useState<ParentUser | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    countText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 8 },
    row: { paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
    name: { flex: 1, fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    email: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'left', writingDirection: 'ltr' },
    childLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    childrenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
    sheetBody: { paddingHorizontal: 18, paddingTop: 8, gap: 12 },
    sheetTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, paddingHorizontal: 18, marginBottom: 4 },
    credCenter: { alignItems: 'center', paddingBottom: 4 },
    credBox: {
      backgroundColor: theme.greenPale, borderRadius: theme.radius, padding: 14, gap: 10,
    },
    credLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    credValue: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, writingDirection: 'ltr', textAlign: 'left' },
  }), [theme]);

  function setAddField<K extends keyof AddForm>(key: K, value: string) {
    setAddForm((p) => ({ ...p, [key]: value }));
  }
  function setEditField<K extends keyof EditForm>(key: K, value: string) {
    setEditForm((p) => ({ ...p, [key]: value }));
  }

  function openAdd() {
    setAddForm(EMPTY_ADD);
    setAddError('');
    setAddOpen(true);
  }

  function openEdit(p: ParentUser) {
    setEditForm({ name: p.name, email: p.email, newPassword: '' });
    setEditError('');
    setEditItem(p);
  }

  function openLink(p: ParentUser) {
    setSelectedStudentId('');
    setLinkParent(p);
  }

  async function handleCreate() {
    if (!addForm.name.trim()) { setAddError('الاسم مطلوب'); return; }
    if (!addForm.email.trim()) { setAddError('البريد الإلكتروني مطلوب'); return; }
    if (!addForm.password) { setAddError('كلمة المرور مطلوبة'); return; }
    setAddError('');
    try {
      const res = await createParent.mutateAsync({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
      });
      setAddOpen(false);
      setCredentials(res.credentials);
    } catch (e) {
      setAddError((e as ApiError).message);
    }
  }

  async function handleUpdate() {
    if (!editItem) return;
    if (!editForm.name.trim()) { setEditError('الاسم مطلوب'); return; }
    setEditError('');
    try {
      await updateParent.mutateAsync({
        parentId: editItem._id,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        newPassword: editForm.newPassword.trim() || undefined,
      });
      setEditItem(null);
    } catch (e) {
      setEditError((e as ApiError).message);
    }
  }

  async function handleLink() {
    if (!linkParent || !selectedStudentId) return;
    try {
      await linkChild.mutateAsync({ parentId: linkParent._id, studentId: selectedStudentId });
      setSelectedStudentId('');
      // Keep the sheet's local view of this parent's children in sync for the "already linked" list.
      setLinkParent((p) => (p && p._id === linkParent._id
        ? { ...p, children: [...p.children, { _id: selectedStudentId, name: students.find((s) => s._id === selectedStudentId)?.name ?? '', path: '' }] }
        : p));
    } catch {
      // already linked / server rejected — silently ignored, matching web behavior
    }
  }

  async function handleUnlink(parentId: string, studentId: string) {
    await unlinkChild.mutateAsync({ parentId, studentId });
    setLinkParent((p) => (p && p._id === parentId ? { ...p, children: p.children.filter((c) => c._id !== studentId) } : p));
  }

  const filtered = parents.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  const linkedIds = new Set(linkParent?.children.map((c) => c._id) ?? []);
  const availableStudents = students.filter((s) => !linkedIds.has(s._id));
  const studentOptions = availableStudents.map((s) => ({ value: s._id, label: s.name }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.green]} tintColor={theme.green} />}
      >
        {isError && <Alert variant="error">تعذر تحميل بيانات أولياء الأمور</Alert>}

        <Card>
          <FormInput
            placeholder="البحث بالاسم أو البريد الإلكتروني..."
            value={search}
            onChangeText={setSearch}
          />
          {!isLoading && !isError && (
            <Text style={styles.countText}>{filtered.length} من {parents.length} ولي أمر</Text>
          )}
          <View style={{ marginTop: 12 }}>
            <Button label="إضافة ولي أمر" icon={<IconUserPlus size={16} color={theme.white} />} onPress={openAdd} fullWidth />
          </View>
        </Card>

        <Card noPadding>
          <CardHeader title="قائمة أولياء الأمور" style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={4} />}

            {!isLoading && parents.length === 0 && (
              <Text style={styles.empty}>لا يوجد أولياء أمور مسجلون بعد</Text>
            )}
            {!isLoading && parents.length > 0 && filtered.length === 0 && (
              <Text style={styles.empty}>لا توجد نتائج مطابقة لبحثك</Text>
            )}

            {!isLoading && filtered.map((p, i) => (
              <View key={p._id} style={[styles.row, i < filtered.length - 1 && styles.rowBorder]}>
                <View style={styles.rowHead}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.name.trim().charAt(0)}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                  <Badge label={p.isActive ? 'نشط' : 'غير نشط'} variant={p.isActive ? 'green' : 'gray'} />
                </View>

                <Text style={styles.email}>{p.email}</Text>

                <View style={{ gap: 6 }}>
                  <Text style={styles.childLabel}>الأبناء{p.children.length > 0 ? ` (${p.children.length})` : ''}</Text>
                  <View style={styles.childrenWrap}>
                    {p.children.length === 0 && <Text style={styles.childLabel}>لا يوجد أبناء</Text>}
                    {p.children.map((c) => (
                      <ChildChip key={c._id} name={c.name} theme={theme} onRemove={() => handleUnlink(p._id, c._id)} />
                    ))}
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <Button label="تعديل" variant="ghost" icon={<IconPencil size={14} color={theme.green} />} onPress={() => openEdit(p)} />
                  <Button label="ربط ابن" variant="ghost" icon={<IconLink size={14} color={theme.green} />} onPress={() => openLink(p)} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Add parent */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} snapPoints={['65%']}>
        <Text style={styles.sheetTitle}>إضافة ولي أمر جديد</Text>
        <View style={styles.sheetBody}>
          {!!addError && <Alert variant="error">{addError}</Alert>}
          <FormGroup label="الاسم الكامل" required>
            <FormInput value={addForm.name} onChangeText={(v) => setAddField('name', v)} placeholder="اسم ولي الأمر" />
          </FormGroup>
          <FormGroup label="البريد الإلكتروني" required>
            <FormInput value={addForm.email} onChangeText={(v) => setAddField('email', v)} placeholder="parent@example.com" autoCapitalize="none" keyboardType="email-address" />
          </FormGroup>
          <FormGroup label="كلمة المرور" required>
            <FormInput value={addForm.password} onChangeText={(v) => setAddField('password', v)} placeholder="٦ أحرف على الأقل" secureTextEntry />
          </FormGroup>
          <Button
            label={createParent.isPending ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
            onPress={handleCreate}
            loading={createParent.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>

      {/* Created credentials */}
      <BottomSheet visible={!!credentials} onClose={() => setCredentials(null)} snapPoints={['50%']}>
        <View style={styles.sheetBody}>
          <View style={styles.credCenter}>
            <IconCircleCheck size={40} color={theme.green} />
            <Text style={[styles.sheetTitle, { paddingHorizontal: 0, marginTop: 10 }]}>تم إنشاء حساب ولي الأمر</Text>
            <Text style={{ fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', marginTop: 4 }}>
              احتفظ ببيانات الدخول وأرسلها لولي الأمر — لن تظهر مرة أخرى
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

      {/* Edit parent */}
      <BottomSheet visible={!!editItem} onClose={() => setEditItem(null)} snapPoints={['65%']}>
        <Text style={styles.sheetTitle}>تعديل بيانات ولي الأمر</Text>
        <View style={styles.sheetBody}>
          {!!editError && <Alert variant="error">{editError}</Alert>}
          <FormGroup label="الاسم الكامل" required>
            <FormInput value={editForm.name} onChangeText={(v) => setEditField('name', v)} />
          </FormGroup>
          <FormGroup label="البريد الإلكتروني">
            <FormInput value={editForm.email} onChangeText={(v) => setEditField('email', v)} autoCapitalize="none" keyboardType="email-address" />
          </FormGroup>
          <FormGroup label="كلمة مرور جديدة">
            <FormInput value={editForm.newPassword} onChangeText={(v) => setEditField('newPassword', v)} placeholder="اتركه فارغاً إن لم تُرد تغييرها" secureTextEntry />
          </FormGroup>
          <Button
            label={updateParent.isPending ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            onPress={handleUpdate}
            loading={updateParent.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>

      {/* Link child */}
      <BottomSheet visible={!!linkParent} onClose={() => setLinkParent(null)} snapPoints={['65%']}>
        <Text style={styles.sheetTitle}>{linkParent ? `ربط طالب بـ ${linkParent.name}` : ''}</Text>
        <View style={styles.sheetBody}>
          {linkParent && linkParent.children.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={styles.childLabel}>الأبناء الحاليون</Text>
              <View style={styles.childrenWrap}>
                {linkParent.children.map((c) => (
                  <ChildChip key={c._id} name={c.name} theme={theme} onRemove={() => handleUnlink(linkParent._id, c._id)} />
                ))}
              </View>
            </View>
          )}
          <FormGroup label="اختر الطالب">
            <FormSelect
              options={studentOptions}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              placeholder="— اختر طالباً —"
            />
          </FormGroup>
          <Button
            label={linkChild.isPending ? 'جارٍ الربط...' : 'ربط'}
            onPress={handleLink}
            disabled={!selectedStudentId}
            loading={linkChild.isPending}
            fullWidth
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
