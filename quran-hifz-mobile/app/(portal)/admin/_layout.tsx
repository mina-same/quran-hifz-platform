import { useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard, IconUsers, IconSchool, IconTarget, IconChartBar, IconDots,
} from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;
import { tap } from '@/lib/haptics';
import MoreSheet from '@/components/layout/MoreSheet';
import { createMoreTabButton } from '@/components/layout/MoreTabButton';

// Nav items with no tab of their own — the "المزيد" sheet lists exactly these.
const MORE_IDS = ['register', 'teachers', 'parents', 'masajid', 'special_tracks'];

export default function AdminTabLayout() {
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
      <Tabs.Screen name="dashboard" options={{ title: 'لوحة التحكم', tabBarIcon: ({ color, size }) => <IconLayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="students"  options={{ title: 'الطلاب',       tabBarIcon: ({ color, size }) => <IconUsers           size={size} color={color} /> }} />
      <Tabs.Screen name="halqat"    options={{ title: 'الحلقات',       tabBarIcon: ({ color, size }) => <IconSchool          size={size} color={color} /> }} />
      <Tabs.Screen name="kpis"      options={{ title: 'المؤشرات',      tabBarIcon: ({ color, size }) => <IconTarget          size={size} color={color} /> }} />
      <Tabs.Screen name="reports"   options={{ title: 'التقارير',      tabBarIcon: ({ color, size }) => <IconChartBar        size={size} color={color} /> }} />
      {/* Opens the sheet instead of navigating to the (empty) more route. */}
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color, size }) => <IconDots size={size} color={color} />, tabBarButton: MoreTabButton }}
      />
      {/* Reachable from the "المزيد" sheet only. */}
      <Tabs.Screen name="register"       options={{ href: null, title: 'تسجيل طالب' }} />
      <Tabs.Screen name="teachers"       options={{ href: null, title: 'المعلمون' }} />
      <Tabs.Screen name="masajid"        options={{ href: null, title: 'المساجد' }} />
      <Tabs.Screen name="special_tracks" options={{ href: null, title: 'المسارات' }} />
      <Tabs.Screen name="track-detail" options={{ href: null, title: 'تفاصيل المسار' }} />
      <Tabs.Screen name="parents" options={{ href: null, title: 'أولياء الأمور' }} />
      {/* Add/edit forms are full pages, not modals: their <FormSelect> pickers are
          bottom sheets from the app-root host, which an RN Modal would cover. */}
      <Tabs.Screen name="masjid-form"  options={{ href: null, title: 'بيانات المسجد' }} />
      <Tabs.Screen name="halqa-form"   options={{ href: null, title: 'بيانات الحلقة' }} />
      <Tabs.Screen name="teacher-form" options={{ href: null, title: 'بيانات المعلم' }} />
      <Tabs.Screen name="student-form" options={{ href: null, title: 'بيانات الطالب' }} />
    </Tabs>

    <MoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      portal="admin"
      hiddenIds={MORE_IDS}
    />
    </>
  );
}
