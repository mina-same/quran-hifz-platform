import { useMemo } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconX, IconLogout, IconSun, IconMoon } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { PORTALS } from '@/lib/constants/portals';
import type { PortalType, NavGroup } from '@/lib/types/portal';
import { ICON_MAP } from './iconMap';

interface Props {
  visible: boolean;
  onClose: () => void;
  portal: PortalType;
  hiddenIds: string[];
}

export default function MoreSheet({ visible, onClose, portal, hiddenIds }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const theme = useAppTheme();
  const { user, logout, themeMode, toggleTheme } = usePortalStore();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Cycled per tile so consecutive tiles never repeat the same accent color.
  const ACCENT_COLORS = [theme.green, theme.gold, theme.blue, theme.red, theme.brown];

  // Bounded by the top safe-area inset (notch/status bar/Dynamic Island),
  // not a flat percentage, so a tall sheet can never render under it.
  const maxSheetHeight = Math.min(screenHeight * 0.75, screenHeight - insets.top - 24);

  const groups: NavGroup[] = PORTALS[portal].nav
    .map((g) => ({ ...g, items: g.items.filter((i) => hiddenIds.includes(i.id)) }))
    .filter((g) => g.items.length > 0);

  let tileIndex = -1;

  const handleNavigate = (id: string) => {
    onClose();
    router.push(`/(portal)/${portal}/${id}` as any);
  };

  const handleLogout = () => {
    onClose();
    logout();
    router.replace('/');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: maxSheetHeight, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>المزيد</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <IconX size={20} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {groups.map((g) => (
            <View key={g.group} style={styles.group}>
              <Text style={styles.groupLabel}>{g.group}</Text>
              <View style={styles.tileGrid}>
                {g.items.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? IconX;
                  tileIndex += 1;
                  const color = ACCENT_COLORS[tileIndex % ACCENT_COLORS.length];
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.tile, { borderTopColor: color }, pressed && styles.tilePressed]}
                      onPress={() => handleNavigate(item.id)}
                    >
                      <View style={styles.tileContent}>
                        <Icon size={22} color={color} />
                        <Text style={styles.tileLabel} numberOfLines={2}>{item.label}</Text>
                      </View>
                      {item.dot && <View style={styles.tileDot} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{user?.role}</Text>
          </View>
          <Pressable onPress={toggleTheme} hitSlop={8} style={styles.logoutBtn}>
            {themeMode === 'dark' ? (
              <IconSun size={18} color={theme.textMuted} />
            ) : (
              <IconMoon size={18} color={theme.textMuted} />
            )}
          </Pressable>
          <Pressable onPress={handleLogout} hitSlop={8} style={styles.logoutBtn}>
            <IconLogout size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.card,
      borderTopLeftRadius: theme.radius,
      borderTopRightRadius: theme.radius,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 15,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    list: {
      paddingTop: 4,
    },
    group: {
      marginTop: 8,
    },
    groupLabel: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 4,
      fontSize: 10,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    tileGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 4,
    },
    tile: {
      width: '31%',
      aspectRatio: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderTopWidth: 3,
      borderRadius: theme.radius,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tilePressed: {
      backgroundColor: theme.bg,
    },
    tileContent: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 6,
    },
    tileLabel: {
      fontSize: 11,
      color: theme.text,
      fontFamily: theme.fontCairo,
      textAlign: 'center',
    },
    tileDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.gold,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 14,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 13,
      color: theme.green,
      fontFamily: theme.fontCairoBold,
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: 13,
      color: theme.text,
      fontFamily: theme.fontCairoBold,
    },
    userRole: {
      fontSize: 11,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginTop: 1,
    },
    logoutBtn: { padding: 6 },
  });
}
