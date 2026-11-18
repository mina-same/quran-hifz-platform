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
  /** Linked parent's name; when set, offers web's "keep parent" / "delete both" choice. */
  linkedParent?: string | null;
  pending?: boolean;
  onConfirm: (withParent: boolean) => void;
  onCancel: () => void;
}

/** Mirrors AdminStudents.tsx's delete dialog (ConfirmDialog only has one action). */
export default function AdminDeleteStudentDialog({ visible, linkedParent, pending, onConfirm, onCancel }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable haptic="none" style={s.overlay} onPress={onCancel}>
        <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
          <View style={s.icon}>
            <IconAlertTriangle size={26} color={theme.red} />
          </View>
          <Text style={s.title}>حذف الطالب</Text>
          <Text style={s.body}>سيتم حذف الطالب نهائياً. هذا الإجراء لا يمكن التراجع عنه.</Text>
          {!!linkedParent && (
            <Text style={s.warn}>
              لهذا الطالب ولي أمر مرتبط ({linkedParent}). اختر هل تريد حذف حساب ولي الأمر معه أم الإبقاء عليه.
            </Text>
          )}
          <View style={s.actions}>
            <Button
              label={pending ? 'جارٍ الحذف...' : linkedParent ? 'حذف الطالب فقط (الإبقاء على ولي الأمر)' : 'حذف نهائياً'}
              variant="danger"
              fullWidth
              disabled={pending}
              onPress={() => onConfirm(false)}
            />
            {!!linkedParent && (
              <Button label="حذف الطالب وولي أمره معاً" variant="danger" fullWidth disabled={pending} onPress={() => onConfirm(true)} />
            )}
            <Button label="إلغاء" variant="ghost" fullWidth onPress={onCancel} />
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
    warn: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.tone.gold.text, backgroundColor: theme.tone.gold.bg, borderRadius: 8, padding: 10, marginTop: 10, textAlign: 'center' },
    actions: { gap: 8, marginTop: 20, alignSelf: 'stretch' },
  });
}
