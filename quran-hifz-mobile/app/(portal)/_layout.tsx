import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { usePortalStore } from '@/lib/store/portalStore';
import DrawerContent from '@/components/layout/DrawerContent';
import { theme } from '@/lib/theme';

export default function PortalLayout() {
  const { portal } = usePortalStore();
  const router = useRouter();

  useEffect(() => {
    if (!portal) {
      router.replace('/');
    }
  }, [portal]);

  if (!portal) return null;

  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        drawerPosition: 'right',
        drawerStyle: {
          width: theme.sidebarW,
          backgroundColor: theme.green,
        },
        headerStyle: { backgroundColor: theme.green },
        headerTintColor: theme.white,
        headerTitleStyle: {
          fontFamily: theme.fontCairoBold,
          fontSize: 16,
        },
        headerTitleAlign: 'center',
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="student" options={{ title: 'بوابة الطالب' }} />
      <Drawer.Screen name="teacher" options={{ title: 'بوابة المعلم' }} />
      <Drawer.Screen name="admin" options={{ title: 'بوابة الإدارة' }} />
    </Drawer>
  );
}
