import { Tabs } from 'expo-router';
import {
  IconLayoutDashboard, IconSchool, IconUsers, IconCalendarCheck, IconMicrophone,
} from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';

export default function TeacherTabLayout() {
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
      <Tabs.Screen name="dashboard"  options={{ title: 'لوحة التحكم', tabBarIcon: ({ color, size }) => <IconLayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="myhalqa"    options={{ title: 'حلقاتي',       tabBarIcon: ({ color, size }) => <IconSchool           size={size} color={color} /> }} />
      <Tabs.Screen name="students"   options={{ title: 'طلابي',         tabBarIcon: ({ color, size }) => <IconUsers            size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'الحضور',        tabBarIcon: ({ color, size }) => <IconCalendarCheck    size={size} color={color} />, tabBarBadge: '!' }} />
      <Tabs.Screen name="homework"   options={{ title: 'الواجبات',      tabBarIcon: ({ color, size }) => <IconMicrophone       size={size} color={color} />, tabBarBadge: '3' }} />
      {/* Accessible via drawer only */}
      <Tabs.Screen name="plans"         options={{ href: null, title: 'الخطط' }} />
      <Tabs.Screen name="reports"       options={{ href: null, title: 'التقارير' }} />
      <Tabs.Screen name="evaluate"      options={{ href: null, title: 'تقييم الجلسة' }} />
      <Tabs.Screen name="recordlesson"  options={{ href: null, title: 'تسجيل الدرس' }} />
      <Tabs.Screen name="grouphomework" options={{ href: null, title: 'واجب جماعي' }} />
    </Tabs>
  );
}
