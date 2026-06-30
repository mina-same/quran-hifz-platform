import { useState } from 'react';
import {
  View, Text, Pressable, Modal, FlatList, StyleSheet, TouchableWithoutFeedback,
} from 'react-native';
import { IconChevronDown, IconCheck } from '@tabler/icons-react-native';
import { theme } from '@/lib/theme';

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
}

export default function FormSelect({ value, onChange, options, placeholder = 'اختر...', error }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, error && styles.triggerError]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <IconChevronDown size={16} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <FlatList
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
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingVertical: 10,
    backgroundColor: theme.white,
  },
  triggerError: { borderColor: theme.red },
  triggerText: {
    fontSize: 14,
    fontFamily: theme.fontCairo,
    color: theme.text,
  },
  placeholder: { color: theme.textMuted },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
