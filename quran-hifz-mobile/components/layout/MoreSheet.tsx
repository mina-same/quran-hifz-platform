import { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import {
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconX, IconLogout, IconSun, IconMoon, IconChevronLeft } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { PORTALS } from '@/lib/constants/portals';
import type { PortalType, NavGroup } from '@/lib/types/portal';
import { ICON_MAP } from './iconMap';
import BottomSheet from '@/components/ui/BottomSheet';
import Pressable from '@/components/ui/Pressable';

interface Props {
  visible: boolean;
  onClose: () => void;
  portal: PortalType;
  hiddenIds: string[];
}

/**
 * Accent per icon rather than per position, so an item keeps the same colour no
 * matter which portal or group it lands in — the teacher sheet's target/red,
 * list-check/blue, video/gold, star/green, chart-bar/brown run comes out of this.
 */
const ACCENT_BY_ICON: Record<string, keyof ReturnType<typeof useAppTheme> & string> = {
  target: 'red',
  'list-check': 'blue',
  video: 'gold',
  star: 'green',
  'chart-bar': 'brown',
  'calendar-event': 'green',
  'user-circle': 'amber',
  clock: 'blue',
  gift: 'gold',
  'user-plus': 'blue',
  chalkboard: 'brown',
  'user-heart': 'red',
  'building-arch': 'gold',
  microphone: 'red',
  message: 'blue',
  school: 'green',
  users: 'blue',
  timeline: 'brown',
  'calendar-check': 'green',
  book: 'green',
  home: 'green',
  'layout-dashboard': 'green',
};

export default function MoreSheet({ visible, onClose, portal, hiddenIds }: Props) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { user, logout, themeMode, toggleTheme } = usePortalStore();

  // Icon washes sit on the row surface, so dark mode needs a stronger alpha than
  // light to read as a tint rather than as dirt.
  const tint = theme.mode === 'dark' ? '33' : '1A';

  const groups: NavGroup[] = PORTALS[portal].nav
    .map((g) => ({ ...g, items: g.items.filter((i) => hiddenIds.includes(i.id)) }))
    .filter((g) => g.items.length > 0);

  const handleNavigate = (id: string) => {
    onClose();
    router.push(`/(portal)/${portal}/${id}` as any);
  };

  const handleLogout = () => {
    onClose();
    logout();
    router.replace('/');
  };

  // Pinned by the library on top of the scroll content (absolute + zIndex), so it
  // survives regardless of how the content lays out — the previous version was a
  // flex sibling inside BottomSheetView and got pushed off the bottom edge.
  const renderFooter = useCallback(
    // The safe-area gap is PADDING INSIDE the footer, not `bottomInset`: the
    // library measures only the footer container's own height and feeds that to
    // `enableFooterMarginAdjustment`, so an inset applied as a translate leaves
    // the last rows sitting under the footer card.
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={[styles.footer, { paddingBottom: theme.space.md + insets.bottom }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{user?.role}</Text>
          </View>
          <Pressable haptic="select" onPress={toggleTheme} hitSlop={8} style={styles.footerBtn}>
            {themeMode === 'dark' ? (
              <IconSun size={17} color={theme.textMuted} />
            ) : (
              <IconMoon size={17} color={theme.textMuted} />
            )}
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, styles, user, themeMode, toggleTheme, theme.textMuted, theme.space.md],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%']}
      rawContent
      footerComponent={renderFooter}
    >
      <View style={styles.sheetInner}>
        <View style={styles.header}>
          <Text style={styles.title}>المزيد</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <IconX size={19} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.headerRule} />

        <BottomSheetScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          enableFooterMarginAdjustment
        >
          {groups.map((g) => (
            <View key={g.group} style={styles.group}>
              <Text style={styles.groupLabel}>{g.group}</Text>

              {g.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? IconX;
                const accent = (theme[ACCENT_BY_ICON[item.icon] ?? 'green'] ?? theme.green) as string;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.row}
                    onPress={() => handleNavigate(item.id)}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${accent}${tint}` }]}>
                      <Icon size={20} color={accent} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{item.label}</Text>
                      {!!item.desc && (
                        <Text style={styles.rowDesc} numberOfLines={1}>{item.desc}</Text>
                      )}
                    </View>
                    {item.dot && <View style={styles.rowDot} />}
                    <IconChevronLeft size={18} color={theme.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Logout reads as one of the menu rows, but it is an action rather than
              a destination — hence the red treatment and no chevron. */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>الخروج</Text>
            <Pressable
              haptic="medium"
              style={[styles.row, styles.logoutRow]}
              onPress={handleLogout}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${theme.red}${tint}` }]}>
                <IconLogout size={20} color={theme.red} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.red }]} numberOfLines={1}>تسجيل الخروج</Text>
                <Text style={styles.rowDesc} numberOfLines={1}>الخروج من حسابك في التطبيق</Text>
              </View>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    sheetInner: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingTop: 6,
      paddingBottom: 16,
    },
    title: {
      fontSize: theme.fontSize.xl,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.radiusFull,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.sm,
    },
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginHorizontal: 22,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 22,
      // Breathing room under the last row, on top of the footer height that
      // `enableFooterMarginAdjustment` adds — otherwise the logout card ends
      // flush against the pinned footer at full scroll.
      paddingBottom: theme.space.xl,
    },
    group: {
      marginTop: theme.space.lg,
    },
    groupLabel: {
      // Deliberately left, against the RTL flow of everything else in the sheet:
      // the section labels read as quiet markers down the far edge rather than
      // as headings competing with the row titles they sit above.
      textAlign: 'left',
      fontSize: theme.fontSize.sm,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginBottom: theme.space.sm,
    },
    /**
     * Styled with a plain object, never `style={({ pressed }) => ...}`. The
     * function form is the one thing the header's close button did NOT use, and
     * it is the only difference between that button rendering correctly and
     * these rows losing their background, border, padding and flexDirection
     * entirely — the row collapsed into a bare vertical stack. Press feedback
     * comes from the haptic on press-in instead.
     */
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.md,
      paddingHorizontal: theme.space.md,
      paddingVertical: 11,
      marginBottom: 10,
      minHeight: 64,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
    },
    logoutRow: {
      borderColor: `${theme.red}44`,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: theme.fontSize.lg,
      color: theme.text,
      fontFamily: theme.fontCairoBold,
    },
    rowDesc: {
      fontSize: theme.fontSize.sm,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginTop: 2,
    },
    rowDot: {
      width: 8,
      height: 8,
      borderRadius: theme.radiusFull,
      backgroundColor: theme.gold,
    },
    // Pinned over the scroll content, so it has to paint its own opaque
    // background rather than letting rows slide visibly underneath it.
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.md,
      paddingHorizontal: 22,
      paddingTop: theme.space.md,
      paddingBottom: theme.space.md,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: theme.radiusFull,
      backgroundColor: `${theme.green}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: theme.fontSize.base,
      color: theme.green,
      fontFamily: theme.fontCairoBold,
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: theme.fontSize.base,
      color: theme.text,
      fontFamily: theme.fontCairoBold,
    },
    userRole: {
      fontSize: theme.fontSize.xs,
      color: theme.textMuted,
      fontFamily: theme.fontCairo,
      marginTop: 1,
    },
    footerBtn: {
      width: 34,
      height: 34,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
