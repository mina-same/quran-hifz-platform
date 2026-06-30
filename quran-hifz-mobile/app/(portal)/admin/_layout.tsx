import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard, IconUsers, IconSchool, IconTarget, IconChartBar,
} from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.green,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.white, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: theme.fontCairo, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'لوحة التحكم', tabBarIcon: ({ color, size }) => <IconLayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="students"  options={{ title: 'الطلاب',       tabBarIcon: ({ color, size }) => <IconUsers           size={size} color={color} /> }} />
      <Tabs.Screen name="halqat"    options={{ title: 'الحلقات',       tabBarIcon: ({ color, size }) => <IconSchool          size={size} color={color} /> }} />
      <Tabs.Screen name="kpis"      options={{ title: 'المؤشرات',      tabBarIcon: ({ color, size }) => <IconTarget          size={size} color={color} /> }} />
      <Tabs.Screen name="reports"   options={{ title: 'التقارير',      tabBarIcon: ({ color, size }) => <IconChartBar        size={size} color={color} /> }} />
      {/* Accessible via drawer only */}
      <Tabs.Screen name="register"       options={{ href: null, title: 'تسجيل طالب' }} />
      <Tabs.Screen name="teachers"       options={{ href: null, title: 'المعلمون' }} />
      <Tabs.Screen name="masajid"        options={{ href: null, title: 'المساجد' }} />
      <Tabs.Screen name="special_tracks" options={{ href: null, title: 'المسارات الاستثنائية' }} />
    </Tabs>
  );
}
