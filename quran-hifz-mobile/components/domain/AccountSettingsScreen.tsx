import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Switch, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/forms/FormGroup';
import FormInput from '@/components/forms/FormInput';
import Skeleton from '@/components/ui/Skeleton';
import { useMe, useUpdateProfile, useChangePassword } from '@/lib/queries/auth';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { ApiError } from '@/lib/api';

/**
 * Shared "الملف الشخصي" screen for student + teacher portals (admin/parent
 * deliberately excluded, matching web's AccountSettings.tsx scope):
 * view email (read-only), edit name, change password.
 */
export default function AccountSettingsScreen() {
  const theme = useAppTheme();
  const updateUserName = usePortalStore((s) => s.updateUserName);
  const biometricEnabled = usePortalStore((s) => s.biometricEnabled);
  const setBiometricEnabled = usePortalStore((s) => s.setBiometricEnabled);
  const { data: me, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  useEffect(() => {
    LocalAuthentication.hasHardwareAsync()
      .then((hw) => hw ? LocalAuthentication.isEnrolledAsync() : false)
      .then(setBiometricAvailable)
      .catch(() => setBiometricAvailable(false));
  }, []);

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    loadingBox: { paddingVertical: 24, alignItems: 'center' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    switchLabel: { flex: 1, fontSize: 13, fontFamily: theme.fontCairo, color: theme.text, textAlign: 'right' },
  }), [theme]);

  async function handleSaveName() {
    setNameSaved(false);
    if (name.trim().length < 2) {
      setNameError('الاسم مطلوب (٢ أحرف على الأقل)');
      return;
    }
    setNameError('');
    try {
      const res = await updateProfile.mutateAsync(name.trim());
      updateUserName(res.user.name);
      setNameSaved(true);
    } catch {
      // surfaced via updateProfile.isError below
    }
  }

  async function handleChangePassword() {
    setPwSaved(false);
    if (!currentPassword) { setPwError('كلمة المرور الحالية مطلوبة'); return; }
    if (newPassword.length < 6) { setPwError('كلمة المرور الجديدة يجب أن تكون ٦ أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setPwError('كلمتا المرور غير متطابقتين'); return; }
    setPwError('');
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSaved(true);
    } catch {
      // surfaced via changePassword.isError below
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <Card>
            <Skeleton height={44} style={{ marginBottom: 14 }} />
            <Skeleton height={44} />
          </Card>
          <Card>
            <Skeleton height={44} style={{ marginBottom: 14 }} />
            <Skeleton height={44} style={{ marginBottom: 14 }} />
            <Skeleton height={44} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card>
            <CardHeader title="البيانات الشخصية" />
          <View style={{ gap: 12 }}>
            <FormGroup label="البريد الإلكتروني">
              <FormInput value={me?.email ?? ''} editable={false} />
            </FormGroup>
            <FormGroup label="الاسم الكامل" required error={nameError}>
              <FormInput value={name} onChangeText={setName} placeholder="اكتب اسمك الكامل" />
            </FormGroup>
            <Button
              label={updateProfile.isPending ? 'جارٍ الحفظ...' : 'حفظ الاسم'}
              onPress={handleSaveName}
              loading={updateProfile.isPending}
              fullWidth
            />
            {nameSaved && <Alert variant="success">تم تحديث الاسم بنجاح</Alert>}
            {updateProfile.isError && (
              <Alert variant="error">{(updateProfile.error as ApiError).message}</Alert>
            )}
          </View>
        </Card>

        <Card>
          <CardHeader title="تغيير كلمة المرور" />
          <View style={{ gap: 12 }}>
            <FormGroup label="كلمة المرور الحالية" required>
              <FormInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            </FormGroup>
            <FormGroup label="كلمة المرور الجديدة" required>
              <FormInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="٦ أحرف على الأقل" />
            </FormGroup>
            <FormGroup label="تأكيد كلمة المرور الجديدة" required error={pwError}>
              <FormInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </FormGroup>
            <Button
              label={changePassword.isPending ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
              onPress={handleChangePassword}
              loading={changePassword.isPending}
              fullWidth
            />
            {pwSaved && <Alert variant="success">تم تغيير كلمة المرور بنجاح</Alert>}
            {changePassword.isError && (
              <Alert variant="error">{(changePassword.error as ApiError).message}</Alert>
            )}
          </View>
        </Card>

        {biometricAvailable && (
          <Card>
            <CardHeader title="تسجيل الدخول ببصمة الوجه/الإصبع" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>اطلب التحقق البيومتري عند فتح التطبيق</Text>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ true: theme.green, false: theme.border }}
              />
            </View>
          </Card>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
