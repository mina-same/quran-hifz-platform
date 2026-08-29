import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import Text from '@/components/ui/Text';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import CredentialsDialog from '@/components/ui/CredentialsDialog';
import { useTeachers, useCreateTeacher, useUpdateTeacher } from '@/lib/queries/teachers';

export default function AdminTeacherForm() {
  const router = useRouter();
  const s = useFormPageStyles();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: teachers = [] } = useTeachers();
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const existing = id ? teachers.find((t) => t._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setSpecialty(existing.specialty ?? '');
    setPhone(existing.phone ?? '');
    setRating(existing.rating ?? '');
    setStatus(existing.status);
    setEmail(existing.email ?? '');
  }, [existing?._id]);

  async function handleSubmit() {
    if (!name.trim()) { setError('اسم المعلم مطلوب'); return; }
    if (!id && email.trim() && !password) {
      setError('يرجى إدخال كلمة المرور مع البريد الإلكتروني');
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      specialty: specialty.trim() || undefined,
      phone: phone.trim() || undefined,
      rating: rating.trim() || undefined,
      status,
    };
    if (id) {
      if (email.trim()) body.email = email.trim();
      if (newPassword.trim()) body.newPassword = newPassword.trim();
    } else {
      if (email.trim()) body.email = email.trim();
      if (password) body.password = password;
    }

    try {
      setError('');
      if (id) {
        await updateTeacher.mutateAsync({ id, ...body });
        router.back();
      } else {
        const res = await createTeacher.mutateAsync(body);
        // The generated password comes back once and is never readable again —
        // stay on the page long enough to show it, then go back.
        if (res.credentials) setCredentials(res.credentials);
        else router.back();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <FormPage
        title={id ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
        error={error}
        pending={createTeacher.isPending || updateTeacher.isPending}
        onSubmit={handleSubmit}
      >
        <Text style={s.label}>الاسم الكامل *</Text>
        <FormInput placeholder="اسم المعلم" value={name} onChangeText={setName} />

        <Text style={s.label}>التخصص</Text>
        <FormInput placeholder="تجويد، حفظ، قراءات" value={specialty} onChangeText={setSpecialty} />

        <Text style={s.label}>رقم الجوال</Text>
        <FormInput placeholder="05XXXXXXXX" keyboardType="phone-pad" style={s.ltr} value={phone} onChangeText={setPhone} />

        <Text style={s.label}>التقييم</Text>
        <FormInput placeholder="مثال: ممتاز" value={rating} onChangeText={setRating} />

        <Text style={s.label}>الحالة</Text>
        <FormSelect
          value={status}
          onChange={(v) => setStatus(v as 'active' | 'inactive')}
          options={[
            { value: 'active', label: 'نشط' },
            { value: 'inactive', label: 'غير نشط' },
          ]}
          title="الحالة"
        />

        <View style={s.divider} />
        <Text style={s.sectionNote}>
          {id ? `بيانات الدخول${email ? '' : ' — لا يوجد حساب بعد'}` : 'بيانات الدخول (اختياري — لمنح المعلم حساباً في النظام)'}
        </Text>

        <Text style={s.label}>البريد الإلكتروني</Text>
        <FormInput
          placeholder="teacher@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          style={s.ltr}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={s.label}>{id ? 'كلمة مرور جديدة' : 'كلمة المرور'}</Text>
        <FormInput
          placeholder={id ? 'اتركه فارغاً إن لم تُرد تغييرها' : '6 أحرف على الأقل'}
          secureTextEntry
          autoCapitalize="none"
          style={s.ltr}
          value={id ? newPassword : password}
          onChangeText={id ? setNewPassword : setPassword}
        />
      </FormPage>

      <CredentialsDialog
        credentials={credentials}
        title="تم إنشاء حساب المعلم"
        onClose={() => { setCredentials(null); router.back(); }}
      />
    </>
  );
}
