import { Stack } from 'expo-router';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

/**
 * Portals are plain stacked routes — every secondary link lives in the
 * "المزيد" bottom sheet on each portal's tab bar, so there is no side drawer.
 */
export default function PortalLayout() {
  usePushNotifications();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="student" />
      <Stack.Screen name="teacher" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="parent" />
    </Stack>
  );
}
