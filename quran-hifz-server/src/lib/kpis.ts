/**
 * «مؤشرات الأداء» computed from real records (they used to be hand-typed seed
 * rows nobody updated). Pure — the controller loads one period's records.
 */

export type KpiStatus = 'achieved' | 'near' | 'below' | 'nodata';
export type KpiRow = {
  _id: string;
  key: string;
  indicator: string;
  /** How the value is computed — shown under the indicator. */
  hint: string;
  value: number | null;
  target: string;
  actual: string;
  status: KpiStatus;
  /** 0–100: how far the value is toward its target (inverted when lower is better). */
  progress: number;
  /** Legacy field kept for older screens. */
  rating: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
};

type EvalIn = { student: string; track: string; date: string; total: number; totalMax: number; attendanceStatus: string };

const AR = '٠١٢٣٤٥٦٧٨٩';
const ar = (n: number) => String(n).replace(/\d/g, (d) => AR[Number(d)]).replace('.', '٫');
const round1 = (n: number) => Math.round(n * 10) / 10;

function row(
  key: string, indicator: string, hint: string, value: number | null,
  target: number, unit: '%' | '/10', lowerIsBetter = false,
): KpiRow {
  const fmt = (n: number) => (unit === '%' ? `${ar(n)}٪` : `${ar(n)}/١٠`);
  let status: KpiStatus = 'nodata';
  let progress = 0;
  if (value !== null) {
    if (lowerIsBetter) {
      status = value <= target ? 'achieved' : value <= target * 1.5 ? 'near' : 'below';
      progress = value === 0 ? 100 : Math.min(100, Math.round((target / value) * 100));
    } else {
      status = value >= target ? 'achieved' : value >= target * 0.9 ? 'near' : 'below';
      progress = target === 0 ? 100 : Math.min(100, Math.round((value / target) * 100));
    }
  }
  const rating = status === 'achieved' ? 'ممتاز' : status === 'near' ? 'مقبول' : status === 'below' ? 'ضعيف' : 'جيد';
  return {
    _id: key, key, indicator, hint, value,
    target: `${lowerIsBetter ? '≤ ' : ''}${fmt(target)}`,
    actual: value === null ? '—' : fmt(value),
    status, progress, rating,
  };
}

export function computeKpis(input: {
  evals: EvalIn[];
  attendance: { status: string }[];
  /** "trackId|YYYY-MM-DD" for every daily report sent in the period. */
  reportsSent: Set<string>;
  homework: { status: string }[];
}): KpiRow[] {
  const { evals, attendance, reportsSent, homework } = input;

  // 1. Attendance (excused days count neither way).
  const counted = attendance.filter((a) => a.status !== 'مستأذن');
  const attendancePct = counted.length
    ? Math.round((counted.filter((a) => a.status === 'حاضر').length / counted.length) * 100) : null;

  // 2. Average daily grade over present days.
  const present = evals.filter((e) => e.attendanceStatus === 'حاضر');
  const maxSum = present.reduce((n, e) => n + (e.totalMax || 10), 0);
  const avgEval = maxSum ? round1((present.reduce((n, e) => n + e.total, 0) / maxSum) * 10) : null;

  // 3–4. Per student.
  const per = new Map<string, { days: number; absent: number; score: number; max: number; presentDays: number }>();
  for (const e of evals) {
    if (e.attendanceStatus === 'مستأذن') continue;
    const a = per.get(e.student) ?? { days: 0, absent: 0, score: 0, max: 0, presentDays: 0 };
    a.days += 1;
    if (e.attendanceStatus === 'غائب') a.absent += 1;
    else { a.presentDays += 1; a.score += e.total; a.max += e.totalMax || 10; }
    per.set(e.student, a);
  }
  const rows = [...per.values()];
  const eligibleEx = rows.filter((a) => a.presentDays >= 5);
  const excellentPct = eligibleEx.length
    ? Math.round((eligibleEx.filter((a) => a.score / a.max >= 0.9).length / eligibleEx.length) * 100) : null;
  const eligibleSt = rows.filter((a) => a.days >= 3);
  const strugglingPct = eligibleSt.length
    ? Math.round((eligibleSt.filter((a) => a.absent / a.days > 0.25 || (a.max > 0 && a.score / a.max < 0.5)).length / eligibleSt.length) * 100)
    : null;

  // 5. Daily reports sent for days a halqa recorded evaluations.
  const daysRecorded = new Set(evals.map((e) => `${e.track}|${e.date}`));
  const reportsPct = daysRecorded.size
    ? Math.round(([...daysRecorded].filter((k) => reportsSent.has(k)).length / daysRecorded.size) * 100) : null;

  // 6. Homework reviewed out of homework due.
  const homeworkPct = homework.length
    ? Math.round((homework.filter((h) => h.status === 'مراجع').length / homework.length) * 100) : null;

  return [
    row('attendance', 'نسبة الحضور', 'الحاضرون من كل الحصص المسجّلة (الاستئذان لا يُحتسب)', attendancePct, 90, '%'),
    row('avgEval', 'متوسط التقييم اليومي', 'متوسط درجات الطلاب في أيام حضورهم', avgEval, 8, '/10'),
    row('excellent', 'نسبة الطلاب المتميزين', 'من لهم ٥ أيام حضور فأكثر بمتوسط ٩ من ١٠ فأكثر', excellentPct, 30, '%'),
    row('struggling', 'نسبة الطلاب المتعثرين', 'من لهم ٣ أيام فأكثر وغيابهم فوق ٢٥٪ أو متوسطهم دون ٥ من ١٠', strugglingPct, 10, '%', true),
    row('reports', 'نسبة إرسال التقارير اليومية', 'أيام سجّلت فيها الحلقة تقييماً وأُرسل تقريرها', reportsPct, 95, '%'),
    row('homework', 'نسبة مراجعة الواجبات', 'الواجبات المراجَعة من الواجبات المستحقة', homeworkPct, 85, '%'),
  ];
}
