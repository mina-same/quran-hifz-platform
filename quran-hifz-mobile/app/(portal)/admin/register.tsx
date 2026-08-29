import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import CredentialsDialog from '@/components/ui/CredentialsDialog';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useCreateStudent } from '@/lib/queries/students';
import { useMasajid } from '@/lib/queries/masajid';
import { useHalqat } from '@/lib/queries/halqat';
import { pickMasar, READING_LEVELS } from '@/lib/constants/masarMap';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

type Fields = {
  name: string; age: string; guardianPhone: string;
  level: string; studentLevel: string;
  masjid: string; halqa: string;
  email: string; password: string;
};
const EMPTY: Fields = {
  name: '', age: '', guardianPhone: '', level: '', studentLevel: '',
  masjid: '', halqa: '', email: '', password: '',
};

/** Same rules as the web's zod schema — kept in the same order so the first
 *  message a user sees matches between the two clients. */
function validate(f: Fields): string | null {
  if (f.name.trim().length < 2) return 'الاسم مطلوب (٢ أحرف على الأقل)';
  if (!f.age.trim()) return 'العمر مطلوب';
  if (Number(f.age) < 4 || Number(f.age) > 80) return 'العمر بين ٤ و٨٠';
  if (!f.guardianPhone.trim()) return 'جوال ولي الأمر مطلوب';
  if (!/^05\d{8}$/.test(f.guardianPhone.trim())) return 'صيغة الجوال: 05XXXXXXXX';
  if (!f.level) return 'يرجى اختيار مستوى القراءة';
  if (f.studentLevel.trim() && (Number(f.studentLevel) < 1 || Number(f.studentLevel) > 10)) return 'المستوى بين ١ و١٠';
  if (!f.masjid) return 'يرجى اختيار المسجد';
  if (!f.halqa) return 'يرجى اختيار الحلقة';
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'البريد الإلكتروني غير صحيح';
  return null;
}

export default function AdminRegister() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  const { data: masajid = [] } = useMasajid();
  const { data: halqat = [] } = useHalqat();
  const createStudent = useCreateStudent();

  const [form, setForm] = useState<Fields>(EMPTY);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  function sf<K extends keyof Fields>(k: K, v: Fields[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // The programme is derived from the reading level + age, never picked by hand.
  const masar = useMemo(
    () => pickMasar(form.level, form.age ? parseInt(form.age, 10) : undefined),
    [form.level, form.age],
  );

  async function handleSubmit() {
    const msg = validate(form);
    if (msg) { setError(msg); return; }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      guardian: '',
      guardianPhone: form.guardianPhone.trim(),
      halqa: form.halqa,
      masjid: form.masjid,
      path: masar?.path ?? 'حفظ كامل',
      status: 'new',
    };
    if (form.studentLevel.trim()) body.level = Number(form.studentLevel);
    if (form.email.trim()) body.email = form.email.trim();
    if (form.password) body.password = form.password;

    try {
      setError('');
      const res = await createStudent.mutateAsync(body);
      setForm(EMPTY);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
      if (res.credentials) setCredentials(res.credentials);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {saved && <Alert variant="success">تم تسجيل الطالب بنجاح</Alert>}
          {!!error && <Alert variant="error">{error}</Alert>}

          <Card>
            <CardHeader title="بيانات الطالب" />
            <View style={s.formCol}>
              <FormGroup label="الاسم الكامل" required>
                <FormInput placeholder="اسم الطالب رباعياً" value={form.name} onChangeText={(v) => sf('name', v)} />
              </FormGroup>
              <FormGroup label="العمر" required>
                <FormInput placeholder="بالسنوات" keyboardType="number-pad" value={form.age} onChangeText={(v) => sf('age', v)} />
              </FormGroup>
              <FormGroup label="جوال ولي الأمر" required>
                <FormInput
                  placeholder="05XXXXXXXX"
                  keyboardType="phone-pad"
                  style={s.ltr}
                  value={form.guardianPhone}
                  onChangeText={(v) => sf('guardianPhone', v)}
                />
              </FormGroup>
            </View>
          </Card>

          <Card>
            <CardHeader title="مستوى القراءة والمسار" />
            <View style={s.formCol}>
              <FormGroup label="مستوى القراءة الحالي" required>
                <FormSelect
                  value={form.level}
                  onChange={(v) => sf('level', v)}
                  options={READING_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                  placeholder="اختر المستوى"
                />
              </FormGroup>
              <FormGroup label="المستوى (رقم من ١ إلى ١٠)">
                <FormInput placeholder="مثال: ٣" keyboardType="number-pad" value={form.studentLevel} onChangeText={(v) => sf('studentLevel', v)} />
              </FormGroup>
            </View>

            {masar && (
              <View style={s.masar}>
                <Text style={s.masarLabel}>المسار المقترح تلقائياً</Text>
                <Text style={s.masarName}>{masar.name}</Text>
                <Text style={s.masarDesc}>{masar.desc}</Text>
                <Text style={s.masarHalqa}>الحلقة المقترحة: {masar.halqa}</Text>
              </View>
            )}
          </Card>

          <Card>
            <CardHeader title="المسجد والحلقة" />
            <View style={s.formCol}>
              <FormGroup label="المسجد" required>
                <FormSelect
                  value={form.masjid}
                  onChange={(v) => sf('masjid', v)}
                  options={masajid.map((m) => ({ value: m._id, label: m.name }))}
                  placeholder="اختر المسجد"
                />
              </FormGroup>
              <FormGroup label="الحلقة" required>
                <FormSelect
                  value={form.halqa}
                  onChange={(v) => sf('halqa', v)}
                  options={halqat.map((h) => ({ value: h._id, label: h.name }))}
                  placeholder="اختر الحلقة"
                />
              </FormGroup>
            </View>
          </Card>

          <Card>
            <CardHeader title="بيانات الدخول (اختياري)" />
            <Text style={s.note}>لمنح الطالب حساباً في النظام</Text>
            <View style={s.formCol}>
              <FormGroup label="البريد الإلكتروني">
                <FormInput
                  placeholder="student@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={s.ltr}
                  value={form.email}
                  onChangeText={(v) => sf('email', v)}
                />
              </FormGroup>
              <FormGroup label="كلمة المرور">
                <FormInput
                  placeholder="6 أحرف على الأقل"
                  secureTextEntry
                  autoCapitalize="none"
                  style={s.ltr}
                  value={form.password}
                  onChangeText={(v) => sf('password', v)}
                />
              </FormGroup>
            </View>
          </Card>

          <View style={s.actions}>
            <View style={s.flex1}>
              <Button
                label={createStudent.isPending ? 'جارٍ الحفظ...' : 'حفظ التسجيل'}
                fullWidth
                disabled={createStudent.isPending}
                onPress={handleSubmit}
              />
            </View>
            <View style={s.flex1}>
              <Button label="إلغاء" variant="ghost" fullWidth onPress={() => { setForm(EMPTY); setError(''); }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CredentialsDialog
        credentials={credentials}
        title="تم تسجيل الطالب وإنشاء حسابه"
        onClose={() => setCredentials(null)}
      />
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    formCol: { gap: 14 },
    flex1: { flex: 1 },
    actions: { flexDirection: 'row', gap: 10 },
    ltr: { textAlign: 'right', writingDirection: 'ltr' },
    note: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 10 },
    masar: {
      marginTop: 14,
      backgroundColor: theme.tone.green.bg,
      borderRadius: theme.radiusSm,
      padding: 14,
      gap: 3,
    },
    masarLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.tone.green.text },
    masarName: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.tone.green.text },
    masarDesc: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.tone.green.text },
    masarHalqa: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.green.text, marginTop: 6 },
  });
}
