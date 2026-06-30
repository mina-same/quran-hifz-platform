import { Tabs } from 'expo-router';
import {
  IconHome, IconBook, IconMicrophone, IconMessage, IconCalendarCheck,
} from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';

export default function StudentTabLayout() {
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
      <Tabs.Screen name="dashboard"  options={{ title: 'لوحتي',   tabBarIcon: ({ color, size }) => <IconHome          size={size} color={color} /> }} />
      <Tabs.Screen name="myhifz"     options={{ title: 'حفظي',    tabBarIcon: ({ color, size }) => <IconBook          size={size} color={color} /> }} />
      <Tabs.Screen name="homework"   options={{ title: 'الواجب',  tabBarIcon: ({ color, size }) => <IconMicrophone    size={size} color={color} />, tabBarBadge: '!' }} />
      <Tabs.Screen name="attendance" options={{ title: 'الحضور',  tabBarIcon: ({ color, size }) => <IconCalendarCheck size={size} color={color} /> }} />
      <Tabs.Screen name="messages"   options={{ title: 'الرسائل', tabBarIcon: ({ color, size }) => <IconMessage       size={size} color={color} /> }} />
      {/* Accessible via drawer only */}
      <Tabs.Screen name="schedule" options={{ href: null, title: 'المواعيد' }} />
      <Tabs.Screen name="points"   options={{ href: null, title: 'نقاطي' }} />
      <Tabs.Screen name="store"    options={{ href: null, title: 'المكافآت' }} />
    </Tabs>
  );
}
