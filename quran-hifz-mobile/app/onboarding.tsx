import { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { IconBook2, IconChecklist, IconUsersGroup, IconArrowLeft } from '@tabler/icons-react-native';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import Button from '@/components/ui/Button';

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const completeOnboarding = usePortalStore((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);

  const SLIDES = [
    {
      icon: IconBook2,
      tint: theme.green,
      title: 'تابع رحلة حفظك',
      desc: 'اعرف خطة حفظك، تقدّمك اليومي، وما تبقّى لك بضغطة واحدة.',
    },
    {
      icon: IconChecklist,
      tint: theme.blue,
      title: 'حضور وواجبات في مكان واحد',
      desc: 'سجّل حضورك، راجع واجباتك الصوتية، وتابع تقييم معلمك أولاً بأول.',
    },
    {
      icon: IconUsersGroup,
      tint: theme.gold,
      title: 'حلقتك ومعلمك دائماً معك',
      desc: 'تواصل مع حلقتك ومعلمك، وتابع أخبار الجمعية أينما كنت.',
    },
  ];

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  async function finish() {
    await completeOnboarding();
    router.replace('/');
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
    top: { height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    skip: { color: theme.textMuted, fontFamily: theme.fontCairoBold, fontSize: 13 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    logo: { width: 56, height: 56, marginBottom: 4, opacity: 0.9 },
    iconWrap: {
      width: 88, height: 88, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 6,
    },
    title: {
      fontSize: 20, fontFamily: theme.fontAmiriBold, color: theme.text,
      textAlign: 'center', lineHeight: 30,
    },
    desc: {
      fontSize: 14, fontFamily: theme.fontCairo, color: theme.textMuted,
      textAlign: 'center', lineHeight: 22, paddingHorizontal: 12,
    },
    bottom: { paddingBottom: 24, gap: 22, alignItems: 'center', width: '100%' },
    dots: { flexDirection: 'row', gap: 8 },
    dot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: theme.border,
    },
    dotActive: { backgroundColor: theme.green, width: 22 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.skip}>تخطي</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={[styles.iconWrap, { backgroundColor: `${slide.tint}14` }]}>
          <Icon size={38} color={slide.tint} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Button
          label={isLast ? 'ابدأ الآن' : 'التالي'}
          onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
          fullWidth
          icon={<IconArrowLeft size={17} color={theme.white} />}
        />
      </View>
    </SafeAreaView>
  );
}
