import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { IconChevronDown, IconCheck } from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';
import BottomSheet from '@/components/ui/BottomSheet';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export default function FormSelect({ value, onChange, options, placeholder = 'اختر...', error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.trigger, error && styles.triggerError, disabled && styles.triggerDisabled]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <IconChevronDown size={16} color={theme.textMuted} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} snapPoints={['50%', '80%']}>
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.option, item.value === value && styles.optionActive]}
              onPress={() => { onChange(item.value); setOpen(false); }}
            >
              <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                {item.label}
              </Text>
              {item.value === value && <IconCheck size={16} color={theme.green} />}
            </Pressable>
          )}
        />
      </BottomSheet>
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
  triggerDisabled: { backgroundColor: theme.border, opacity: 0.7 },
  triggerText: {
    fontSize: 14,
    fontFamily: theme.fontCairo,
    color: theme.text,
  },
  placeholder: { color: theme.textMuted },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  optionActive: { backgroundColor: '#F0FDF4' },
  optionText: {
    fontSize: 14,
    fontFamily: theme.fontCairo,
    color: theme.text,
  },
  optionTextActive: {
    fontFamily: theme.fontCairoBold,
    color: theme.green,
  },
});
