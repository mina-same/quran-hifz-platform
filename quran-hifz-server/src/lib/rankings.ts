/**
 * Leaderboards for the promotional report and the student «لوحة الشرف».
 * Points = the sum of a student's daily grades in the period (an absent day
 * adds 0, so regular attendance is rewarded). Averages are out of 10 and
 * taken over PRESENT days only; attendance % ignores excused (مستأذن) days.
 * Pure — the controller feeds it one gender section at a time.
 */

export type Period = 'week' | 'month' | 'all';

type EvalIn = { student: string; track: string; total: number; totalMax: number; attendanceStatus: string };
type Agg = { points: number; presentScore: number; presentMax: number; present: number; counted: number };

const blank = (): Agg => ({ points: 0, presentScore: 0, presentMax: 0, present: 0, counted: 0 });
function add(a: Agg, e: EvalIn): void {
  a.points += e.total;
  if (e.attendanceStatus === 'مستأذن') return;
  a.counted += 1;
  if (e.attendanceStatus === 'حاضر') {
    a.present += 1;
    a.presentScore += e.total;
    a.presentMax += e.totalMax;
  }
}
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg10 = (a: Agg) => (a.presentMax > 0 ? round1((a.presentScore / a.presentMax) * 10) : 0);
const attPct = (a: Agg) => (a.counted > 0 ? Math.round((a.present / a.counted) * 100) : 0);

export type StudentRow = { id: string; name: string; trackId: string; trackTitle: string; points: number; avg10: number; attendancePct: number; days: number };
export type TrackRow = { id: string; title: string; students: number; points: number; avg10: number; attendancePct: number; champion: string | null; ranked: boolean };
export type TeacherRow = { id: string; name: string; tracks: string[]; students: number; avg10: number; attendancePct: number; ranked: boolean };
export type Section = {
  students: StudentRow[];
  tracks: TrackRow[];
  teachers: TeacherRow[];
  totals: { students: number; points: number; avg10: number; attendancePct: number; days: number };
};

/** Rank = 1 + how many scored strictly more (ties share a rank). */
export function rankOf(allPoints: number[], points: number): number {
  return 1 + allPoints.filter((p) => p > points).length;
}

/** First day (YYYY-MM-DD) of the period ending `today`; null = since the start. */
export function periodStart(period: Period, today: string): string | null {
  if (period === 'all') return null;
  if (period === 'month') return `${today.slice(0, 7)}-01`;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return d.toISOString().slice(0, 10);
}

/**
 * One section's leaderboards. Tracks/teachers with fewer than `minEvals`
 * present evaluations are listed but `ranked: false` (sorted after ranked
 * ones) so a single perfect day can't crown a halqa or teacher.
 */
export function computeSection(input: {
  tracks: { id: string; title: string; teacherIds: string[] }[];
  teachers: { id: string; name: string }[];
  students: { id: string; name: string; trackId: string }[];
  evals: EvalIn[];
  minEvals: number;
}): Section {
  const { tracks, teachers, students, evals, minEvals } = input;
  const byStudent = new Map<string, Agg>();
  const byTrack = new Map<string, Agg>();
  const all = blank();
  for (const e of evals) {
    if (!byStudent.has(e.student)) byStudent.set(e.student, blank());
    if (!byTrack.has(e.track)) byTrack.set(e.track, blank());
    add(byStudent.get(e.student)!, e);
    add(byTrack.get(e.track)!, e);
    add(all, e);
  }
  const titleOf = new Map(tracks.map((t) => [t.id, t.title]));

  const studentRows: StudentRow[] = students
    .map((s) => {
      const a = byStudent.get(s.id) ?? blank();
      return {
        id: s.id, name: s.name, trackId: s.trackId, trackTitle: titleOf.get(s.trackId) ?? '',
        points: a.points, avg10: avg10(a), attendancePct: attPct(a), days: a.counted,
      };
    })
    .sort((x, y) => y.points - x.points || y.avg10 - x.avg10 || x.name.localeCompare(y.name, 'ar'));

  const byRank = <T extends { ranked: boolean; avg10: number; attendancePct: number }>(x: T, y: T) =>
    Number(y.ranked) - Number(x.ranked) || y.avg10 - x.avg10 || y.attendancePct - x.attendancePct;

  const trackRows: TrackRow[] = tracks.map((t) => {
    const a = byTrack.get(t.id) ?? blank();
    const mine = studentRows.filter((s) => s.trackId === t.id);
    return {
      id: t.id, title: t.title, students: mine.length, points: a.points,
      avg10: avg10(a), attendancePct: attPct(a),
      champion: mine.length && mine[0].points > 0 ? mine[0].name : null,
      ranked: a.present >= minEvals,
    };
  }).sort(byRank);

  const teacherRows: TeacherRow[] = teachers.map((te) => {
    const own = tracks.filter((t) => t.teacherIds.includes(te.id));
    const a = blank();
    for (const t of own) {
      const ta = byTrack.get(t.id);
      if (!ta) continue;
      a.points += ta.points; a.presentScore += ta.presentScore; a.presentMax += ta.presentMax;
      a.present += ta.present; a.counted += ta.counted;
    }
    return {
      id: te.id, name: te.name, tracks: own.map((t) => t.title),
      students: studentRows.filter((s) => own.some((t) => t.id === s.trackId)).length,
      avg10: avg10(a), attendancePct: attPct(a), ranked: a.present >= minEvals,
    };
  }).filter((t) => t.tracks.length > 0).sort(byRank);

  return {
    students: studentRows,
    tracks: trackRows,
    teachers: teacherRows,
    totals: {
      students: students.length, points: all.points, avg10: avg10(all),
      attendancePct: attPct(all), days: all.counted,
    },
  };
}
