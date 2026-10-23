import { useEffect, useState } from 'react';
import type { TextInputProps } from 'react-native';
import FormInput from '@/components/forms/FormInput';
import { parseDecimalText } from '@/lib/decimal';

interface Props extends Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChange: (n: number) => void;
  /** Upper bound: a bigger number stays visible (red border) and only the
   * max itself is passed on — no silent snapping while typing. */
  max?: number;
  error?: boolean;
}

/** A number field that takes decimals (2.5) — the typed text is kept locally
 * so a half-typed "2." isn't snapped back to "2" by the parent's number. */
export default function DecimalInput({ value, onChange, max = Infinity, error, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  const over = parseDecimalText(text).value > max;
  // Follow outside changes (reset, "full marks"), but not our own echo.
  useEffect(() => {
    if (Math.min(parseDecimalText(text).value, max) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <FormInput
      {...rest}
      keyboardType="decimal-pad"
      error={error || over}
      value={text}
      onChangeText={(raw) => {
        const parsed = parseDecimalText(raw);
        setText(parsed.text);
        onChange(Math.min(parsed.value, max));
      }}
    />
  );
}
