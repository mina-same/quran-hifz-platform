import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import FormTextarea from '@/components/forms/FormTextarea';
import MessagesScreen from '@/components/domain/MessagesScreen';
import { useSendNoteToSupervisors } from '@/lib/queries/messages';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

export default function StudentMessages() {
  return <MessagesScreen compose={<NoteToSupervisors />} />;
}

const NOTE_MAX = 1000;

function NoteToSupervisors() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const send = useSendNoteToSupervisors();
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || send.isPending) return;
    setStatus(null);
    try {
      await send.mutateAsync(trimmed);
      setBody('');
      setStatus({ variant: 'success', text: 'تم إرسال ملاحظتك للمشرف' });
    } catch (e) {
      setStatus({ variant: 'error', text: (e as Error).message || 'تعذر إرسال الملاحظة' });
    }
  };

  return (
    <Card>
      <CardHeader title="إرسال ملاحظة للمشرف" />
      <View style={styles.compose}>
        <FormTextarea
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="اكتب ملاحظتك هنا..."
          placeholderTextColor={theme.textMuted}
          value={body}
          onChangeText={(v) => { setBody(v); if (status) setStatus(null); }}
        />
        <View style={styles.composeFooter}>
          <Text style={styles.counter}>{body.length}/{NOTE_MAX}</Text>
          <Button label="إرسال" onPress={submit} loading={send.isPending} disabled={!trimmed} />
        </View>
        {status && <Alert variant={status.variant}>{status.text}</Alert>}
      </View>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    compose: { gap: 10 },
    composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    counter: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
  });
}
