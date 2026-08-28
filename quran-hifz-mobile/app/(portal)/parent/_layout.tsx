import { useState } from 'react';
import { Tabs } from 'expo-router';
import {
  IconHome, IconTimeline, IconMicrophone, IconListCheck, IconCalendarCheck, IconMessage, IconDots,
} from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';
import MoreSheet from '@/components/layout/MoreSheet';

// Nav items with no tab of their own — the "المزيد" sheet lists exactly these.
const MORE_IDS = ['homework_view'];

export default function ParentTabLayout() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
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
      {/* Opens the sheet instead of navigating to the (empty) more route. */}
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color, size }) => <IconDots size={size} color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            setMoreOpen(true);
          },
        }}
      />
      {/* Reachable from the "المزيد" sheet only. */}
      <Tabs.Screen name="homework_view" options={{ href: null, title: 'واجبات ابني' }} />
    </Tabs>

    <MoreSheet
      visible={moreOpen}
      onClose={() => setMoreOpen(false)}
      portal="parent"
      hiddenIds={MORE_IDS}
    />
    </>
  );
}
