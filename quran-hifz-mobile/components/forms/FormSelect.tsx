import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ui/Text';
import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { IconChevronDown, IconCheck, IconSearch, IconX } from '@tabler/icons-react-native';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { select } from '@/lib/haptics';
import BottomSheet from '@/components/ui/BottomSheet';
import Pressable from '@/components/ui/Pressable';

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
  /** Sheet heading. Falls back to the trigger placeholder. */
  title?: string;
  /** Force the search field on/off. Defaults to on once the list is long enough to scroll. */
  searchable?: boolean;
}

/** Every option row is exactly this tall, so the list can use getItemLayout —
 * which is what makes `initialScrollIndex` (jump to the current value) and the
 * per-row scroll tick reliable on a 114-item surah list. */
const ROW_H = 52;
const SEARCH_THRESHOLD = 12;
/** Minimum gap between two scroll ticks. A fast fling crosses rows faster than
 * the taptic engine can resolve them, and un-throttled it feels like a buzz
 * rather than a wheel. */
const TICK_MIN_MS = 45;

/** Arabic search is only useful if hamza/ya/ta-marbuta variants match each other —
 * nobody types "الأنعام" with the hamza when hunting for a surah. */
function normalize(s: string) {
  return s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .toLowerCase()
    .trim();
}

export default function FormSelect({
  value, onChange, options, placeholder = 'اختر...', error, disabled, title, searchable,
}: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // rawContent means the sheet no longer pays the home-indicator inset for us.
  const listContent = useMemo(() => ({ paddingBottom: 16 + insets.bottom }), [insets.bottom]);

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length >= SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query]);

  // Only meaningful on the unfiltered first render, which is the only render
  // FlatList reads it on — the sheet remounts its content on every open.
  const initialIndex = useMemo(() => {
    const i = options.findIndex((o) => o.value === value);
    return i > 0 ? i : undefined;
  }, [options, value]);

  // A tick per row that scrolls past, so the list feels like a physical wheel
  // rather than a flat page. FlatList refuses an onViewableItemsChanged identity
  // that changes between renders, hence the refs.
  const tick = useRef({ index: -1, at: 0 });
  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (first == null || first === tick.current.index) return;
    tick.current.index = first;
    const now = Date.now();
    if (now - tick.current.at < TICK_MIN_MS) return;
    tick.current.at = now;
    select();
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  function openSheet() {
    setQuery('');
    tick.current.index = -1;
    setOpen(true);
  }

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={openSheet}
        style={[styles.trigger, error && styles.triggerError, disabled && styles.triggerDisabled]}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <IconChevronDown size={16} color={theme.textMuted} />
      </Pressable>

      {/*
        A SINGLE snap point on purpose. With two (['50%','80%']) the sheet opens
        below its highest snap point, which leaves @gorhom's scrollable LOCKED:
        its scroll handler force-scrolls the list back to the drag's starting
        offset on every scroll and end-drag, so the list appeared to fling back
        to the top whenever the user paused mid-scroll and carried on.
      */}
      <BottomSheet visible={open} onClose={() => setOpen(false)} snapPoints={['85%']} rawContent>
        <View style={styles.sheet}>
          <View style={styles.header}>
            {/* Mirrors the close button's footprint so the centred title lands on
                the sheet's centre line rather than the centre of what's left. */}
            <View style={styles.headerSpacer} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{title ?? placeholder}</Text>
              <Text style={styles.subtitle}>{filtered.length} خيار</Text>
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} style={styles.closeBtn}>
              <IconX size={19} color={theme.text} />
            </Pressable>
          </View>

          {showSearch && (
            <View style={styles.searchWrap}>
              <IconSearch size={16} color={theme.textMuted} />
              <BottomSheetTextInput
                value={query}
                onChangeText={setQuery}
                placeholder="بحث..."
                placeholderTextColor={theme.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          )}

          <View style={styles.rule} />

          <BottomSheetFlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            style={styles.list}
            contentContainerStyle={listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
            initialScrollIndex={query ? undefined : initialIndex}
            initialNumToRender={16}
            ListEmptyComponent={<Text style={styles.empty}>لا توجد نتائج</Text>}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  haptic="select"
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  {/* Two equal-width slots flanking the label. The check only ever
                      fills one of them, so the label stays on the row's centre
                      line whether or not the option is the selected one — and no
                      absolute positioning, whose left/right Yoga swaps under
                      forceRTL. */}
                  <View style={styles.optionSlot} />
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <View style={styles.optionSlot}>
                    {active && <IconCheck size={17} color={theme.green} />}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </BottomSheet>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space.sm,
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
    triggerDisabled: { backgroundColor: theme.border, opacity: 0.7 },
    triggerText: {
      flex: 1,
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontCairo,
      color: theme.text,
    },
    placeholder: { color: theme.textMuted },

    sheet: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space.sm,
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
    },
    headerText: { flex: 1 },
    headerSpacer: { width: 38 },
    title: { fontSize: theme.fontSize.lg, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'center' },
    subtitle: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 2,
    },
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
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.sm,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 12,
      height: 42,
      borderRadius: 12,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      height: 42,
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontCairo,
      color: theme.text,
      textAlign: 'right',
    },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
    list: { flex: 1 },
    empty: {
      fontSize: theme.fontSize.base,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: 40,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space.sm,
      paddingHorizontal: 20,
      height: ROW_H,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    optionActive: { backgroundColor: `${theme.green}1F` },
    optionSlot: { width: 22, alignItems: 'center', justifyContent: 'center' },
    optionText: {
      flex: 1,
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontCairo,
      color: theme.text,
      textAlign: 'center',
    },
    optionTextActive: {
      fontSize: theme.fontSize.lg,
      fontFamily: theme.fontCairoBold,
      color: theme.green,
    },
  });
}
