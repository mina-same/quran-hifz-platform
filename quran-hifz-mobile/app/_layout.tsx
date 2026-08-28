import '../global.css';
import { useEffect } from 'react';
import { I18nManager, Platform, UIManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import {
  Amiri_400Regular,
  Amiri_700Bold,
} from '@expo-google-fonts/amiri';
import { usePortalStore } from '@/lib/store/portalStore';
import BiometricLockScreen from '@/components/domain/BiometricLockScreen';

// Enable RTL for Arabic
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.allowRTL(true);
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Keep the native branded splash (configured via app.json's expo-splash-screen
// plugin) on screen until fonts + auth hydration are both ready, instead of
// swapping to a JS-rendered loading view — avoids a flash between the native
// splash and first paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
  });
  const isHydrating = usePortalStore((s) => s.isHydrating);
  const authUser = usePortalStore((s) => s.authUser);
  const isLocked = usePortalStore((s) => s.isLocked);
  const themeMode = usePortalStore((s) => s.themeMode);
  const hydrate = usePortalStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const ready = fontsLoaded && !isHydrating;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Required by useSafeAreaInsets(), which throws without it — the shared
            BottomSheet uses it so a sheet's footer buttons clear the home
            indicator. `initialWindowMetrics` seeds the first frame so nothing
            jumps once the native measurement lands. */}
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <BottomSheetModalProvider>
            <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
            {authUser && isLocked ? (
              <BiometricLockScreen />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={!!authUser}>
                  <Stack.Screen name="(portal)" />
                </Stack.Protected>
                <Stack.Protected guard={!authUser}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding" />
                </Stack.Protected>
              </Stack>
            )}
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
