import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowRight } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Button from '@/components/ui/Button';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

interface Props {
  title: string;
  subtitle?: string;
  error?: string;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen add/edit form — the container for every admin CRUD form.
 *
 * Deliberately a PAGE, not a modal: these forms carry <FormSelect>, whose picker
 * is a @gorhom bottom sheet rendered into the single BottomSheetModalProvider at
 * the app root. An RN <Modal> is a separate native window stacked ABOVE that
 * host, so a picker opened from inside one is drawn behind it and is unreachable.
 * A route has no such host of its own, so the picker lands on top as intended —
 * and a 10-field form gets the whole screen plus normal keyboard avoidance.
 */
export default function FormPage({
  title, subtitle, error, submitLabel = 'حفظ', pending, onSubmit, children,
}: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Same bare header as track-detail: sits on the page surface, no white bar. */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconArrowRight size={22} color={theme.text} />
        </Pressable>
        <View style={s.headerTitles}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={s.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex1}>
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!error && <Text style={s.error}>{error}</Text>}
          {children}
        </ScrollView>

        <View style={s.footer}>
          <View style={s.flex1}>
            <Button
              label={pending ? 'جارٍ الحفظ...' : submitLabel}
              fullWidth
              disabled={pending}
              onPress={onSubmit}
            />
          </View>
          <View style={s.flex1}>
            <Button label="إلغاء" variant="ghost" fullWidth onPress={() => router.back()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex1: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    },
    headerTitles: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    headerSubtitle: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 1 },
    page: { padding: theme.pagePadding, paddingBottom: 24 },
    error: {
      color: theme.tone.red.text, backgroundColor: theme.tone.red.bg,
      fontFamily: theme.fontCairo, fontSize: 12, padding: 10, borderRadius: 8, marginBottom: 12,
    },
    footer: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
      borderTopWidth: 1, borderTopColor: theme.border,
      backgroundColor: theme.bg,
    },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  });
}

/** Shared field label styling so every form page spaces its fields identically. */
export function useFormPageStyles() {
  const theme = useAppTheme();
  return useMemo(
    () => StyleSheet.create({
      label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 14 },
      ltr: { textAlign: 'right', writingDirection: 'ltr' },
      divider: { height: 1, backgroundColor: theme.border, marginTop: 20 },
      sectionNote: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted, marginTop: 16 },
      muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 4 },
    }),
    [theme],
  );
}
