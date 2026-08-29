import { useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  IconHome, IconBook, IconMicrophone, IconMessage, IconCalendarCheck, IconDots,
} from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;
import { tap } from '@/lib/haptics';
import MoreSheet from '@/components/layout/MoreSheet';
import { createMoreTabButton } from '@/components/layout/MoreTabButton';

// Nav items with no tab of their own — the "المزيد" sheet lists exactly these.
const MORE_IDS = ['schedule', 'special_tracks', 'points', 'store', 'settings'];

export default function StudentTabLayout() {
  const theme = useAppTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  // Memoised so the tab button keeps its identity across renders — an inline
  // component would be a new type every render and remount the tab.
  const MoreTabButton = useMemo(() => createMoreTabButton(() => setMoreOpen(true)), []);

  return (
    <>
    <Tabs
      // Every tab press ticks. The "المزيد" tab never reaches this listener —
      // its custom tabBarButton short-circuits navigation and fires its own.
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.greenAccent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: theme.fontCairo, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="dashboard"  options={{ title: 'لوحتي',   tabBarIcon: ({ color, size }) => <IconHome          size={size} color={color} /> }} />
      <Tabs.Screen name="myhifz"     options={{ title: 'حفظي',    tabBarIcon: ({ color, size }) => <IconBook          size={size} color={color} /> }} />
      <Tabs.Screen name="homework"   options={{ title: 'الواجب',  tabBarIcon: ({ color, size }) => <IconMicrophone    size={size} color={color} />, tabBarBadge: '!' }} />
      <Tabs.Screen name="attendance" options={{ title: 'الحضور',  tabBarIcon: ({ color, size }) => <IconCalendarCheck size={size} color={color} /> }} />
      <Tabs.Screen name="messages"   options={{ title: 'الرسائل', tabBarIcon: ({ color, size }) => <IconMessage       size={size} color={color} /> }} />
      {/* Opens the sheet instead of navigating to the (empty) more route. */}
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color, size }) => <IconDots size={size} color={color} />, tabBarButton: MoreTabButton }}
      />
      {/* Reachable from the "المزيد" sheet only. */}
      <Tabs.Screen name="schedule" options={{ href: null, title: 'المواعيد' }} />
      <Tabs.Screen name="points"   options={{ href: null, title: 'نقاطي' }} />
      <Tabs.Screen name="store"    options={{ href: null, title: 'المكافآت' }} />
      <Tabs.Screen name="special_tracks" options={{ href: null, title: 'المسارات الاستثنائية' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'الملف الشخصي' }} />
    </Tabs>

    <MoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      portal="student"
      hiddenIds={MORE_IDS}
    />
    </>
  );
}
