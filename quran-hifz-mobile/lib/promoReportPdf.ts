import { esc } from '@/lib/pdf';
import { REPORT_LOGO_DATA_URI } from '@/lib/reportLogo';
import { ADMIN_PERIOD_LABEL, type AdminRankPeriod, type RankSection, type RankStudent } from '@/lib/queries/rankings';

/**
 * A4 HTML of «تقرير الإنجاز والتميّز» for `sharePdf` — the same three pages,
 * sections, wording and top-15/top-10 cuts as web's `PromoReport` print mode
 * (quran-hifz/src/quran/components/common/PromoReport.tsx).
 */

export type PromoSection = 'male' | 'female' | 'all';

const PLATFORM = 'المنصة التعليمية لجمعية التحفيظ بالعماير';
const SECTION_LABEL = { male: 'قسم البنين', female: 'قسم البنات', all: 'البنين والبنات' } as const;
export const MEDALS = ['🥇', '🥈', '🥉'];

/** Wording per section — the girls' report speaks of «الطالبات». */
export const WORDS = {
  male: { students: 'الطلاب', registered: 'الطلاب المسجّلون', stars: '🏆 فرسان الفترة', student: 'الطالب', excellent: 'طلاب بمتوسط ٩٠٪ فأكثر', days: 'يوم تقييم مسجّل للطلاب', board: '🌟 لوحة شرف الطلاب', teacher: '⭐ المعلم المتميز', teacherAvg: 'متوسط طلابه', teachers: '👨‍🏫 ترتيب المعلمين', count: 'عدد الطلاب' },
  female: { students: 'الطالبات', registered: 'الطالبات المسجّلات', stars: '🏆 نجمات الفترة', student: 'الطالبة', excellent: 'طالبات بمتوسط ٩٠٪ فأكثر', days: 'يوم تقييم مسجّل للطالبات', board: '🌟 لوحة شرف الطالبات', teacher: '⭐ المعلمة المتميزة', teacherAvg: 'متوسط طالباتها', teachers: '👩‍🏫 ترتيب المعلمات', count: 'عدد الطالبات' },
  all: { students: 'الطلاب', registered: 'الطلاب والطالبات المسجّلون', stars: '🏆 أوائل الفترة', student: 'الاسم', excellent: 'طلاب بمتوسط ٩٠٪ فأكثر', days: 'يوم تقييم مسجّل', board: '🌟 لوحة الشرف', teacher: '⭐ المعلم المتميز', teacherAvg: 'متوسط طلابه', teachers: '👨‍🏫 ترتيب المعلمين والمعلمات', count: 'عدد الطلاب' },
} as const;

/** Competition ranking: ties share a place. */
export function ranks(rows: { points: number }[]): number[] {
  return rows.map((r) => 1 + rows.filter((x) => x.points > r.points).length);
}

const toAr = (n: number | string) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
const num = (n: number) => toAr(Number.isInteger(n) ? n : Number(n.toFixed(1))).replace('.', '٫');
const pct10 = (avg10: number) => `${toAr(Math.round(avg10 * 10))}٪`;
function pointsWord(n: number): string {
  if (!Number.isInteger(n)) return 'نقطة';
  if (n === 2) return 'نقطتان';
  return n >= 3 && n <= 10 ? 'نقاط' : 'نقطة';
}
const gregorianAr = (iso: string) =>
  new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

export function promoReportHtml(o: {
  section: PromoSection;
  data: RankSection;
  period: AdminRankPeriod;
  from: string | null;
  to: string;
  scopeName?: string;
}): string {
  const { section, data, period, from, to } = o;
  const w = WORDS[section];
  const scope = esc(o.scopeName ?? SECTION_LABEL[section]);
  const top = data.students.filter((s) => s.points > 0).slice(0, 15);
  const topRanks = ranks(top);
  const rankedTracks = data.tracks.filter((t) => t.ranked);
  const rankedTeachers = data.teachers.filter((t) => t.ranked);
  const bestTrack = rankedTracks[0];
  const bestTeacher = rankedTeachers[0];
  const champions = data.tracks.filter((t) => t.champion).slice(0, 9);
  const excellentCount = data.students.filter((s) => s.days >= 5 && s.avg10 >= 9).length;
  const fullAttendance = rankedTracks.filter((t) => t.attendancePct === 100).length;
  const noData = '<div class="star-name muted">— لا توجد بيانات كافية —</div>';

  const header = (page: number) => `<header class="head${page === 1 ? ' cover' : ''}"><img src="${REPORT_LOGO_DATA_URI}" alt="" class="logo" /><div class="head-text">
    <div class="platform">${PLATFORM}</div>${page === 1
      ? `<h1>تقرير الإنجاز والتميّز</h1><div class="sub">${scope} · ${ADMIN_PERIOD_LABEL[period]}${
        from ? ` (${gregorianAr(from)} — ${gregorianAr(to)})` : ` (حتى ${gregorianAr(to)})`}</div>`
      : `<div class="sub strong">تقرير الإنجاز والتميّز · ${scope} · ${ADMIN_PERIOD_LABEL[period]}</div>`}
    </div><div class="pageno">${toAr(page)}</div></header>`;
  const page = (n: number, body: string) => `<section class="page">${header(n)}${body}</section>`;

  const step = (s: RankStudent | undefined, place: number, rank: number) => s
    ? `<div class="step p${place}"><div class="medal">${MEDALS[Math.min(rank, 3) - 1]}</div>
      <div class="step-name">${esc(s.name)}</div><div class="step-track">${esc(s.trackTitle)}</div>
      <div class="step-block"><b>${num(s.points)}</b><span>${pointsWord(s.points)}</span></div></div>`
    : '<div class="step"></div>';
  const tile = (cls: string, v: string, l: string) => `<div class="${cls}"><b>${v}</b><span>${l}</span></div>`;

  const p1 = `<div class="kpis">
      ${tile('kpi', num(data.totals.students), w.registered)}
      ${tile('kpi', num(data.totals.points), 'مجموع النقاط')}
      ${tile('kpi', `${toAr(Math.round(data.totals.avg10 * 10))}<small>٪</small>`, 'متوسط التقييم اليومي')}
      ${tile('kpi', `${num(data.totals.attendancePct)}<small>٪</small>`, 'نسبة الحضور')}
    </div>
    <h2>${w.stars}</h2>
    ${top.length
      ? `<div class="podium">${step(top[1], 2, topRanks[1])}${step(top[0], 1, topRanks[0])}${step(top[2], 3, topRanks[2])}</div>`
      : '<p class="empty">لا توجد تقييمات مسجّلة في هذه الفترة</p>'}
    <h2>✨ إنجازات الفترة</h2>
    <div class="wins">
      ${tile('win', num(data.totals.days), w.days)}
      ${tile('win', num(excellentCount), w.excellent)}
      ${tile('win', num(fullAttendance), 'حلقات بحضور كامل ١٠٠٪')}
    </div>
    <div class="stars">
      <div class="star"><div class="star-tag">⭐ الحلقة المتميزة</div>${bestTrack
        ? `<div class="star-name">${esc(bestTrack.title)}</div><div class="star-facts">
          <span>متوسط <b>${pct10(bestTrack.avg10)}</b></span><span>حضور <b>${num(bestTrack.attendancePct)}٪</b></span>
          ${bestTrack.champion ? `<span>بطلها: <b>${esc(bestTrack.champion)}</b></span>` : ''}</div>`
        : noData}</div>
      <div class="star"><div class="star-tag">${w.teacher}</div>${bestTeacher
        ? `<div class="star-name">${esc(bestTeacher.name)}</div><div class="star-facts">
          <span>${w.teacherAvg} <b>${pct10(bestTeacher.avg10)}</b></span><span>حضور <b>${num(bestTeacher.attendancePct)}٪</b></span>
          <span>${esc(bestTeacher.tracks.join('، '))}</span></div>`
        : noData}</div>
    </div>
    <p class="closing">﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾</p>`;

  const unranked = data.tracks.filter((t) => !t.ranked).map((t) => t.title).join('، ');
  const p2 = `<h2>📊 ترتيب الحلقات حسب متوسط التقييم</h2>
    <div class="bars">${rankedTracks.slice(0, 10).map((t) => `<div class="bar-row">
      <div class="bar-label"><b>${esc(t.title)}</b><span>${w.count} ${num(t.students)} · حضور ${num(t.attendancePct)}٪</span></div>
      <div class="bar-track"><div class="bar" style="width:${Math.min(100, t.avg10 * 10)}%"></div><span class="bar-value">${pct10(t.avg10)}</span></div>
    </div>`).join('')}</div>
    ${data.tracks.length > rankedTracks.length ? `<p class="note">حلقات لم تُرتَّب لقلة التقييمات في الفترة: ${esc(unranked)}</p>` : ''}
    <h2>${w.teachers}</h2>
    <table><thead><tr><th>#</th><th>الاسم</th><th>الحلقات</th><th>${w.students}</th><th>متوسط التقييم</th><th>الحضور</th></tr></thead>
    <tbody>${rankedTeachers.slice(0, 10).map((t, i) => `<tr${i < 3 ? ' class="top"' : ''}>
      <td>${i < 3 ? MEDALS[i] : num(i + 1)}</td><td><b>${esc(t.name)}</b></td><td>${esc(t.tracks.join('، '))}</td>
      <td>${num(t.students)}</td><td><b>${pct10(t.avg10)}</b></td><td>${num(t.attendancePct)}٪</td></tr>`).join('')}</tbody></table>`;

  const p3 = `<h2>${w.board}</h2>
    <table><thead><tr><th>#</th><th>${w.student}</th><th>الحلقة</th><th>النقاط</th><th>المتوسط</th><th>الحضور</th></tr></thead>
    <tbody>${top.map((s, i) => `<tr${topRanks[i] <= 3 ? ' class="top"' : ''}>
      <td>${topRanks[i] <= 3 ? MEDALS[topRanks[i] - 1] : num(topRanks[i])}</td><td><b>${esc(s.name)}</b></td>
      <td>${esc(s.trackTitle)}</td><td><b>${num(s.points)}</b></td><td>${pct10(s.avg10)}</td><td>${num(s.attendancePct)}٪</td></tr>`).join('')}</tbody></table>
    ${champions.length ? `<h2>🏅 أبطال الحلقات</h2><div class="champs">${champions
      .map((t) => `<div class="champ"><span>${esc(t.title)}</span><b>${esc(t.champion)}</b></div>`).join('')}</div>` : ''}
    <p class="closing">«خيركم من تعلّم القرآن وعلّمه» — بارك الله في الجهود، وإلى مزيد من التميّز.</p>`;

  return page(1, p1) + page(2, p2) + page(3, p3);
}

/** Print CSS — web's `.pr-*` rules (quran.css), with fixed px pages made fluid for @page A4. */
export const PROMO_REPORT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; color: #1a2e1e; }
  .page { display: flex; flex-direction: column; gap: 12px; min-height: 265mm; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .head { display: flex; align-items: center; gap: 14px; padding: 10px 16px; border-radius: 16px; background: #f1f6f1; }
  .head.cover { background: linear-gradient(135deg, #0f3d1b 0%, #1a5c2a 60%, #2b7a3d 100%); color: #fff; padding: 22px 24px; }
  .logo { width: 62px; height: 62px; border-radius: 50%; background: #fff; object-fit: cover; flex-shrink: 0; }
  .head:not(.cover) .logo { width: 40px; height: 40px; }
  .head-text { flex: 1; }
  .platform { font-size: 13px; font-weight: 700; opacity: .85; }
  .head h1 { margin: 2px 0 0; font-size: 34px; line-height: 1.3; color: #f6d27a; }
  .sub { font-size: 14px; opacity: .9; }
  .sub.strong { font-weight: 800; color: #1a5c2a; }
  .pageno { width: 30px; height: 30px; border-radius: 50%; background: rgba(201,149,42,.18); color: #6b4a12; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .head.cover .pageno { background: rgba(255,255,255,.18); color: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .kpi { background: #fff; border: 1px solid #e6eee6; border-radius: 14px; padding: 12px; text-align: center; }
  .kpi b { display: block; font-size: 28px; font-weight: 800; color: #1a5c2a; line-height: 1.2; }
  .kpi small { font-size: 15px; color: #6b7c70; font-weight: 700; }
  .kpi span { font-size: 12px; color: #4a5e50; font-weight: 600; }
  h2 { margin: 6px 0 0; font-size: 18px; font-weight: 800; color: #1a2e1e; }
  .podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-items: end; }
  .step { text-align: center; }
  .medal { font-size: 32px; line-height: 1; }
  .step-name { font-size: 15px; font-weight: 800; margin-top: 4px; }
  .step-track { font-size: 11px; color: #6b7c70; margin-bottom: 6px; }
  .step-block { border-radius: 14px 14px 6px 6px; color: #fff; padding: 12px 8px; display: flex; flex-direction: column; justify-content: center; }
  .step-block b { font-size: 26px; font-weight: 800; line-height: 1.1; }
  .step-block span { font-size: 12px; opacity: .9; }
  .p1 .step-block { height: 140px; background: linear-gradient(180deg, #2b7a3d, #1a5c2a); }
  .p2 .step-block { height: 110px; background: linear-gradient(180deg, #4d8a5c, #2f6b3e); }
  .p3 .step-block { height: 85px; background: linear-gradient(180deg, #6b9c77, #4a7d56); }
  .wins { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .win { border-radius: 14px; padding: 12px; background: linear-gradient(135deg, #fdf8ea, #fff); border: 1px solid #efdcae; display: flex; align-items: center; gap: 10px; }
  .win b { font-size: 28px; font-weight: 800; color: #6b4a12; line-height: 1; }
  .win span { font-size: 12px; font-weight: 700; color: #4a3a1a; line-height: 1.4; }
  .stars { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
  .star { border-radius: 16px; padding: 14px; background: #fff; border: 2px solid #e8cf94; }
  .star-tag { display: inline-block; font-size: 12px; font-weight: 800; color: #6b4a12; background: #fdf3dc; border-radius: 999px; padding: 3px 12px; }
  .star-name { font-size: 19px; font-weight: 800; margin: 8px 0 6px; color: #1a5c2a; line-height: 1.4; }
  .star-name.muted { color: #9aa79e; font-size: 14px; }
  .star-facts { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: #4a5e50; }
  .bars { display: flex; flex-direction: column; gap: 9px; }
  .bar-row { display: grid; grid-template-columns: 38% 1fr; gap: 12px; align-items: center; }
  .bar-label b { display: block; font-size: 13px; line-height: 1.35; }
  .bar-label span { font-size: 11px; color: #6b7c70; }
  .bar-track { display: flex; align-items: center; gap: 8px; height: 22px; border-bottom: 1px solid #edf1ed; }
  .bar { height: 18px; background: #1a5c2a; border-radius: 4px 0 0 4px; }
  .bar-value { font-size: 13px; font-weight: 800; white-space: nowrap; }
  .note { margin: 0; font-size: 11.5px; color: #6b7c70; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; background: #fff; border: 1px solid #e6eee6; border-radius: 12px; overflow: hidden; }
  th { background: #1a5c2a; color: #fff; font-weight: 700; padding: 7px 9px; text-align: right; }
  td { padding: 6px 9px; border-top: 1px solid #eef2ee; }
  tr { page-break-inside: avoid; }
  tr.top td { background: #fdf8ea; }
  td:first-child, th:first-child { text-align: center; width: 40px; }
  .champs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .champ { background: #fff; border: 1px solid #e6eee6; border-radius: 12px; padding: 8px 12px; display: flex; flex-direction: column; }
  .champ span { font-size: 11px; color: #6b7c70; }
  .champ b { font-size: 14px; color: #1a5c2a; }
  .empty { color: #6b7c70; text-align: center; padding: 30px; }
  .closing { margin: auto 0 0; text-align: center; font-size: 19px; color: #1a5c2a; }
`;
