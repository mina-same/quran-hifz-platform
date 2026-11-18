import { useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard, IconCalendarEvent, IconUsers, IconCalendarCheck, IconMicrophone, IconDots,
} from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;
import { tap } from '@/lib/haptics';
import MoreSheet from '@/components/layout/MoreSheet';
import { createMoreTabButton } from '@/components/layout/MoreTabButton';

// Nav items that have no tab of their own — the "المزيد" sheet lists exactly these.
const MORE_IDS = [
  'dailyreport', 'recordlesson', 'grouphomework', 'plans', 'reports', 'messages', 'settings',
];

export default function TeacherTabLayout() {
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
      <Tabs.Screen name="dashboard"  options={{ title: 'لوحة التحكم', tabBarIcon: ({ color, size }) => <IconLayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="tracks"     options={{ title: 'مساراتي',      tabBarIcon: ({ color, size }) => <IconCalendarEvent    size={size} color={color} /> }} />
      <Tabs.Screen name="students"   options={{ title: 'طلابي',         tabBarIcon: ({ color, size }) => <IconUsers            size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'الحضور',        tabBarIcon: ({ color, size }) => <IconCalendarCheck    size={size} color={color} />, tabBarBadge: '!' }} />
      <Tabs.Screen name="homework"   options={{ title: 'الواجبات',      tabBarIcon: ({ color, size }) => <IconMicrophone       size={size} color={color} />, tabBarBadge: '3' }} />
      {/* Opens the sheet instead of navigating to the (empty) more route. */}
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color, size }) => <IconDots size={size} color={color} />, tabBarButton: MoreTabButton }}
      />
      {/* Reachable from the "المزيد" sheet only. */}
      <Tabs.Screen name="plans"         options={{ href: null, title: 'الخطط القرآنية' }} />
      <Tabs.Screen name="plan-form"     options={{ href: null, title: 'خطة حفظ' }} />
      <Tabs.Screen name="plan-detail"   options={{ href: null, title: 'تفاصيل الخطة' }} />
      <Tabs.Screen name="reports"       options={{ href: null, title: 'التقارير' }} />
      <Tabs.Screen name="recordlesson"  options={{ href: null, title: 'سجّل درس المسار' }} />
      <Tabs.Screen name="grouphomework" options={{ href: null, title: 'واجبات المسار' }} />
      <Tabs.Screen name="track-detail"  options={{ href: null, title: 'تفاصيل المسار' }} />
      <Tabs.Screen name="dailyreport" options={{ href: null, title: 'التقرير اليومي' }} />
      <Tabs.Screen name="messages" options={{ href: null, title: 'الرسائل' }} />
      <Tabs.Screen name="thread"   options={{ href: null, title: 'محادثة' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'الملف الشخصي' }} />
    </Tabs>

    <MoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      portal="teacher"
      hiddenIds={MORE_IDS}
    />
    </>
  );
}
