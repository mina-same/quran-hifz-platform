import { useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard, IconUsers, IconCalendarEvent, IconTarget, IconChartBar, IconDots,
} from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { usePortalStore } from '@/lib/store/portalStore';

type AppTheme = ReturnType<typeof useAppTheme>;
import { tap } from '@/lib/haptics';
import MoreSheet from '@/components/layout/MoreSheet';
import { createMoreTabButton } from '@/components/layout/MoreTabButton';

// Nav items with no tab of their own — the "المزيد" sheet lists exactly these.
// A supervisor (who reuses this same tab layout) never sees "register" (a
// pure-create page, gated by readOnly anyway) or "supervisors" (admin-only).
const ADMIN_MORE_IDS = ['register', 'teachers', 'parents', 'masajid', 'supervisors'];
const SUPERVISOR_MORE_IDS = ['teachers', 'parents', 'masajid'];

export default function AdminTabLayout() {
  const theme = useAppTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const isSupervisor = usePortalStore((s) => s.authUser?.role === 'supervisor');
  const moreIds = isSupervisor ? SUPERVISOR_MORE_IDS : ADMIN_MORE_IDS;
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
      <Tabs.Screen name="tracks"    options={{ title: 'المسارات',      tabBarIcon: ({ color, size }) => <IconCalendarEvent   size={size} color={color} /> }} />
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
      <Tabs.Screen name="track-detail" options={{ href: null, title: 'تفاصيل المسار' }} />
      <Tabs.Screen name="parents" options={{ href: null, title: 'أولياء الأمور' }} />
      <Tabs.Screen name="supervisors" options={{ href: null, title: 'المشرفون' }} />
      {/* Add/edit forms are full pages, not modals: their <FormSelect> pickers are
          bottom sheets from the app-root host, which an RN Modal would cover. */}
      <Tabs.Screen name="masjid-form"  options={{ href: null, title: 'بيانات المسجد' }} />
      <Tabs.Screen name="teacher-form" options={{ href: null, title: 'بيانات المعلم' }} />
      <Tabs.Screen name="student-form" options={{ href: null, title: 'بيانات الطالب' }} />
      {/* Pushed from the track drill-down's plan tab (تعديل الخطة / إنشاء خطة جديدة).
          Must live in this navigator — see the note in admin/plan-form.tsx. */}
      <Tabs.Screen name="plan-form"    options={{ href: null, title: 'خطة الحفظ' }} />
    </Tabs>

    <MoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      portal="admin"
      hiddenIds={moreIds}
    />
    </>
  );
}
