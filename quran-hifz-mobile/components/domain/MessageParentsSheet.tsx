import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Text from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import BottomSheet from '@/components/ui/BottomSheet';
import ScopeTabs from '@/components/ui/ScopeTabs';
import FormSelect from '@/components/forms/FormSelect';
import { useSendToParents } from '@/lib/queries/messages';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const MAX = 1000;

/** «مراسلة أولياء الأمور» — a teacher writes once to the parents of the whole
 *  halqa or of one student (web MessageParentsModal) — same toasts, and the
 *  sheet closes once at least one parent was notified. */
export default function MessageParentsSheet({ visible, onClose, trackId, students }: {
  visible: boolean;
  onClose: () => void;
  trackId: string;
  students: { _id: string; name: string }[];
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const [target, setTarget] = useState<'all' | 'one'>('all');
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const send = useSendToParents();

  const canSend = body.trim().length > 0 && (target === 'all' || !!studentId) && !send.isPending;

  function close() {
    setTarget('all');
    setStudentId('');
    setBody('');
    onClose();
  }

  async function submit() {
    try {
      const { notified, unnotified } = await send.mutateAsync({
        track: trackId,
        ...(target === 'one' ? { students: [studentId] } : {}),
        body: body.trim(),
      });
      if (notified > 0) toast.success(`تم إرسال الرسالة إلى ${notified} من أولياء الأمور`);
      if (unnotified.length) {
        toast.warning(`لا يوجد ولي أمر مرتبط بـ: ${unnotified.map((u) => u.name).join('، ')}`);
      }
      if (notified > 0) close();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text style={s.title}>مراسلة أولياء الأمور</Text>
      <View style={s.body}>
        <ScopeTabs
          options={[
            { value: 'all', label: `كل أولياء أمور الحلقة (${students.length})` },
            { value: 'one', label: 'ولي أمر طالب محدد' },
          ]}
          value={target}
          onChange={(v) => setTarget(v as 'all' | 'one')}
        />
        {target === 'one' && (
          <FormSelect
            value={studentId}
            onChange={setStudentId}
            title="الطالب"
            placeholder="— اختر الطالب —"
            options={students.map((st) => ({ value: st._id, label: st.name }))}
          />
        )}
        {/* BottomSheetTextInput (not FormTextarea's plain TextInput) so the
            sheet lifts above the keyboard while typing. */}
        <BottomSheetTextInput
          multiline
          textAlignVertical="top"
          textAlign="right"
          maxLength={MAX}
          placeholder="اكتب رسالتك لأولياء الأمور…"
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.greenLight}
          keyboardAppearance={theme.mode === 'dark' ? 'dark' : 'light'}
          value={body}
          onChangeText={setBody}
          accessibilityLabel="نص الرسالة"
          style={s.textarea}
        />
        <Text style={s.counter}>{body.length}/{MAX}</Text>
        <Button label="إرسال" onPress={submit} loading={send.isPending} disabled={!canSend} fullWidth />
      </View>
    </BottomSheet>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, paddingHorizontal: 18, marginBottom: 4 },
    body: { paddingHorizontal: 18, paddingTop: 8, gap: 12 },
    textarea: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusSm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: theme.fontCairo,
      color: theme.text,
      backgroundColor: theme.inputBg,
      textAlign: 'right',
    },
    counter: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: -6 },
  });
}
