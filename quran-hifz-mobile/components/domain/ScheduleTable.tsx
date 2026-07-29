import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { orientSlice, surahName, type ScheduleEntry } from '@/lib/quranRange';

interface Props {
  entries: ScheduleEntry[];
  /** Whether the plan/schedule this belongs to runs in reverse mushaf order —
   * from/to columns are displayed in the plan's own direction (see quranRange.ts
   * orientSlice); storage stays low→high regardless. */
  reversed: boolean;
  emptyMessage?: string;
}

/** Shared "day-by-day breakdown" table — used by the plan-builder's live preview
 * and the plan-detail/track-detail persisted schedule views (same columns: #,
 * التاريخ, الجزء, من, إلى, الصفحات). */
export default function ScheduleTable({ entries, reversed, emptyMessage }: Props) {
  const rows = entries.map((e) => {
    const o = orientSlice(e, reversed);
    return {
      idx: e.occurrenceIndex,
      date: new Date(e.date).toLocaleDateString('ar-SA'),
      juz: <Badge label={String(e.juz)} variant="green" />,
      from: `${surahName(o.surahStart)}:${o.ayahStart}`,
      to: `${surahName(o.surahEnd)}:${o.ayahEnd}`,
      pages: o.pageStart === o.pageEnd ? String(o.pageStart) : `${o.pageStart}-${o.pageEnd}`,
    };
  });

  return (
    <DataTable
      columns={[
        { key: 'idx', label: '#', flex: 0.5 },
        { key: 'date', label: 'التاريخ', flex: 1.3 },
        { key: 'juz', label: 'الجزء', flex: 0.8 },
        { key: 'from', label: 'من', flex: 1.3 },
        { key: 'to', label: 'إلى', flex: 1.3 },
        { key: 'pages', label: 'الصفحات', flex: 1 },
      ]}
      rows={rows}
      emptyMessage={emptyMessage ?? 'لا يوجد جدول بعد'}
    />
  );
}
