import { useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { IconCalendarEvent } from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';

interface Props {
  /** ISO date string, e.g. "2026-07-29". Empty string means unset. */
  value?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromIso(iso?: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Native date picker — Android opens the system dialog directly, iOS shows an inline picker in a bottom sheet. */
export default function FormDatePicker({ value, onChange, placeholder = 'اختر تاريخاً', error, minimumDate, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => fromIso(value));

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromIso(value),
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toIso(date));
        },
      });
    } else {
      setDraft(fromIso(value));
      setOpen(true);
    }
  }

  return (
    <>
      <Pressable style={[styles.trigger, error && styles.triggerError]} onPress={openPicker}>
        <Text style={[styles.text, !value && styles.placeholder]}>
          {value ? new Date(fromIso(value)).toLocaleDateString('ar-SA') : placeholder}
        </Text>
        <IconCalendarEvent size={16} color={theme.textMuted} />
      </Pressable>

      {Platform.OS === 'ios' && (
        <BottomSheet visible={open} onClose={() => setOpen(false)} snapPoints={['45%']}>
          <View style={styles.sheetBody}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, date) => date && setDraft(date)}
            />
            <Button label="تم" onPress={() => { onChange(toIso(draft)); setOpen(false); }} fullWidth />
          </View>
        </BottomSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: theme.white,
  },
  triggerError: { borderColor: theme.red },
  text: { fontSize: 14, fontFamily: theme.fontCairo, color: theme.text },
  placeholder: { color: theme.textMuted },
  sheetBody: { paddingHorizontal: 16, gap: 14, alignItems: 'center' },
});
