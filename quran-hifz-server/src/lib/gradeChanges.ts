/**
 * What a teacher changed when re-saving a day's evaluation that already
 * existed: the attendance status and/or any criterion's grade. Pure — the
 * evaluation controller logs the result and notifies the admin/supervisor.
 */

type Snapshot = { attendanceStatus: string; criteria: { key: string; label: string; value: number }[] };
export type GradeChange = { label: string; from: string; to: string };

export function gradeChanges(before: Snapshot | null, after: Snapshot): GradeChange[] {
  if (!before) return []; // first save of the day — nothing was changed
  const out: GradeChange[] = [];
  if (before.attendanceStatus !== after.attendanceStatus) {
    out.push({ label: 'الحضور', from: before.attendanceStatus, to: after.attendanceStatus });
  }
  const old = new Map(before.criteria.map((c) => [c.key, c.value]));
  for (const c of after.criteria) {
    const prev = old.get(c.key) ?? 0;
    if (prev !== c.value) out.push({ label: c.label, from: String(prev), to: String(c.value) });
  }
  return out;
}
