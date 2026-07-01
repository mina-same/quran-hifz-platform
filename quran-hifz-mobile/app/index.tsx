import { useState } from 'react';
import {
  View, Text, Image, Pressable, StyleSheet, ScrollView, SafeAreaView, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller, useForm } from 'react-hook-form';
import { IconLock, IconMail } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { PORTAL_ROUTES } from '@/lib/constants/portals';
import { useParentChildren, type ParentChild } from '@/lib/queries/parent';
import { ApiError } from '@/lib/api';
import { theme } from '@/lib/theme';
import FormInput from '@/components/forms/FormInput';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

type FormData = { email: string; password: string };

function getHalqaName(h: ParentChild['halqa']): string {
  return typeof h === 'object' && h ? h.name : '';
}

export default function LoginScreen() {
  const router = useRouter();
  const login = usePortalStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const [showChildSelector, setShowChildSelector] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { email: '', password: '' } });

  const childrenQuery = useParentChildren();

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await login(data.email, data.password);
      const role = usePortalStore.getState().authUser?.role;
      if (role === 'parent') {
        setShowChildSelector(true);
      } else if (role) {
        router.replace(PORTAL_ROUTES[role] as any);
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'حدث خطأ غير متوقع، حاول مرة أخرى');
    }
  }

  function handleSelectChild(child: ParentChild) {
    usePortalStore.getState().setSelectedChild(child._id);
    setShowChildSelector(false);
    router.replace(PORTAL_ROUTES.parent as any);
  }

  return (
    <>
      <LinearGradient colors={[theme.green, theme.greenDark]} style={styles.bg}>
        <View style={styles.overlay} pointerEvents="none" />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</Text>
              <Text style={styles.sub}>سجّل الدخول للمتابعة</Text>
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
                    <FormInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!errors.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
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
                    <FormInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={!!errors.password}
                      secureTextEntry
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  )}
                />
                {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
              </View>

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
                icon={<IconMail size={16} color={theme.white} />}
              />
            </View>

            <Text style={styles.footer}>منصة تحفيظ القرآن • مصممة بواسطة The Bright Station</Text>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Child selector — shown after a parent logs in */}
      <Modal visible={showChildSelector} animationType="slide" statusBarTranslucent>
        <LinearGradient colors={[theme.green, theme.greenDark]} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, gap: 16 }}>
              <Text style={[styles.title, { marginTop: 24, marginBottom: 4 }]}>اختر ابنك لمتابعة أدائه</Text>
              {childrenQuery.isLoading && <ActivityIndicator color={theme.white} />}
              {childrenQuery.error && (
                <Text style={{ color: theme.white }}>تعذّر تحميل قائمة الأبناء</Text>
              )}
              {childrenQuery.data?.map((child) => (
                <Pressable
                  key={child._id}
                  onPress={() => handleSelectChild(child)}
                  style={({ pressed }) => [styles.childCard, pressed && styles.cardPressed]}
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

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(201,149,42,0.05)' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 0 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: theme.fontAmiriBold, color: theme.white, textAlign: 'center', lineHeight: 28, marginBottom: 6 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontCairo },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 20, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.white, textAlign: 'right' },
  fieldError: { fontSize: 12, color: '#FCA5A5', fontFamily: theme.fontCairo, textAlign: 'right' },
  childCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center', gap: 6, width: '100%' },
  cardPressed: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: theme.gold },
  cardTitle: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.white, marginTop: 6 },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontCairo, textAlign: 'center' },
  footer: { marginTop: 36, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: theme.fontCairo, textAlign: 'center' },
});
