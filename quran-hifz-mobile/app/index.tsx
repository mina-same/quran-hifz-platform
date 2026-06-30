import { useEffect, useState } from 'react';
import {
  View, Text, Image, Pressable, StyleSheet, ScrollView, SafeAreaView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IconBook2, IconChalkboard, IconLayoutDashboard, IconUsers,
} from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { PORTAL_ROUTES, PORTALS } from '@/lib/constants/portals';
import type { PortalType } from '@/lib/types/portal';
import { theme } from '@/lib/theme';

const PORTAL_CARDS: {
  type: PortalType;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  { type: 'student', title: 'بوابة الطالب',    desc: 'متابعة الحفظ والواجبات والمواعيد',     Icon: IconBook2 },
  { type: 'teacher', title: 'بوابة المعلم',    desc: 'إدارة الحلقات والطلاب والتقييم',       Icon: IconChalkboard },
  { type: 'admin',   title: 'بوابة الإدارة',   desc: 'الإشراف الكامل والتقارير والإعدادات', Icon: IconLayoutDashboard },
  { type: 'parent',  title: 'بوابة ولي الأمر', desc: 'متابعة أداء الطالب وتسجيلاته',        Icon: IconUsers },
];

const CHILDREN = [
  { name: 'عبدالله الحميداني',   level: 'الحلقة المتميزة', juz: 20, attend: '٩٥٪', initials: 'عح', halqa: 'حلقة عمر بن الخطاب',  teacher: 'أ. ناصر الحميداني' },
  { name: 'عبدالرحمن الحميداني', level: 'الحفظ العام',     juz: 7,  attend: '٨٨٪', initials: 'عر', halqa: 'حلقة عثمان بن عفان', teacher: 'أ. خالد المحمدي' },
  { name: 'محمد الحميداني',       level: 'التلقين',          juz: 2,  attend: '١٠٠٪', initials: 'مح', halqa: 'حلقة عمر بن الخطاب', teacher: 'أ. ناصر الحميداني' },
];

export default function PortalSelectScreen() {
  const router = useRouter();
  const { portal, enter } = usePortalStore();
  const [showChildSelector, setShowChildSelector] = useState(false);

  useEffect(() => {
    if (portal) {
      const route = PORTAL_ROUTES[portal] as any;
      router.replace(route);
    }
  }, []);

  const handleEnter = (type: PortalType) => {
    if (type === 'parent') {
      setShowChildSelector(true);
      return;
    }
    enter(type);
    router.push(PORTAL_ROUTES[type] as any);
  };

  const handleSelectChild = (child: typeof CHILDREN[0]) => {
    PORTALS.parent.user.name    = 'والد ' + child.name;
    PORTALS.parent.user.role    = 'متابعة: ' + child.name + ' — ' + child.halqa;
    PORTALS.parent.user.initials = child.initials;
    setShowChildSelector(false);
    enter('parent');
    router.push(PORTAL_ROUTES.parent as any);
  };

  return (
    <>
      <LinearGradient colors={[theme.green, theme.greenDark]} style={styles.bg}>
        <View style={styles.overlay} pointerEvents="none" />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>الجمعية الخيرية لتحفيظ القرآن الكريم بالعماير</Text>
              <Text style={styles.sub}>اختر البوابة المناسبة للدخول</Text>
            </View>
            <View style={styles.cards}>
              {PORTAL_CARDS.map(({ type, title, desc, Icon }) => (
                <Pressable
                  key={type}
                  onPress={() => handleEnter(type)}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <Icon size={40} color={theme.gold} />
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardDesc}>{desc}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.footer}>منصة تحفيظ القرآن • مصممة بواسطة The Bright Station</Text>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Child selector modal */}
      <Modal visible={showChildSelector} animationType="slide" statusBarTranslucent>
        <LinearGradient colors={[theme.green, theme.greenDark]} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, gap: 16 }}>
              <Text style={[styles.title, { marginTop: 24, marginBottom: 4 }]}>اختر ابنك لمتابعة أدائه</Text>
              {CHILDREN.map((ch) => (
                <Pressable
                  key={ch.name}
                  onPress={() => handleSelectChild(ch)}
                  style={({ pressed }) => [styles.card, { width: '100%' }, pressed && styles.cardPressed]}
                >
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, fontFamily: theme.fontCairoBold, color: theme.white }}>{ch.initials}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{ch.name}</Text>
                  <Text style={styles.cardDesc}>{ch.level}</Text>
                  <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]}>{ch.juz} جزء • {ch.attend} حضور</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowChildSelector(false)} style={{ marginTop: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: theme.fontCairo, fontSize: 14 }}>← العودة للبوابات</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(201,149,42,0.05)' },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 0 },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 90, height: 90, marginBottom: 16 },
  title: { fontSize: 18, fontFamily: theme.fontAmiriBold, color: theme.white, textAlign: 'center', lineHeight: 28, marginBottom: 6 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontCairo },
  cards: { width: '100%', gap: 14 },
  card: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  cardPressed: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: theme.gold },
  cardTitle: { fontSize: 17, fontFamily: theme.fontCairoBold, color: theme.white, marginTop: 6 },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: theme.fontCairo, textAlign: 'center' },
  footer: { marginTop: 36, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: theme.fontCairo, textAlign: 'center' },
});
