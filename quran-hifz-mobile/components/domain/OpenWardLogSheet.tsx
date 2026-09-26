import { useMemo, useState } from 'react';
import { IconNotebook } from '@tabler/icons-react-native';
import SheetTriggerRow from '@/components/ui/SheetTriggerRow';
import ScheduleSheet, { fmtShortDate, fmtPages, type ScheduleItem } from '@/components/domain/ScheduleSheet';
import { useOpenWardEntries, type OpenWardEntry } from '@/lib/queries/quranPlan';
import { surahName } from '@/lib/quranRange';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

/** Maps open-ward entries (newest first) onto the schedule sheet's compact
 * cards. The leading number counts days oldest→newest. */
export function openWardItems(entries: OpenWardEntry[], showStudent: boolean): ScheduleItem[] {
  return entries.map((e, i) => {
    const who = showStudent && typeof e.student === 'object' ? `${e.student.name} · ` : '';
    const recorded = e.status === 'recorded' && e.from && e.to;
    return {
      key: e._id,
      index: entries.length - i,
      type: e.type,
      // `date` is a bare calendar day — parse it at local midnight.
      date: fmtShortDate(`${e.date}T00:00:00`),
      range: recorded
        ? `${who}${surahName(e.from!.surahNumber)}:${e.from!.ayah} — ${surahName(e.to!.surahNumber)}:${e.to!.ayah}`
        : `${who}لم يُسمِّع`,
      pages: recorded && e.pageStart != null && e.pageEnd != null ? fmtPages(e.pageStart, e.pageEnd) : '',
      badge: recorded ? undefined : { label: 'لم يُسمِّع', variant: 'gray' },
    };
  });
}

/** «سجل الورد» for an open-ward plan: a trigger row that opens a bottom sheet
 * of compact cards (mobile never gets the web's wide log table). Pass
 * `studentId` to narrow to one student and drop the name prefix. */
export default function OpenWardLogSheet({ planId, studentId, label = 'سجل الورد' }: {
  planId: string;
  studentId?: string;
  label?: string;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useOpenWardEntries(planId, studentId ? { student: studentId } : undefined);
  const items = useMemo(() => openWardItems(data, !studentId), [data, studentId]);

  return (
    <>
      <SheetTriggerRow
        label={label}
        value={isLoading ? '…' : `${data.length} تسجيل`}
        icon={<IconNotebook size={17} color={theme.green} />}
        onPress={() => setOpen(true)}
      />
      <ScheduleSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        items={items}
        emptyMessage="لم يُسجَّل أي ورد بعد — يُسجَّل من شاشة الحضور والتقييم."
      />
    </>
  );
}
