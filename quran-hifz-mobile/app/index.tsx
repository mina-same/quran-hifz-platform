import { useMemo, useState } from 'react';
import {
  View, Image, StyleSheet, ScrollView, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller, useForm } from 'react-hook-form';
import {
  IconLock, IconMail, IconEye, IconEyeOff, IconSun, IconMoon, IconClock,
} from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { PORTAL_ROUTES } from '@/lib/constants/portals';
import { useParentChildren, type ParentChild } from '@/lib/queries/parent';
import { ApiError } from '@/lib/api';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { success, error } from '@/lib/haptics';

type FormData = { email: string; password: string };

function getHalqaName(h: ParentChild['halqa']): string {
  return typeof h === 'object' && h ? h.name : '';
}

export default function LoginScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const login = usePortalStore((s) => s.login);
  const toggleTheme = usePortalStore((s) => s.toggleTheme);
  const hasOnboarded = usePortalStore((s) => s.hasOnboarded);
  const sessionExpired = usePortalStore((s) => s.sessionExpired);
  const clearSessionExpired = usePortalStore((s) => s.clearSessionExpired);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showChildSelector, setShowChildSelector] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { email: '', password: '' } });

  const childrenQuery = useParentChildren();

  async function onSubmit(data: FormData) {
    setServerError('');
    clearSessionExpired();
    try {
      await login(data.email, data.password);
      success();
      const role = usePortalStore.getState().authUser?.role;
      if (role === 'parent') {
        setShowChildSelector(true);
      } else if (role) {
        router.replace(PORTAL_ROUTES[role] as any);
      }
    } catch (err) {
      error();
      setServerError(err instanceof ApiError ? err.message : 'حدث خطأ غير متوقع، حاول مرة أخرى');
    }
  }

  function handleSelectChild(child: ParentChild) {
    usePortalStore.getState().setSelectedChild(child._id);
    setShowChildSelector(false);
    router.replace(PORTAL_ROUTES.parent as any);
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 20 },
    // `flex-end` renders at the visual left under forced RTL — matches the design.
    topbar: { alignItems: 'flex-end', marginBottom: 8 },
    themeBtn: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.card,
      ...theme.shadow.md,
    },
    header: { alignItems: 'center', marginBottom: 28 },
    logo: { width: 132, height: 132 },
    title: {
      fontSize: 19, fontFamily: theme.fontAmiriBold, color: theme.green,
      textAlign: 'center', lineHeight: 30, marginTop: 12,
    },
    sub: { fontSize: 14, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 6 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      ...theme.shadow.md,
    },
    field: { gap: 8 },
    label: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'left' },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: theme.border, borderRadius: 12,
      paddingHorizontal: 14, minHeight: 52,
      backgroundColor: theme.card,
    },
    inputWrapError: { borderColor: theme.red },
    input: {
      flex: 1,
      fontSize: 15,
      fontFamily: theme.fontCairo,
      color: theme.text,
      textAlign: 'right',
      paddingVertical: 12,
    },
    fieldError: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo, textAlign: 'left' },
    footer: {
      marginTop: 28, fontSize: 11, color: theme.textMuted,
      fontFamily: theme.fontCairo, textAlign: 'center',
    },
    childCard: {
      backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center', gap: 6, width: '100%',
    },
    modalTitle: {
      fontSize: 17, fontFamily: theme.fontAmiriBold, color: theme.white,
      textAlign: 'center', marginTop: 24, marginBottom: 4,
    },
    cardTitle: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.white, marginTop: 6 },
    cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontCairo, textAlign: 'center' },
  }), [theme]);

  // First launch shows the onboarding slides before the login form.
  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.topbar}>
            <Pressable
              haptic="select"
              onPress={toggleTheme}
              hitSlop={8}
              style={styles.themeBtn}
              accessibilityLabel={theme.mode === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}
            >
              {theme.mode === 'dark'
                ? <IconSun size={22} color={theme.gold} />
                : <IconMoon size={22} color={theme.green} />}
            </Pressable>
          </View>

          <View style={styles.header}>
            <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</Text>
            <Text style={styles.sub}>منصة حفظ القرآن</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'بريد إلكتروني غير صحيح' },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrap, errors.email && styles.inputWrapError]}>
                    <IconMail size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@example.com"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>كلمة المرور</Text>
              <Controller
                control={control}
                name="password"
                rules={{ required: 'كلمة المرور مطلوبة', minLength: { value: 6, message: 'كلمة المرور 6 أحرف على الأقل' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrap, errors.password && styles.inputWrapError]}>
                    <IconLock size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      placeholderTextColor={theme.textMuted}
                    />
                    <Pressable
                      haptic="select"
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword
                        ? <IconEyeOff size={20} color={theme.textMuted} />
                        : <IconEye size={20} color={theme.textMuted} />}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>

            {sessionExpired && !serverError && (
              <Alert variant="warning" icon={<IconClock size={16} color="#92400E" />}>
                انتهت صلاحية جلستك — سجّل الدخول من جديد.
              </Alert>
            )}
            {!!serverError && (
              <Alert variant="error" icon={<IconLock size={16} color="#991B1B" />}>
                {serverError}
              </Alert>
            )}

            <Button
              label="دخول"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <Text style={styles.footer}>منصة تحفيظ القرآن • مصممة بواسطة The Bright Station</Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Child selector — shown after a parent logs in */}
      <Modal visible={showChildSelector} animationType="slide" statusBarTranslucent>
        <LinearGradient colors={[theme.green, theme.greenDark]} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, gap: 16 }}>
              <Text style={styles.modalTitle}>اختر ابنك لمتابعة أدائه</Text>
              {childrenQuery.isLoading && <ActivityIndicator color={theme.white} />}
              {childrenQuery.error && (
                <Text style={{ color: theme.white }}>تعذّر تحميل قائمة الأبناء</Text>
              )}
              {childrenQuery.data?.map((child) => (
                <Pressable
                  key={child._id}
                  onPress={() => handleSelectChild(child)}
                  style={styles.childCard}
                >
                  <Text style={styles.cardTitle}>{child.name}</Text>
                  <Text style={styles.cardDesc}>{child.path}</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]}>
                    {getHalqaName(child.halqa)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </>
  );
}
