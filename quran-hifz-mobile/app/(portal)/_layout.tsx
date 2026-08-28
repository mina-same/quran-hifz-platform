import { Redirect, Stack, usePathname } from 'expo-router';
import { usePortalStore } from '@/lib/store/portalStore';
import { PORTAL_ROUTES } from '@/lib/constants/portals';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

/**
 * Portals are plain stacked routes — every secondary link lives in the
 * "المزيد" bottom sheet on each portal's tab bar, so there is no side drawer.
 */
export default function PortalLayout() {
  usePushNotifications();
  const authUser = usePortalStore((s) => s.authUser);
  const isHydrating = usePortalStore((s) => s.isHydrating);
  const pathname = usePathname();

  // A restored deep route (or a session dropped mid-session by a 401) must not
  // mount portal screens with no token — every query would 401 and the screen
  // would render as empty data instead of sending the user back to login.
  if (!isHydrating && !authUser) {
    return <Redirect href="/" />;
  }

  // Resuming a stored session never navigates anywhere — hydrate() only fills the
  // store — so the router falls back to this group's FIRST screen for everyone.
  // A teacher then landed on the student portal, whose screens fetch
  // /students/<their teacher profileId> and 404. Send every role to its own portal
  // (this also blocks a deep link into someone else's portal).
  const role = authUser?.role;
  if (role && !pathname.startsWith(`/${role}`)) {
    return <Redirect href={PORTAL_ROUTES[role] as never} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="student" />
      <Stack.Screen name="teacher" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="parent" />
    </Stack>
  );
}
