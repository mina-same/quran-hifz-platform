import { Tabs } from 'expo-router';
import {
  IconHome, IconTimeline, IconMicrophone, IconListCheck, IconCalendarCheck, IconMessage,
} from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';

export default function ParentTabLayout() {
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
      <Tabs.Screen name="dashboard"    options={{ title: 'لوحتي',       tabBarIcon: ({ color, size }) => <IconHome          size={size} color={color} /> }} />
      <Tabs.Screen name="timeline"     options={{ title: 'مسيرة الحفظ', tabBarIcon: ({ color, size }) => <IconTimeline      size={size} color={color} /> }} />
      <Tabs.Screen name="recordings"   options={{ title: 'الدروس',      tabBarIcon: ({ color, size }) => <IconMicrophone    size={size} color={color} />, tabBarBadge: '!' }} />
      <Tabs.Screen name="attendance"   options={{ title: 'الحضور',      tabBarIcon: ({ color, size }) => <IconCalendarCheck size={size} color={color} /> }} />
      <Tabs.Screen name="messages"     options={{ title: 'الرسائل',     tabBarIcon: ({ color, size }) => <IconMessage       size={size} color={color} /> }} />
      {/* Accessible via drawer only */}
      <Tabs.Screen name="homework_view" options={{ href: null, title: 'واجبات ابني' }} />
    </Tabs>
  );
}
