import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Badge from '@/components/ui/Badge';
import SurahAyahPicker from '@/components/domain/SurahAyahPicker';
import { toFlatIndex, type RangePoint } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

/** One type's answer to «ماذا حفظ اليوم؟» on an open-ward plan. */
export type OpenWardValue =
  | { status: 'recorded'; from: RangePoint; to: RangePoint }
  | { status: 'none' };

/** Saving is allowed once the teacher picked a valid range or chose «لم يُسمِّع». */
export function openWardComplete(v?: OpenWardValue): boolean {
  if (!v) return false;
  return v.status === 'none' || toFlatIndex(v.from) <= toFlatIndex(v.to);
}

/**
 * «ماذا حفظ الطالب اليوم؟» for one type on an open-ward plan: an unbounded
 * من/إلى pair plus a «لم يُسمِّع اليوم» toggle chip. Mirrors the web's
 * components/common/OpenWardPicker.tsx.
 */
export default function OpenWardPicker({
  type, showType, value, suggestedFrom, onChange, disabled,
}: {
  type: string;
  showType: boolean;
  value?: OpenWardValue;
  /** Where the student stopped last time + 1 — the default «من». */
  suggestedFrom: RangePoint;
  onChange: (v: OpenWardValue) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const none = value?.status === 'none';
  const from = value?.status === 'recorded' ? value.from : suggestedFrom;
  const to = value?.status === 'recorded' ? value.to : suggestedFrom;
  const invalid = value?.status === 'recorded' && toFlatIndex(value.from) > toFlatIndex(value.to);

  return (
    <View style={s.box}>
      <Text style={s.label}>ماذا حفظ الطالب اليوم؟</Text>
      {showType && (
        <Badge label={type} variant={type === 'حفظ' ? 'green' : 'gold'} style={{ alignSelf: 'flex-start' }} />
      )}

      {none ? (
        <Text style={s.muted}>لم يُسمِّع اليوم</Text>
      ) : (
        <>
          <Text style={s.fieldLabel}>من</Text>
          <SurahAyahPicker value={from} disabled={disabled} onChange={(p) => onChange({ status: 'recorded', from: p, to })} />
          <Text style={s.fieldLabel}>إلى</Text>
          <SurahAyahPicker value={to} disabled={disabled} onChange={(p) => onChange({ status: 'recorded', from, to: p })} />
        </>
      )}

      {!value && !disabled && (
        <Text style={[s.hint, { color: theme.gold }]}>حدّد المقطع أو اختر «لم يُسمِّع اليوم» قبل الحفظ</Text>
      )}
      {invalid && (
        <Text style={[s.hint, { color: theme.red }]}>بداية المقطع بعد نهايته في ترتيب المصحف</Text>
      )}

      {!disabled && (
        <Pressable
          haptic="select"
          onPress={() => onChange(none
            ? { status: 'recorded', from: suggestedFrom, to: suggestedFrom }
            : { status: 'none' })}
          style={[s.chip, none && s.chipOn]}
          accessibilityRole="button"
        >
          <Text style={[s.chipText, none && s.chipTextOn]}>{none ? 'تسجيل مقطع' : 'لم يُسمِّع اليوم'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function createS(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    box: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 12, padding: 12, gap: 8 },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    fieldLabel: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    hint: { fontSize: 11, fontFamily: theme.fontCairo },
    chip: {
      alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.border, borderRadius: 999,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    chipOn: { backgroundColor: theme.greenPale, borderColor: theme.green },
    chipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextOn: { color: theme.green, fontFamily: theme.fontCairoBold },
  });
}
