import { useMemo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { IconCircleCheck } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Button from '@/components/ui/Button';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { textEnd } from '@/lib/theme';

type AppTheme = ReturnType<typeof useAppTheme>;

interface Props {
  credentials: { email: string; password: string } | null;
  title: string;
  onClose: () => void;
}

/**
 * Shown once after an account is created — the generated password is never
 * readable again, so the admin has to copy it from here.
 */
export default function CredentialsDialog({ credentials, title, onClose }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  return (
    <Modal visible={!!credentials} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable haptic="none" style={s.overlay} onPress={onClose}>
        <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
          <IconCircleCheck size={44} color={theme.mode === 'dark' ? theme.greenLight : theme.green} />
          <Text style={s.title}>{title}</Text>
          <Text style={s.sub}>احتفظ ببيانات الدخول وأرسلها له</Text>

          <View style={s.box}>
            <Text style={s.fieldLabel}>البريد الإلكتروني</Text>
            {/* Latin credentials read left-to-right even inside the RTL sheet. */}
            <Text style={s.fieldValue} selectable>{credentials?.email}</Text>
            <Text style={[s.fieldLabel, { marginTop: 10 }]}>كلمة المرور</Text>
            <Text style={s.fieldValue} selectable>{credentials?.password}</Text>
          </View>

          <Button label="حسناً" fullWidth onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 400, backgroundColor: theme.card, borderRadius: 16, padding: 24, alignItems: 'center' },
    title: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 12 },
    sub: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 4, textAlign: 'center' },
    box: {
      alignSelf: 'stretch',
      backgroundColor: theme.tone.green.bg,
      borderWidth: 1, borderColor: theme.tone.green.border,
      borderRadius: 10, padding: 16, marginVertical: 20,
    },
    fieldLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted, marginBottom: 4 },
    fieldValue: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, writingDirection: 'ltr', textAlign: textEnd },
  });
}
