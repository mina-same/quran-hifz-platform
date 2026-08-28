import { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { IconFaceId, IconFingerprint } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';
import { success, error as errorHaptic } from '@/lib/haptics';

/** Shown after a stored session resumes silently, when the user has opted into
 * biometric re-auth (Account Settings). Requires Face ID/Touch ID before any
 * portal screen renders — "logout" falls back to the normal password login. */
export default function BiometricLockScreen() {
  const unlock = usePortalStore((s) => s.unlock);
  const logout = usePortalStore((s) => s.logout);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [faceId, setFaceId] = useState(true);

  async function attempt() {
    setChecking(true);
    setError('');
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setFaceId(types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION));

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // Nothing to authenticate against on this device — don't strand the user.
        unlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'أثبت هويتك للمتابعة',
        cancelLabel: 'إلغاء',
        disableDeviceFallback: false,
      });
      if (result.success) {
        success();
        unlock();
      } else {
        errorHaptic();
        setError('لم يتم التحقق من الهوية — حاول مرة أخرى');
      }
    } catch {
      errorHaptic();
      setError('تعذّر التحقق — حاول مرة أخرى');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Icon = faceId ? IconFaceId : IconFingerprint;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>الجلسة مقفلة</Text>
        <Text style={styles.sub}>تحقق من هويتك للمتابعة إلى حسابك</Text>

        <Pressable style={styles.unlockBtn} onPress={attempt} disabled={checking}>
          <Icon size={22} color={theme.white} />
          <Text style={styles.unlockText}>{checking ? 'جارٍ التحقق...' : 'فتح'}</Text>
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={logout} hitSlop={10} style={{ marginTop: 24 }}>
          <Text style={styles.logoutLink}>تسجيل الخروج والدخول بكلمة المرور</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.green },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  logo: { width: 72, height: 72, marginBottom: 16 },
  title: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.white },
  sub: { fontSize: 13, fontFamily: theme.fontCairo, color: 'rgba(255,255,255,0.7)', marginBottom: 24, textAlign: 'center' },
  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: theme.radiusFull, paddingHorizontal: 24, paddingVertical: 12,
  },
  unlockText: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.white },
  error: { fontSize: 12, fontFamily: theme.fontCairo, color: '#FCA5A5', marginTop: 14, textAlign: 'center' },
  logoutLink: { fontSize: 12, fontFamily: theme.fontCairo, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'underline' },
});
