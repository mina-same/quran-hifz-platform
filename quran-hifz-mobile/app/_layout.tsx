import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, I18nManager, Platform, UIManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { theme } from '@/lib/theme';
import { usePortalStore } from '@/lib/store/portalStore';

// Enable RTL for Arabic
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.allowRTL(true);
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const hydrate = usePortalStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!fontsLoaded || isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.green }}>
        <ActivityIndicator color={theme.white} size="large" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" backgroundColor={theme.green} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!authUser}>
            <Stack.Screen name="(portal)" />
          </Stack.Protected>
          <Stack.Protected guard={!authUser}>
            <Stack.Screen name="index" />
          </Stack.Protected>
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
