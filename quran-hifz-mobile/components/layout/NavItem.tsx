import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  IconHome, IconBook, IconMicrophone, IconCalendarCheck,
  IconClock, IconMessage, IconLayoutDashboard, IconSchool,
  IconUsers, IconChalkboard, IconTarget, IconChartBar,
  IconUserPlus, IconBuildingArch,
} from '@tabler/icons-react-native';
import type { NavItem as NavItemType } from '@/lib/types/portal';
import type { PortalType } from '@/lib/types/portal';
import { theme } from '@/lib/theme';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  home:               IconHome,
  book:               IconBook,
  microphone:         IconMicrophone,
  'calendar-check':   IconCalendarCheck,
  clock:              IconClock,
  message:            IconMessage,
  'layout-dashboard': IconLayoutDashboard,
  school:             IconSchool,
  users:              IconUsers,
  chalkboard:         IconChalkboard,
  target:             IconTarget,
  'chart-bar':        IconChartBar,
  'user-plus':        IconUserPlus,
  'building-arch':    IconBuildingArch,
};

interface Props {
  item: NavItemType;
  portal: PortalType;
}

export default function NavItem({ item, portal }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const href = `/(portal)/${portal}/${item.id}`;
  const isActive = pathname.includes(`/${item.id}`);
  const Icon = ICON_MAP[item.icon] ?? IconHome;

  return (
    <Pressable
      onPress={() => router.push(href as any)}
      style={({ pressed }) => [
        styles.item,
        isActive && styles.itemActive,
        pressed && styles.itemPressed,
      ]}
    >
      <Icon size={18} color={isActive ? theme.gold : 'rgba(255,255,255,0.65)'} />
      <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
      {item.dot && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: theme.radiusSm,
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  itemPressed: {
    opacity: 0.7,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: theme.fontCairo,
  },
  labelActive: {
    color: theme.white,
    fontFamily: theme.fontCairoBold,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.gold,
  },
});
