import { useCallback, useMemo, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AR_LOCALE } from '@/lib/date';
import { IconCalendarEvent, IconX } from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import Pressable from '@/components/ui/Pressable';

interface Props {
  /** ISO date string, e.g. "2026-07-29". Empty string means unset. */
  value?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Sheet heading on iOS. */
  title?: string;
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromIso(iso?: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function fmtLong(d: Date) {
  return d.toLocaleDateString(AR_LOCALE, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Native date picker — Android opens the system dialog directly, iOS shows an inline picker in a bottom sheet. */
export default function FormDatePicker({
  value, onChange, placeholder = 'اختر تاريخاً', error, minimumDate, maximumDate, title = 'اختر التاريخ',
}: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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

  // Pinned by the library (absolute, zIndex 9999) rather than laid out after the
  // calendar: the inline iOS picker reports a different intrinsic height per
  // month and per calendar system, and any of those that overshot the sheet's
  // measured height used to push "تم" below the visible edge.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View style={styles.footer}>
          <View style={styles.footerBtn}>
            <Button label="إلغاء" variant="ghost" fullWidth onPress={() => setOpen(false)} />
          </View>
          <View style={styles.footerBtn}>
            <Button label="تم" fullWidth onPress={() => { onChange(toIso(draft)); setOpen(false); }} />
          </View>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, styles, draft, onChange],
  );

  return (
    <>
      <Pressable style={[styles.trigger, error && styles.triggerError]} onPress={openPicker}>
        <Text style={[styles.text, !value && styles.placeholder]}>
          {value ? fromIso(value).toLocaleDateString(AR_LOCALE) : placeholder}
        </Text>
        <IconCalendarEvent size={16} color={theme.textMuted} />
      </Pressable>

      {Platform.OS === 'ios' && (
        // No snapPoints: the sheet sizes itself to the calendar. The إلغاء/تم row
        // is a pinned footerComponent rather than content, so it stays on screen
        // whatever height the inline calendar reports — the two earlier attempts
        // (a fixed 45% snap point, then a laid-out footer) both put it below the
        // fold.
        <BottomSheet visible={open} onClose={() => setOpen(false)} footerComponent={renderFooter}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{fmtLong(draft)}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeBtn}>
                <IconX size={19} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.rule} />

            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                locale={AR_LOCALE}
                themeVariant={theme.mode}
                accentColor={theme.green}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, date) => date && setDraft(date)}
                style={styles.picker}
              />
            </View>
          </View>
        </BottomSheet>
      )}
    </>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
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
      // Matches FormInput's fill so a select and a text field read as the
      // same control; `card` would sit a shade lighter than its neighbour in dark mode.
      backgroundColor: theme.inputBg,
    },
    triggerError: { borderColor: theme.red },
    text: { fontSize: theme.fontSize.md, fontFamily: theme.fontCairo, color: theme.text },
    placeholder: { color: theme.textMuted },

    sheet: { paddingHorizontal: 20 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
      paddingBottom: 14,
      gap: theme.space.sm,
    },
    headerText: { flex: 1 },
    title: { fontSize: theme.fontSize.lg, fontFamily: theme.fontCairoBold, color: theme.text },
    subtitle: { fontSize: theme.fontSize.sm, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 2 },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radiusFull,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
    // Fixed height keeps the sheet's self-measurement stable: the inline iOS
    // calendar reports a different intrinsic height for 5- and 6-week months,
    // which otherwise makes the sheet resize as the user pages through months.
    pickerWrap: { height: 340, justifyContent: 'center' },
    picker: { alignSelf: 'stretch' },
    // Overlays the calendar now that it is pinned, so it paints its own surface.
    footer: {
      flexDirection: 'row',
      gap: theme.space.md,
      paddingHorizontal: 20,
      paddingTop: theme.space.sm,
      paddingBottom: theme.space.sm,
      backgroundColor: theme.card,
    },
    footerBtn: { flex: 1 },
  });
}
