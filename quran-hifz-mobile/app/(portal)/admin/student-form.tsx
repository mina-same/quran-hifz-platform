import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import Text from '@/components/ui/Text';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useStudents, useUpdateStudent, type Student } from '@/lib/queries/students';
import { useTracks } from '@/lib/queries/tracks';
import { useAdminParents, useStudentParent, useSetStudentParent } from '@/lib/queries/adminParents';
import { SERVER_PATHS } from '@/lib/constants/masarMap';

function getId(v: unknown): string {
  if (v && typeof v === 'object' && '_id' in v) return (v as { _id: string })._id;
  if (typeof v === 'string') return v;
  return '';
}

/** Sentinel for "بدون ولي أمر" — leaving the picker untouched keeps the current link. */
const UNLINK = '__none__';

export default function AdminStudentForm() {
  const router = useRouter();
  const s = useFormPageStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: students = [] } = useStudents();
  const { data: tracks = [] } = useTracks();
  const { data: parents = [] } = useAdminParents();
  const { data: currentParent } = useStudentParent(id ?? null);

  const updateStudent = useUpdateStudent();
  const setStudentParent = useSetStudentParent();

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [level, setLevel] = useState('');
  const [track, setTrack] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [status, setStatus] = useState<Student['status']>('active');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [error, setError] = useState('');

  const existing = id ? students.find((st) => st._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPath(existing.path);
    setLevel(existing.level != null ? String(existing.level) : '');
    setTrack(getId(existing.track));
    setGuardianPhone(existing.guardianPhone ?? '');
    setNationalId(existing.nationalId ?? '');
    setStatus(existing.status);
    setEmail(existing.email ?? '');
  }, [existing?._id]);

  async function handleSubmit() {
    if (!id) return;
    if (!name.trim()) { setError('الاسم مطلوب'); return; }
    if (email.trim() && !password && !existing?.email) {
      setError('يرجى إدخال كلمة المرور لمنح الطالب حساباً جديداً');
      return;
    }
    try {
      setError('');
      await updateStudent.mutateAsync({
        id,
        name: name.trim(),
        path,
        track: track || undefined,
        guardianPhone: guardianPhone.trim(),
        nationalId: nationalId.trim() || undefined,
        status,
        ...(level.trim() && { level: Number(level) }),
        ...(email.trim() && { email: email.trim() }),
        ...(password && { password }),
      });
      if (selectedParentId !== '') {
        await setStudentParent.mutateAsync({
          studentId: id,
          parentId: selectedParentId === UNLINK ? null : selectedParentId,
        });
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <FormPage
      title="تعديل بيانات الطالب"
      subtitle={existing?.name}
      submitLabel="حفظ التعديلات"
      error={error}
      pending={updateStudent.isPending || setStudentParent.isPending}
      onSubmit={handleSubmit}
    >
      <Text style={s.label}>الاسم *</Text>
      <FormInput placeholder="الاسم الكامل" value={name} onChangeText={setName} />

      <Text style={s.label}>المسار</Text>
      <FormSelect
        value={path}
        onChange={setPath}
        options={SERVER_PATHS.map((p) => ({ value: p, label: p }))}
        placeholder="اختر المسار"
        title="المسار"
      />

      <Text style={s.label}>المستوى (رقم من ١ إلى ١٠)</Text>
      <FormInput placeholder="مثال: ٣" keyboardType="number-pad" value={level} onChangeText={setLevel} />

      <Text style={s.label}>المسار</Text>
      <FormSelect
        value={track}
        onChange={setTrack}
        options={tracks.map((t) => ({ value: t._id, label: t.title }))}
        placeholder="اختر المسار"
        title="المسار"
      />

      <Text style={s.label}>جوال ولي الأمر</Text>
      <FormInput
        placeholder="05XXXXXXXX"
        keyboardType="phone-pad"
        style={s.ltr}
        value={guardianPhone}
        onChangeText={setGuardianPhone}
      />

      <Text style={s.label}>رقم الهوية</Text>
      <FormInput
        placeholder="١٠ أرقام"
        keyboardType="number-pad"
        maxLength={10}
        style={s.ltr}
        value={nationalId}
        onChangeText={(v) => setNationalId(v.replace(/[^0-9]/g, ''))}
      />

      <Text style={s.label}>الحالة</Text>
      <FormSelect
        value={status}
        onChange={(v) => setStatus(v as Student['status'])}
        options={[
          { value: 'active', label: 'نشط' },
          { value: 'new', label: 'جديد' },
          { value: 'inactive', label: 'غير نشط' },
        ]}
        title="الحالة"
      />

      <View style={s.divider} />
      <Text style={s.sectionNote}>
        ولي الأمر في النظام{currentParent ? `: ${currentParent.name}` : ' — لا يوجد ولي أمر'}
      </Text>
      <View style={{ marginTop: 8 }}>
        <FormSelect
          value={selectedParentId}
          onChange={setSelectedParentId}
          options={[
            { value: UNLINK, label: 'بدون ولي أمر' },
            ...parents.map((p) => ({ value: p._id, label: `${p.name} (${p.email})` })),
          ]}
          placeholder="الإبقاء على الحالي"
          title="ولي الأمر"
        />
      </View>

      <View style={s.divider} />
      <Text style={s.sectionNote}>بيانات الدخول{existing?.email ? '' : ' — لا يوجد حساب بعد'}</Text>

      <Text style={s.label}>البريد الإلكتروني</Text>
      <FormInput
        placeholder="student@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        style={s.ltr}
        value={email}
        onChangeText={setEmail}
      />

      <Text style={s.label}>كلمة مرور جديدة</Text>
      <FormInput
        placeholder="اتركه فارغاً إن لم تُرد تغييرها"
        secureTextEntry
        autoCapitalize="none"
        style={s.ltr}
        value={password}
        onChangeText={setPassword}
      />
    </FormPage>
  );
}
