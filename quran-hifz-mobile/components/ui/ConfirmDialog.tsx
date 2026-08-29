import { useMemo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { IconAlertTriangle } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Button from '@/components/ui/Button';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /** Defaults to "حذف نهائياً" — the destructive wording the web dialogs use. */
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one destructive-confirm dialog for the whole app. Every delete in the
 * admin screens goes through this: a tap must never mutate on its own.
 */
export default function ConfirmDialog({
  visible, title, message, confirmLabel = 'حذف نهائياً', pendingLabel = 'جارٍ الحذف...', pending, onConfirm, onCancel,
}: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable haptic="none" style={s.overlay} onPress={onCancel}>
        {/* Swallows the backdrop press so a tap inside the card never closes it. */}
        <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
          <View style={s.icon}>
            <IconAlertTriangle size={26} color={theme.red} />
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.body}>{message}</Text>
          <View style={s.actions}>
            <View style={s.flex1}>
              <Button
                label={pending ? pendingLabel : confirmLabel}
                variant="danger"
                fullWidth
                disabled={pending}
                onPress={onConfirm}
              />
            </View>
            <View style={s.flex1}>
              <Button label="إلغاء" variant="ghost" fullWidth onPress={onCancel} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 360, backgroundColor: theme.card, borderRadius: 16, padding: 24, alignItems: 'center' },
    icon: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.tone.red.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    title: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 8 },
    body: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
    flex1: { flex: 1 },
  });
}
