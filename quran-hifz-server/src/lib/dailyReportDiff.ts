/**
 * The daily report's lines as they follow from the recorded attendance and
 * evaluations, and how a SENT report differs from them once the teacher has
 * edited those records after sending — so the admin/supervisor see the edit.
 */

/** `student` is a string in drafts and an ObjectId in saved reports — compare via String(). */
export type ReportLine = { student: string | { toString(): string }; name: string; area?: string; note?: string };
export type ReportLists = {
  struggling: ReportLine[];
  absent: ReportLine[];
  excused: ReportLine[];
  presentCount: number;
};

type Criterion = { key: string; label: string; max: number; value: number };
type EvalLike = { student: unknown; attendanceStatus: string; criteria?: Criterion[]; note?: string };
type AttLike = { student: unknown; status: string };

/** «الحفظ» / «المراجعة» for a criterion that counts as a struggle area. */
export function struggleArea(c: { key: string; label: string }): 'الحفظ' | 'المراجعة' | null {
  const label = c.label.replace(/[ً-ْٰـ]/g, ''); // tashkeel / tatweel
  if (c.key === 'hifz' || label.includes('حفظ')) return 'الحفظ';
  if (label.includes('مراجع')) return 'المراجعة';
  return null;
}

/** absent/excused from attendance (reason = the evaluation note) and «متعثر»
 *  for any present student who scored zero in حفظ or مراجعة. Students no
 *  longer in the track (`nameOf` lacks them) are skipped. */
export function draftLines(nameOf: Map<string, string>, attendance: AttLike[], evaluations: EvalLike[]): ReportLists {
  const statusOf = new Map<string, string>();
  for (const a of attendance) statusOf.set(String(a.student), a.status);
  const evalOf = new Map(evaluations.map((e) => [String(e.student), e]));
  for (const e of evaluations) if (!statusOf.has(String(e.student))) statusOf.set(String(e.student), e.attendanceStatus);

  const line = (id: string, extra: { area?: string; note?: string } = {}) => ({
    student: id, name: nameOf.get(id) ?? 'طالب', ...extra,
  });
  const absent: ReportLine[] = [];
  const excused: ReportLine[] = [];
  const struggling: ReportLine[] = [];
  for (const [id, status] of statusOf) {
    if (!nameOf.has(id)) continue; // moved out of the track since
    const note = evalOf.get(id)?.note || undefined;
    if (status === 'غائب') absent.push(line(id, { note }));
    else if (status === 'مستأذن') excused.push(line(id, { note }));
    else {
      const weak = [...new Set((evalOf.get(id)?.criteria ?? [])
        .filter((c) => c.max > 0 && c.value === 0)
        .map(struggleArea)
        .filter((a) => a !== null))];
      if (weak.length) struggling.push(line(id, { area: weak.join('، '), note }));
    }
  }
  const presentCount = [...statusOf.values()].filter((s) => s === 'حاضر' || s === 'متأخر').length;
  return { struggling, absent, excused, presentCount };
}

export type SectionChange = {
  key: 'struggling' | 'absent' | 'excused';
  added: string[];
  removed: string[];
  changed: { name: string; from: string; to: string }[];
};
export type ReportChanges = { sections: SectionChange[]; present?: { from: number; to: number } };

/**
 * What changed between the sent report and the records, limited to students
 * whose attendance/evaluation was edited after sending (`editedIds`) — the
 * teacher's own manual edits to the report are not "changes". Null if none.
 */
export function reportChanges(saved: ReportLists, current: ReportLists, editedIds: Set<string>): ReportChanges | null {
  if (editedIds.size === 0) return null;
  const sections: SectionChange[] = [];
  for (const key of ['struggling', 'absent', 'excused'] as const) {
    const before = new Map(saved[key].map((l) => [String(l.student), l]));
    const after = new Map(current[key].map((l) => [String(l.student), l]));
    const added: string[] = [];
    const removed: string[] = [];
    const changed: SectionChange['changed'] = [];
    for (const id of editedIds) {
      const b = before.get(id);
      const a = after.get(id);
      if (a && !b) added.push(a.name);
      else if (b && !a) removed.push(b.name);
      else if (a && b && key === 'struggling' && (a.area ?? '') !== (b.area ?? '')) {
        changed.push({ name: a.name, from: b.area ?? '', to: a.area ?? '' });
      }
    }
    if (added.length || removed.length || changed.length) sections.push({ key, added, removed, changed });
  }
  const present = saved.presentCount !== current.presentCount
    ? { from: saved.presentCount, to: current.presentCount }
    : undefined;
  if (!sections.length && !present) return null;
  return present ? { sections, present } : { sections };
}
