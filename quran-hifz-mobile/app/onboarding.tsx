import { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
      image: require('@/assets/onboarding/1.png'),
      title: 'حفظ القرآن الكريم\nنور لحياتك',
      desc: 'نساعدك على حفظ كتاب الله وتدبره خطوة بخطوة بإذن الله.',
    },
    {
      image: require('@/assets/onboarding/2.png'),
      title: 'متابعة يومية\nوتشجيع مستمر',
      desc: 'خطط يومية مرنة، وإحصائيات تساعدك على الاستمرار وتحقيق أهدافك.',
    },
    {
      image: require('@/assets/onboarding/3.png'),
      title: 'اجعل القرآن\nجزءاً من يومك',
      desc: 'منصة تجمع لك الأدوات والمجتمع لتعيش رحلة حفظ مميزة.',
    },
  ];

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  // Swipe left for the next slide, right for the previous one. runOnJS keeps the
  // callback off the UI thread so it can call setIndex directly.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -40) setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      else if (e.translationX > 40) setIndex((i) => Math.max(i - 1, 0));
    });

  async function finish() {
    await completeOnboarding();
    router.replace('/');
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 24 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    illustration: { width: 240, height: 240, marginBottom: 22 },
    title: {
      fontSize: 24, fontFamily: theme.fontCairoBold, color: theme.green,
      textAlign: 'center', lineHeight: 38,
    },
    desc: {
      fontSize: 14, fontFamily: theme.fontCairo, color: theme.textMuted,
      textAlign: 'center', lineHeight: 26, paddingHorizontal: 8, marginTop: 6,
    },
    bottom: { paddingBottom: 28, gap: 26, alignItems: 'center', width: '100%' },
    dots: { flexDirection: 'row-reverse', gap: 9 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.border },
    dotActive: { backgroundColor: theme.green },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <GestureDetector gesture={swipe}>
        <View style={styles.content}>
          <Image source={slide.image} style={styles.illustration} resizeMode="contain" />
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.desc}>{slide.desc}</Text>
        </View>
      </GestureDetector>

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
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
