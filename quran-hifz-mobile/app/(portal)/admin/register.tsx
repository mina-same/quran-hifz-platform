import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { HALQAT } from '@/lib/data/halqat';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const PATHS = [
  { value: 'full',   label: 'حفظ كامل (٦٠٤ صفحات — ٣ سنوات)' },
  { value: 'twenty', label: 'عشرون جزءاً (٣٠٢ صفحات — ٢ سنوات)' },
  { value: 'ten',    label: 'عشرة أجزاء (١٥١ صفحة — سنة)' },
];

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
  const [selectedPath, setSelectedPath] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const halqaOptions = HALQAT.map((h) => ({ value: h.id, label: `${h.name} — ${h.mosque}` }));
  const pathInfo = selectedPath ? PATH_INFO[selectedPath] : null;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {submitted && (
            <Alert variant="success" icon={<IconCircleCheck size={18} color="#166534" />}>
              تم تسجيل الطالب بنجاح وإرسال رسالة واتساب لولي الأمر.
            </Alert>
          )}

          {/* Student info */}
          <Card>
            <CardHeader title="بيانات الطالب" />
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <FormGroup label="الاسم الكامل" required>
                  <FormInput placeholder="أدخل الاسم الكامل" />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="رقم الهوية الوطنية">
                  <FormInput placeholder="١٠XXXXXXXXX" keyboardType="numeric" />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="رقم الجوال">
                  <FormInput placeholder="٠٥XXXXXXXX" keyboardType="phone-pad" />
                </FormGroup>
              </View>
              <View style={styles.gridItem}>
                <FormGroup label="تاريخ الميلاد">
                  <FormInput placeholder="١٤٤٠/٠١/٠١" />
                </FormGroup>
              </View>
            </View>
          </Card>

          {/* Guardian info */}
          <Card>
            <CardHeader title="بيانات ولي الأمر" />
            <View style={styles.formCol}>
              <FormGroup label="اسم ولي الأمر" required>
                <FormInput placeholder="الاسم الكامل" />
              </FormGroup>
              <FormGroup label="صلة القرابة">
                <FormSelect options={RELATION} placeholder="اختر صلة القرابة" onChange={() => {}} />
              </FormGroup>
              <FormGroup label="رقم الجوال / واتساب" required>
                <FormInput placeholder="٠٥XXXXXXXX" keyboardType="phone-pad" />
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
              <FormGroup label="الحلقة" required>
                <FormSelect options={halqaOptions} placeholder="اختر الحلقة" onChange={() => {}} />
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

          <Button label="حفظ التسجيل وإرسال إشعار" onPress={handleSubmit} fullWidth />
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
