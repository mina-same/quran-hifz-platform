import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { IconX } from '@tabler/icons-react-native';
import BottomSheet from '@/components/ui/BottomSheet';
import Pressable from '@/components/ui/Pressable';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { orientSlice, surahName, type PlanType } from '@/lib/quranRange';
import type { DayEntry } from '@/components/domain/DaySlider';
import { AR_LOCALE } from '@/lib/date';

/** One day of a plan, flattened into the few strings a phone-width card can show. */
export interface ScheduleItem {
  key: string;
  /** 1-based occurrence number WITHIN its type, shown in the leading circle. */
  index: number;
  /** The segment this day belongs to — shown when a plan carries several. */
  type?: PlanType;
  date: string;
  juz?: number;
  /** "البقرة:١ — البقرة:٢٥", already oriented for the plan's direction. */
  range: string;
  pages: string;
  /** Original range, struck through, when the current one was shrunk/edited. */
  strikeRange?: string;
  badge?: { label: string; variant: BadgeVariant };
  today?: boolean;
}

function isSameLocalDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

/** Compact weekday + day + month — "الأحد ٥ رمضان" — instead of the full numeric
 * date the wide table used, which no longer has a column to itself. */
export function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(AR_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtPages(pageStart: number, pageEnd: number): string {
  return pageStart === pageEnd ? `ص ${pageStart}` : `ص ${pageStart}–${pageEnd}`;
}

/** Maps a plan/track schedule (the common case) onto the card shape.
 *
 * `reversed` may be a per-entry predicate: a multi-type plan mixes segments
 * in one list, and direction is a property of the segment — مراجعة can run
 * forward while حفظ runs backward, so one flag for the whole list would orient
 * half the rows wrongly. */
export function scheduleItems(
  entries: DayEntry[],
  reversed: boolean | ((entry: DayEntry) => boolean),
): ScheduleItem[] {
  const today = new Date();
  const isReversed = typeof reversed === 'function' ? reversed : () => reversed;
  return entries.map((e) => {
    const o = orientSlice(e, isReversed(e));
    return {
      // occurrenceIndex restarts per segment, so the type is part of identity.
      key: `${e.type ?? ''}-${e.occurrenceIndex}-${e.date}`,
      index: e.occurrenceIndex,
      type: e.type,
      date: fmtShortDate(e.date),
      juz: e.juz,
      range: `${surahName(o.surahStart)}:${o.ayahStart} — ${surahName(o.surahEnd)}:${o.ayahEnd}`,
      pages: fmtPages(o.pageStart, o.pageEnd),
      today: isSameLocalDay(e.date, today),
    };
  });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ScheduleItem[];
  emptyMessage?: string;
}

/**
 * Day-by-day plan breakdown as a scrollable sheet of compact cards. Replaces the
 * six-column <ScheduleTable>, which on a phone could only be read by scrolling
 * sideways inside an already-scrolling page.
 */
export default function ScheduleSheet({ visible, onClose, title, items, emptyMessage = 'لا يوجد جدول بعد' }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['85%']}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>{items.length} يوم</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <IconX size={19} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.rule} />

        <BottomSheetFlatList
          data={items}
          keyExtractor={(it) => it.key}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, item.today && styles.cardToday]}>
              <View style={[styles.idx, item.today && styles.idxToday]}>
                <Text style={[styles.idxText, item.today && styles.idxTextToday]}>{item.index}</Text>
              </View>

              <View style={styles.body}>
                <View style={styles.topRow}>
                  <Text style={styles.date} numberOfLines={1}>{item.date}</Text>
                  <View style={styles.tags}>
                    {!!item.type && <Badge label={item.type} variant="gold" />}
                    {item.juz != null && <Badge label={`ج ${item.juz}`} variant="green" />}
                    <Text style={styles.pages}>{item.pages}</Text>
                  </View>
                </View>

                <Text style={styles.range} numberOfLines={2}>{item.range}</Text>

                {!!item.strikeRange && (
                  <Text style={styles.strike} numberOfLines={1}>{item.strikeRange}</Text>
                )}

                {!!item.badge && (
                  <View style={styles.badgeRow}>
                    <Badge label={item.badge.label} variant={item.badge.variant} />
                  </View>
                )}
              </View>
            </View>
          )}
        />
      </View>
    </BottomSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    sheet: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 14,
    },
    headerText: { flex: 1 },
    title: {
      fontSize: theme.fontSize.lg,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radiusFull,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginHorizontal: 20,
    },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: theme.space.md, paddingBottom: theme.space.lg },
    empty: {
      fontSize: theme.fontSize.base,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: 40,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.space.md,
      padding: theme.space.md,
      marginBottom: 10,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
    },
    cardToday: {
      borderColor: theme.greenAccent,
      backgroundColor: `${theme.greenAccent}1F`,
    },
    idx: {
      width: 30,
      height: 30,
      borderRadius: theme.radiusFull,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    idxToday: { backgroundColor: theme.greenAccent, borderColor: theme.greenAccent },
    idxText: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontCairoBold,
      color: theme.textMuted,
    },
    idxTextToday: { color: theme.white },
    body: { flex: 1, gap: 4 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space.sm,
    },
    date: {
      flex: 1,
      fontSize: theme.fontSize.base,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    tags: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pages: {
      fontSize: theme.fontSize.xs,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    range: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontCairo,
      color: theme.text,
      lineHeight: 20,
    },
    strike: {
      fontSize: theme.fontSize.xs,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      textDecorationLine: 'line-through',
    },
    badgeRow: { flexDirection: 'row', marginTop: 2 },
  });
}
