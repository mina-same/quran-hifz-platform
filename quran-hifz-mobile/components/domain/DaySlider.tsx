import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { buildDayChips, todayIso, toDateOnly, type DayChip } from '@/lib/date';
import type { PlanType, ScheduleEntry } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

/** A schedule day, carrying the segment it belongs to when the plan has more
 * than one type. Optional so a legacy single-type plan still fits. */
export type DayEntry = ScheduleEntry & { type?: PlanType };

const CHIP_W = 56;
const CHIP_GAP = 8;

export interface DaySchedule {
  /** Every day the plan(s) actually cover, as bare YYYY-MM-DD. */
  scheduledSet: Set<string>;
  /** The same days, ascending — the order the arrows step through. */
  scheduledSorted: string[];
  /** First schedule entry per covered day. */
  assignmentByDate: Map<string, DayEntry>;
  /** Every calendar day in range, covered or not. */
  dayChips: DayChip[];
  /** The day actually being shown: the selection when it is covered, else the
   * latest covered day ≤ today, else the first upcoming one. */
  effectiveDate: string;
  today: string;
  /** True when the shown day is still in the future — callers disable
   * attendance/evaluation controls on it. */
  isFutureDay: boolean;
}

/** Derives everything the slider and the roster below it need from a plan's
 * schedule. `selectedDate` is the raw user selection; it is ignored when it
 * does not name a covered day, so a stale selection can never blank the page. */
export function useDaySchedule(entries: DayEntry[], selectedDate: string): DaySchedule {
  const today = todayIso();
  return useMemo(() => {
    const set = new Set<string>();
    const byDate = new Map<string, DayEntry>();
    for (const e of entries) {
      if (!e.date) continue;
      const d = toDateOnly(e.date);
      set.add(d);
      if (!byDate.has(d)) byDate.set(d, e);
    }
    const sorted = Array.from(set).sort();
    const chips = sorted.length ? buildDayChips(sorted[0], sorted[sorted.length - 1], today) : [];
    // Default to the latest scheduled day ≤ today, else the first upcoming one,
    // so the roster always opens on a day that has a real assignment.
    let dflt = sorted.length ? sorted[0] : today;
    if (sorted.length) {
      const pastOrToday = sorted.filter((d) => d <= today);
      dflt = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : sorted[0];
    }
    const effective = selectedDate && set.has(selectedDate) ? selectedDate : dflt;
    return {
      scheduledSet: set,
      scheduledSorted: sorted,
      assignmentByDate: byDate,
      dayChips: chips,
      effectiveDate: effective,
      today,
      isFutureDay: effective > today,
    };
  }, [entries, selectedDate, today]);
}

interface Props {
  schedule: DaySchedule;
  onSelect: (iso: string) => void;
  /** Called with a ready-made notice when a day outside the plan is tapped. */
  onBlocked?: (iso: string) => void;
}

/** Horizontal calendar strip for picking which scheduled day to work on.
 * Renders nothing when no day is covered — the caller shows the "add a plan
 * first" alert in that case. */
export default function DaySlider({ schedule, onSelect, onBlocked }: Props) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const { dayChips, scheduledSet, scheduledSorted, effectiveDate } = schedule;

  const activeIdx = scheduledSorted.indexOf(effectiveDate);

  // Keep the active day chip in view — the slider can span months.
  const sliderRef = useRef<ScrollView>(null);
  useEffect(() => {
    const i = dayChips.findIndex((d) => d.iso === effectiveDate);
    if (i < 0) return;
    sliderRef.current?.scrollTo({ x: Math.max(0, i * (CHIP_W + CHIP_GAP) - CHIP_W * 2), animated: true });
  }, [effectiveDate, dayChips]);

  if (scheduledSorted.length === 0) return null;

  return (
    <View style={s.slider}>
      <Pressable
        haptic="select"
        onPress={() => { if (activeIdx > 0) onSelect(scheduledSorted[activeIdx - 1]); }}
        style={[s.sliderArrow, activeIdx <= 0 && s.sliderArrowOff]}
        disabled={activeIdx <= 0}
      >
        <IconChevronRight size={18} color={theme.text} />
      </Pressable>
      <ScrollView
        ref={sliderRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        style={{ flex: 1 }}
      >
        {dayChips.map((d) => {
          const enabled = scheduledSet.has(d.iso);
          const isSel = d.iso === effectiveDate;
          return (
            <Pressable
              haptic="select"
              key={d.iso}
              onPress={() => {
                if (!enabled) { onBlocked?.(d.iso); return; }
                onSelect(d.iso);
              }}
              style={[s.dayChip, d.isToday && s.dayChipToday, !enabled && s.dayChipOff, isSel && s.dayChipActive]}
            >
              <Text style={[s.dayChipWd, isSel && s.dayChipTextActive]}>{d.weekday}</Text>
              <Text style={[s.dayChipNum, isSel && s.dayChipTextActive]}>{d.dayNum}</Text>
              {d.isToday && <View style={s.todayDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        haptic="select"
        onPress={() => { if (activeIdx >= 0 && activeIdx < scheduledSorted.length - 1) onSelect(scheduledSorted[activeIdx + 1]); }}
        style={[s.sliderArrow, activeIdx >= scheduledSorted.length - 1 && s.sliderArrowOff]}
        disabled={activeIdx >= scheduledSorted.length - 1}
      >
        <IconChevronLeft size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    slider: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sliderArrow: {
      width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    sliderArrowOff: { opacity: 0.35 },
    chipRow: { flexDirection: 'row', gap: CHIP_GAP, paddingHorizontal: 2 },
    dayChip: {
      width: CHIP_W, paddingVertical: 7, borderRadius: theme.radiusSm,
      alignItems: 'center', gap: 1,
      backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    },
    dayChipActive: { backgroundColor: theme.greenAccent, borderColor: theme.green },
    dayChipToday: { borderColor: theme.gold },
    dayChipOff: { opacity: 0.4, borderStyle: 'dashed' },
    dayChipWd: { fontSize: 9, fontFamily: theme.fontCairo, color: theme.textMuted },
    dayChipNum: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    dayChipTextActive: { color: theme.white },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.gold },
  });
}
