import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { IconLogout } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { theme } from '@/lib/theme';
import { PORTALS } from '@/lib/constants/portals';
import NavItemRow from './NavItem';

export default function DrawerContent() {
  const { portal, user, navGroups, logout } = usePortalStore();
  const router = useRouter();

  if (!portal) return null;

  const badge = PORTALS[portal]?.badge ?? '';

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Brand header */}
      <View style={styles.brand}>
        <Image
          source={require('@/assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>جمعية تحفيظ القرآن الكريم بالعماير</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      </View>

      {/* Nav groups */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {navGroups.map((group) => (
          <View key={group.group}>
            <Text style={styles.groupLabel}>{group.group}</Text>
            {group.items.map((item) => (
              <NavItemRow key={item.id} item={item} portal={portal} />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* User footer */}
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.userRole} numberOfLines={1}>{user?.role}</Text>
        </View>
        <Pressable onPress={handleLogout} hitSlop={8} style={styles.logoutBtn}>
          <IconLogout size={18} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.green,
  },
  brand: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.dividerOnGreen,
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 11,
    color: theme.textLight,
    fontFamily: theme.fontCairoBold,
    textAlign: 'center',
    lineHeight: 17,
  },
  badge: {
    marginTop: 6,
    backgroundColor: theme.gold,
    borderRadius: theme.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: theme.brown,
    fontFamily: theme.fontCairoBold,
  },
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  groupLabel: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: theme.fontCairo,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.dividerOnGreen,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    color: theme.white,
    fontFamily: theme.fontCairoBold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 12,
    color: theme.white,
    fontFamily: theme.fontCairoBold,
  },
  userRole: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: theme.fontCairo,
    marginTop: 1,
  },
  logoutBtn: {
    padding: 4,
  },
});
