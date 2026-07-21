import { useState, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useHalqat } from '@/lib/queries/halqat';
import { useMasajid } from '@/lib/queries/masajid';
import { useCreateStudent } from '@/lib/queries/students';
import { theme } from '@/lib/theme';

const PATHS = [
  { value: 'full',   label: 'حفظ كامل (٦٠٤ صفحات — ٣ سنوات)' },
  { value: 'twenty', label: 'عشرون جزءاً (٣٠٢ صفحات — ٢ سنوات)' },
  { value: 'ten',    label: 'عشرة أجزاء (١٥١ صفحة — سنة)' },
];

const PATH_NAME: Record<string, string> = {
  full: 'حفظ كامل',
  twenty: 'عشرون جزءاً',
  ten: 'عشرة أجزاء',
};

const PATH_INFO: Record<string, { duration: string; pages: string; daily: string }> = {
  full:   { duration: '٣ سنوات',   pages: '٦٠٤ صفحات', daily: '~١ صفحة/يوم' },
  twenty: { duration: '٢ سنوات',   pages: '٣٠٢ صفحات', daily: '~٠.٥ صفحة/يوم' },
  ten:    { duration: 'سنة واحدة', pages: '١٥١ صفحة',  daily: '~٠.٥ صفحة/يوم' },
};

const RELATION = [
  { value: 'father',  label: 'الأب' },
  { value: 'mother',  label: 'الأم' },
  { value: 'brother', label: 'الأخ' },
  { value: 'other',   label: 'أخرى' },
];

export default function AdminRegister() {
  const { data: masajid = [] } = useMasajid();
  const { data: halqat = [] } = useHalqat();
  const createStudent = useCreateStudent();

  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [masjid, setMasjid] = useState('');
  const [halqa, setHalqa] = useState('');

  const halqaOptions = useMemo(() => halqat.map((h) => ({ value: h._id, label: h.name })), [halqat]);
  const masjidOptions = useMemo(() => masajid.map((m) => ({ value: m._id, label: m.name })), [masajid]);
  const pathInfo = selectedPath ? PATH_INFO[selectedPath] : null;

  const canSubmit = !!(name.trim() && guardianName.trim() && guardianPhone.trim() && selectedPath && masjid && halqa);

  async function handleSubmit() {
    if (!canSubmit) return;
    await createStudent.mutateAsync({
      name: name.trim(),
      guardian: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      halqa,
      masjid,
      path: PATH_NAME[selectedPath],
      status: 'new',
    });
    setName(''); setNationalId(''); setPhone(''); setDob('');
    setGuardianName(''); setGuardianRelation(''); setGuardianPhone('');
    setSelectedPath(''); setMasjid(''); setHalqa('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {createStudent.isSuccess && (
            <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
              تم تسجيل الطالب بنجاح.
            </Alert>
          )}
          {createStudent.isError && (
            <Alert variant="warning">{(createStudent.error as Error).message}</Alert>
          )}

          {/* Student info */}
          <Card>
            <CardHeader title="بيانات الطالب" />
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <FormGroup label="الاسم الكامل" required>
                  <FormInput placeholder="أدخل الاسم الكامل" value={name} onChangeText={setName} />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="رقم الهوية الوطنية">
                  <FormInput placeholder="١٠XXXXXXXXX" keyboardType="numeric" value={nationalId} onChangeText={setNationalId} />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="رقم الجوال">
                  <FormInput placeholder="٠٥XXXXXXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="تاريخ الميلاد">
                  <FormInput placeholder="١٤٤٠/٠١/٠١" value={dob} onChangeText={setDob} />
                </FormGroup>
              </View>
            </View>
          </Card>

          {/* Guardian info */}
          <Card>
            <CardHeader title="بيانات ولي الأمر" />
            <View style={styles.formCol}>
              <FormGroup label="اسم ولي الأمر" required>
                <FormInput placeholder="الاسم الكامل" value={guardianName} onChangeText={setGuardianName} />
              </FormGroup>
              <FormGroup label="صلة القرابة">
                <FormSelect options={RELATION} placeholder="اختر صلة القرابة" value={guardianRelation} onChange={setGuardianRelation} />
              </FormGroup>
              <FormGroup label="رقم الجوال / واتساب" required>
                <FormInput placeholder="٠٥XXXXXXXX" keyboardType="phone-pad" value={guardianPhone} onChangeText={setGuardianPhone} />
              </FormGroup>
            </View>
          </Card>

          {/* Hifz path */}
          <Card>
            <CardHeader title="مسار الحفظ والحلقة" />
            <View style={styles.formCol}>
              <FormGroup label="مسار الحفظ" required>
                <FormSelect options={PATHS} placeholder="اختر المسار" onChange={setSelectedPath} value={selectedPath} />
              </FormGroup>
              <FormGroup label="المسجد" required>
                <FormSelect options={masjidOptions} placeholder="اختر المسجد" value={masjid} onChange={setMasjid} />
              </FormGroup>
              <FormGroup label="الحلقة" required>
                <FormSelect options={halqaOptions} placeholder="اختر الحلقة" value={halqa} onChange={setHalqa} />
              </FormGroup>
            </View>

            {pathInfo && (
              <View style={styles.pathResult}>
                <Text style={styles.pathTitle}>الخطة التقديرية</Text>
                <View style={styles.pathGrid}>
                  {[
                    ['المدة',           pathInfo.duration],
                    ['إجمالي الصفحات',  pathInfo.pages],
                    ['المعدل اليومي',   pathInfo.daily],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.pathItem}>
                      <Text style={styles.pathLabel}>{k}</Text>
                      <Text style={styles.pathValue}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>

          <Button
            label={createStudent.isPending ? 'جارٍ الحفظ...' : 'حفظ التسجيل'}
            onPress={handleSubmit}
            loading={createStudent.isPending}
            disabled={!canSubmit}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  page: { padding: theme.pagePadding, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { width: '47%' },
  formCol: { gap: 14 },
  pathResult: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: theme.radiusSm,
    padding: 14,
    gap: 10,
  },
  pathTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.green },
  pathGrid: { flexDirection: 'row', gap: 12 },
  pathItem: { flex: 1, gap: 4 },
  pathLabel: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
  pathValue: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.green },
});
