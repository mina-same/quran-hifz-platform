import { useEffect, useState } from 'react';
import type { TextInputProps } from 'react-native';
import FormInput from '@/components/forms/FormInput';
import { parseDecimalText } from '@/lib/decimal';

interface Props extends Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChange: (n: number) => void;
  error?: boolean;
}

/** A number field that takes decimals (2.5) — the typed text is kept locally
 * so a half-typed "2." isn't snapped back to "2" by the parent's number. */
export default function DecimalInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  // Follow outside changes (reset, "full marks"), but not our own echo.
  useEffect(() => {
    if (parseDecimalText(text).value !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <FormInput
      {...rest}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(raw) => {
        const parsed = parseDecimalText(raw);
        setText(parsed.text);
        onChange(parsed.value);
      }}
    />
  );
}
