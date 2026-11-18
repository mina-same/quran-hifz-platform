import { useMemo, useState } from 'react';
import { View, StyleSheet, Share, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  IconChevronLeft, IconChevronRight, IconAlertTriangle, IconCopy, IconBrandWhatsapp, IconFileTypePdf,
} from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { sharePdf, esc } from '@/lib/pdf';
import { success, error as hapticError } from '@/lib/haptics';
import { AR_LOCALE, addDays, todayIso } from '@/lib/date';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { DailyReport, ReportChanges, ReportLine } from '@/lib/queries/dailyReports';

type AppTheme = ReturnType<typeof useAppTheme>;

/* ─── helpers (mirror quran-hifz/src/quran/lib/dailyReport.ts) ─────────── */

export const toAr = (n: number) => n.toLocaleString(AR_LOCALE);

/** Noon local time, so a YYYY-MM-DD key never slips a day across time zones. */
const atNoon = (date: string) => new Date(`${date}T12:00:00`);

/** «16/4/1448» — Umm al-Qura Hijri date, as written in the reports. */
export function hijriDate(date: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(atNoon(date));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year').replace(/\D/g, '')}`;
  } catch {
    return '';
  }
}

/** «الأحد» — same weekday names on every engine. */
export function weekdayAr(date: string): string {
  return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][atNoon(date).getDay()];
}

/** «٥ أكتوبر ٢٠٢٦» */
export function gregorianAr(date: string): string {
  return atNoon(date).toLocaleDateString(AR_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

const hijriAr = (date: string) => hijriDate(date).replace(/\d+/g, (d) => toAr(Number(d)).replace(/[٬,]/g, ''));

export const REPORT_CLOSING = 'وفقنا الله وإياكم لخيري الدنيا والآخرة.';

/** The WhatsApp-ready plain text of a report (same layout as the paper one). */
export function reportText(r: DailyReport): string {
  const lines: string[] = [];
  lines.push(`📖 التَّقْرِيرُ الْيَوْمِيُّ لِحَلْقَةِ ${r.trackTitle}${r.masjidName ? ` في ${r.masjidName}` : ''}.`);
  lines.push('');
  lines.push(`التاريخ: ${hijriDate(r.date)} اليوم: ${weekdayAr(r.date)}`);
  lines.push(`الحضور: ${r.presentCount} من ${r.totalCount}`);
  lines.push('');
  lines.push('البيان');
  const section = (title: string, rows: ReportLine[]) => {
    lines.push('');
    lines.push(title);
    if (!rows.length) lines.push('لا يوجد');
    for (const row of rows) lines.push([row.name, row.area, row.note].filter(Boolean).join(' — '));
  };
  section('⚠️ المتعثرون', r.struggling);
  section('❌ الغائبون', r.absent);
  section('🙋 المعتذرون', r.excused);
  if (r.notes) {
    lines.push('');
    lines.push(`📝 ملاحظات: ${r.notes}`);
  }
  lines.push('');
  lines.push('');
  lines.push(REPORT_CLOSING);
  return lines.join('\n');
}

/** All of one teacher's reports for a day as a single WhatsApp-ready text. */
export function combinedReportText(teacher: string, date: string, reports: DailyReport[], pending: string[] = []): string {
  const present = reports.reduce((n, r) => n + r.presentCount, 0);
  const total = reports.reduce((n, r) => n + r.totalCount, 0);
  const lines: string[] = [];
  lines.push(`📖 التَّقْرِيرُ الْيَوْمِيُّ الْمُجَمَّعُ لِحَلَقَاتِ الْمُعَلِّمِ ${teacher}.`);
  lines.push('');
  lines.push(`التاريخ: ${hijriDate(date)} اليوم: ${weekdayAr(date)}`);
  lines.push(`عدد الحلقات: ${reports.length} — الحضور: ${present} من ${total}`);
  if (pending.length) lines.push(`لم تُرسل بعد: ${pending.join('، ')}`);
  const section = (title: string, key: 'struggling' | 'absent' | 'excused') => {
    lines.push('');
    lines.push(title);
    const withRows = reports.filter((r) => r[key].length);
    if (!withRows.length) lines.push('لا يوجد');
    for (const r of withRows) {
      lines.push(`— حلقة ${r.trackTitle}:`);
      for (const row of r[key]) lines.push([row.name, row.area, row.note].filter(Boolean).join(' — '));
    }
  };
  section('⚠️ المتعثرون', 'struggling');
  section('❌ الغائبون', 'absent');
  section('🙋 المعتذرون', 'excused');
  const notes = reports.filter((r) => r.notes);
  if (notes.length) {
    lines.push('');
    lines.push('📝 ملاحظات:');
    for (const r of notes) lines.push(`${r.trackTitle}: ${r.notes}`);
  }
  lines.push('');
  lines.push('');
  lines.push(REPORT_CLOSING);
  return lines.join('\n');
}

/* ─── date bar ─────────────────────────────────────────────────────────── */

/** ‹ day › stepper, capped at today (same as web's date input `max={today}`). */
export function DailyReportDateBar({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const today = todayIso();
  const atToday = date >= today;
  return (
    <View style={s.dateBar}>
      <Pressable style={s.dateBtn} onPress={() => onChange(addDays(date, -1))} accessibilityLabel="اليوم السابق">
        <IconChevronRight size={20} color={theme.text} />
      </Pressable>
      <View style={s.dateMid}>
        <Text style={s.dateDay}>{weekdayAr(date)} {hijriAr(date)} هـ</Text>
        <Text style={s.muted}>{gregorianAr(date)}</Text>
      </View>
      <Pressable
        style={[s.dateBtn, atToday && s.disabled]}
        disabled={atToday}
        onPress={() => onChange(addDays(date, 1))}
        accessibilityLabel="اليوم التالي"
      >
        <IconChevronLeft size={20} color={theme.text} />
      </Pressable>
    </View>
  );
}

/* ─── sheets ───────────────────────────────────────────────────────────── */

type Tone = 'gold' | 'red' | 'blue';

function Rows({ rows, s }: { rows: ReportLine[]; s: ReturnType<typeof createS> }) {
  return (
    <>
      {rows.map((r, i) => (
        <View key={r.student} style={s.row}>
          <Text style={s.rowName}>{toAr(i + 1)}. {r.name}</Text>
          {!!r.area && <Text style={s.rowArea}>{r.area}</Text>}
          {!!r.note && <Text style={s.muted}>{r.note}</Text>}
        </View>
      ))}
    </>
  );
}

function SectionHead({ icon, title, count, tone, s }: { icon: string; title: string; count: number; tone: Tone; s: ReturnType<typeof createS> }) {
  const theme = useAppTheme();
  return (
    <View style={[s.secHead, { backgroundColor: theme.tone[tone].bg }]}>
      <Text style={[s.secTitle, { color: theme.tone[tone].text }]}>{icon} {title} ({toAr(count)})</Text>
    </View>
  );
}

const SECTIONS: { key: 'struggling' | 'absent' | 'excused'; icon: string; title: string; tone: Tone; empty: string }[] = [
  { key: 'struggling', icon: '⚠️', title: 'المتعثرون', tone: 'gold', empty: 'لا يوجد متعثرون اليوم' },
  { key: 'absent', icon: '❌', title: 'الغائبون', tone: 'red', empty: 'لا يوجد غائبون' },
  { key: 'excused', icon: '🙋', title: 'المعتذرون', tone: 'blue', empty: 'لا يوجد معتذرون' },
];

/** The report itself — same layout as the WhatsApp text. */
export function DailyReportSheet({ report: r }: { report: DailyReport }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  return (
    <View style={s.sheet}>
      <View style={s.head}>
        <Text style={s.title}>📖 التَّقْرِيرُ الْيَوْمِيُّ لِحَلْقَةِ {r.trackTitle}</Text>
        {!!r.masjidName && <Text style={s.center}>في {r.masjidName}</Text>}
        <Text style={s.center}>التاريخ: {hijriAr(r.date)} هـ · اليوم: {weekdayAr(r.date)}</Text>
        <Text style={[s.center, s.muted]}>{gregorianAr(r.date)}</Text>
        <Text style={s.center}>الحضور {toAr(r.presentCount)} من {toAr(r.totalCount)}{r.teacherName ? ` · المعلم: ${r.teacherName}` : ''}</Text>
      </View>
      <Text style={s.label}>البيان</Text>
      {SECTIONS.map((sec) => (
        <View key={sec.key} style={s.section}>
          <SectionHead icon={sec.icon} title={sec.title} count={r[sec.key].length} tone={sec.tone} s={s} />
          {r[sec.key].length === 0 ? <Text style={s.muted}>{sec.empty}</Text> : <Rows rows={r[sec.key]} s={s} />}
        </View>
      ))}
      {!!r.notes && <Text style={s.notes}>📝 {r.notes}</Text>}
      <Text style={s.closing}>{REPORT_CLOSING}</Text>
    </View>
  );
}

/** All of one teacher's reports for a day merged into one sheet. */
export function DailyReportCombinedSheet({ teacher, date, reports, pending = [] }: {
  teacher: string; date: string; reports: DailyReport[]; pending?: string[];
}) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const present = reports.reduce((n, r) => n + r.presentCount, 0);
  const total = reports.reduce((n, r) => n + r.totalCount, 0);
  const notes = reports.filter((r) => r.notes);
  return (
    <View style={s.sheet}>
      <View style={s.head}>
        <Text style={s.title}>📖 التَّقْرِيرُ الْيَوْمِيُّ الْمُجَمَّعُ لِحَلَقَاتِ الْمُعَلِّمِ</Text>
        <Text style={s.center}>{teacher}</Text>
        <Text style={s.center}>التاريخ: {hijriAr(date)} هـ · اليوم: {weekdayAr(date)}</Text>
        <Text style={[s.center, s.muted]}>{gregorianAr(date)}</Text>
        <Text style={s.center}>عدد الحلقات {toAr(reports.length)} · الحضور {toAr(present)} من {toAr(total)}</Text>
        {reports.map((r) => (
          <Text key={r._id ?? r.track} style={[s.center, s.muted]}>
            {r.trackTitle}{r.masjidName && !r.trackTitle.includes(r.masjidName) ? ` — ${r.masjidName}` : ''} · {toAr(r.presentCount)}/{toAr(r.totalCount)}
          </Text>
        ))}
        {pending.length > 0 && <Text style={[s.center, { color: theme.tone.red.text }]}>لم تُرسل بعد: {pending.join('، ')}</Text>}
      </View>
      <Text style={s.label}>البيان</Text>
      {SECTIONS.map((sec) => {
        const count = reports.reduce((n, r) => n + r[sec.key].length, 0);
        return (
          <View key={sec.key} style={s.section}>
            <SectionHead icon={sec.icon} title={sec.title} count={count} tone={sec.tone} s={s} />
            {count === 0 ? (
              <Text style={s.muted}>{sec.empty}</Text>
            ) : (
              reports.filter((r) => r[sec.key].length).map((r) => (
                <View key={r._id ?? r.track} style={s.group}>
                  <Text style={s.groupTitle}>حلقة {r.trackTitle} ({toAr(r[sec.key].length)})</Text>
                  <Rows rows={r[sec.key]} s={s} />
                </View>
              ))
            )}
          </View>
        );
      })}
      {notes.map((r) => <Text key={r._id ?? r.track} style={s.notes}>📝 {r.trackTitle}: {r.notes}</Text>)}
      <Text style={s.closing}>{REPORT_CLOSING}</Text>
    </View>
  );
}

/* ─── PDF (mirrors web's .dr-sheet markup + quran.css) ───────────────────── */

export const REPORT_PDF_CSS = `
  .dr-sheet { background: #fffdf8; color: #1a2e1e; border: 1px solid rgba(26,92,42,.18); border-radius: 14px; padding: 22px 22px 18px; line-height: 1.8; page-break-inside: avoid; }
  .dr-sheet + .dr-sheet { margin-top: 16px; }
  .dr-head { text-align: center; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 2px solid rgba(201,149,42,.45); }
  .dr-title { font-size: 21px; font-weight: 700; color: #1a5c2a; line-height: 1.7; }
  .dr-masjid { font-size: 18px; color: #1a5c2a; }
  .dr-date, .dr-stats { display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 16px; }
  .dr-date { margin-top: 8px; font-size: 14px; }
  .dr-greg { color: #8a7a5a; font-size: 12.5px; }
  .dr-stats { font-size: 13px; color: #4a6b52; margin-top: 2px; }
  .dr-tracks { display: flex; justify-content: center; flex-wrap: wrap; gap: 4px 8px; margin-top: 8px; }
  .dr-tracks span { padding: 1px 10px; border-radius: 999px; background: rgba(26,92,42,.07); color: #1a5c2a; font-size: 12.5px; font-weight: 600; }
  .dr-pending { margin-top: 6px; font-size: 12.5px; color: #a0522d; font-weight: 700; }
  .dr-label { text-align: center; font-weight: 800; font-size: 15px; margin-bottom: 6px; color: #6b3a1f; }
  .dr-section { margin: 10px 0; padding: 10px 14px; border-radius: 10px; border-right: 4px solid; page-break-inside: avoid; }
  .dr-section.warn { background: #fdf6e3; border-color: #c9952a; }
  .dr-section.absent { background: #fdeeec; border-color: #c0392b; }
  .dr-section.excused { background: #eef4fb; border-color: #2563eb; }
  .dr-section h4 { font-size: 15px; font-weight: 800; margin: 0 0 4px; }
  .dr-count { display: inline-block; min-width: 22px; padding: 0 6px; text-align: center; border-radius: 999px; background: rgba(0,0,0,.07); font-size: 12px; font-weight: 800; }
  .dr-section ol { margin: 0; padding-right: 20px; }
  .dr-section li { font-size: 14.5px; margin: 2px 0; }
  .dr-area { margin-right: 8px; padding: 0 8px; border-radius: 6px; background: rgba(201,149,42,.18); color: #6b3a1f; font-size: 12.5px; font-weight: 700; }
  .dr-note { margin-right: 8px; color: #555; font-size: 13px; }
  .dr-note::before { content: "— "; }
  .dr-empty { margin: 0; font-size: 13px; color: #8a8a8a; }
  .dr-group + .dr-group { margin-top: 6px; }
  .dr-group-title { font-size: 13px; font-weight: 800; color: #1a5c2a; }
  .dr-notes { margin: 10px 0 0; font-size: 13.5px; color: #333; }
  .dr-closing { text-align: center; margin: 14px 0 0; font-size: 16px; color: #1a5c2a; }
`;

const TONE_CLASS = { struggling: 'warn', absent: 'absent', excused: 'excused' } as const;

const linesHtml = (rows: ReportLine[]) => `<ol>${rows.map((r) =>
  `<li><b>${esc(r.name)}</b>${r.area ? `<span class="dr-area">${esc(r.area)}</span>` : ''}${r.note ? `<span class="dr-note">${esc(r.note)}</span>` : ''}</li>`).join('')}</ol>`;

const sectionHtml = (sec: (typeof SECTIONS)[number], count: number, body: string) =>
  `<section class="dr-section ${TONE_CLASS[sec.key]}"><h4>${sec.icon} ${sec.title} <span class="dr-count">${toAr(count)}</span></h4>${
    count === 0 ? `<p class="dr-empty">${sec.empty}</p>` : body}</section>`;

const dateHtml = (date: string) => `<div class="dr-date"><span>التاريخ: <b>${hijriAr(date)} هـ</b></span><span>اليوم: <b>${weekdayAr(date)}</b></span><span class="dr-greg">${gregorianAr(date)}</span></div>`;

/** Web's DailyReportSheet as print HTML — one report. */
export function reportSheetHtml(r: DailyReport): string {
  return `<div class="dr-sheet"><header class="dr-head">
<div class="dr-title">📖 التَّقْرِيرُ الْيَوْمِيُّ لِحَلْقَةِ ${esc(r.trackTitle)}</div>
${r.masjidName ? `<div class="dr-masjid">في ${esc(r.masjidName)}</div>` : ''}
${dateHtml(r.date)}
<div class="dr-stats"><span>الحضور <b>${toAr(r.presentCount)}</b> من <b>${toAr(r.totalCount)}</b></span>${r.teacherName ? `<span>المعلم: <b>${esc(r.teacherName)}</b></span>` : ''}</div>
</header><div class="dr-label">البيان</div>
${SECTIONS.map((sec) => sectionHtml(sec, r[sec.key].length, linesHtml(r[sec.key]))).join('')}
${r.notes ? `<p class="dr-notes">📝 ${esc(r.notes)}</p>` : ''}
<p class="dr-closing">${REPORT_CLOSING}</p></div>`;
}

/** Web's DailyReportCombinedSheet as print HTML — one teacher's day merged. */
export function combinedSheetHtml(teacher: string, date: string, reports: DailyReport[], pending: string[] = []): string {
  const present = reports.reduce((n, r) => n + r.presentCount, 0);
  const total = reports.reduce((n, r) => n + r.totalCount, 0);
  return `<div class="dr-sheet"><header class="dr-head">
<div class="dr-title">📖 التَّقْرِيرُ الْيَوْمِيُّ الْمُجَمَّعُ لِحَلَقَاتِ الْمُعَلِّمِ</div>
<div class="dr-masjid">${esc(teacher)}</div>
${dateHtml(date)}
<div class="dr-stats"><span>عدد الحلقات <b>${toAr(reports.length)}</b></span><span>الحضور <b>${toAr(present)}</b> من <b>${toAr(total)}</b></span></div>
<div class="dr-tracks">${reports.map((r) => `<span>${esc(r.trackTitle)}${r.masjidName && !r.trackTitle.includes(r.masjidName) ? ` — ${esc(r.masjidName)}` : ''} · ${toAr(r.presentCount)}/${toAr(r.totalCount)}</span>`).join('')}</div>
${pending.length ? `<div class="dr-pending">لم تُرسل بعد: ${esc(pending.join('، '))}</div>` : ''}
</header><div class="dr-label">البيان</div>
${SECTIONS.map((sec) => {
    const count = reports.reduce((n, r) => n + r[sec.key].length, 0);
    const body = reports.filter((r) => r[sec.key].length).map((r) =>
      `<div class="dr-group"><div class="dr-group-title">حلقة ${esc(r.trackTitle)} <span class="dr-count">${toAr(r[sec.key].length)}</span></div>${linesHtml(r[sec.key])}</div>`).join('');
    return sectionHtml(sec, count, body);
  }).join('')}
${reports.filter((r) => r.notes).map((r) => `<p class="dr-notes">📝 <b>${esc(r.trackTitle)}:</b> ${esc(r.notes)}</p>`).join('')}
<p class="dr-closing">${REPORT_CLOSING}</p></div>`;
}

/** Render sheets to an A4 PDF and open the share sheet; throws on failure. */
export const shareReportPdf = (title: string, sheetsHtml: string) => sharePdf(title, sheetsHtml, REPORT_PDF_CSS);

/* ─── actions ──────────────────────────────────────────────────────────── */

/** Web's DailyReportActions: «نسخ النص» / «واتساب» / «تحميل PDF». */
export function DailyReportActions({ text, title, html }: { text: string; title: string; html: () => string }) {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);

  async function copy() {
    try {
      await Clipboard.setStringAsync(text);
      success();
      toast.success('تم نسخ نص التقرير — الصقه في واتساب');
    } catch {
      hapticError();
      toast.error('تعذّر النسخ');
    }
  }

  async function whatsapp() {
    // Same link as web: universal https link opens WhatsApp when installed
    // without needing LSApplicationQueriesSchemes / Android <queries>.
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      return void (await Linking.openURL(url));
    } catch { /* fall through to the share sheet */ }
    Share.share({ message: text }).catch(() => {});
  }

  async function pdf() {
    setBusy(true);
    try {
      await shareReportPdf(title, html());
    } catch {
      hapticError();
      toast.error('تعذّر إنشاء ملف PDF');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label="نسخ النص" variant="outline" icon={<IconCopy size={16} color={theme.greenAccent} />} onPress={copy} haptic="none" />
        <Button label="واتساب" variant="outline" icon={<IconBrandWhatsapp size={16} color={theme.greenAccent} />} onPress={whatsapp} />
        <Button label="تحميل PDF" variant="outline" icon={<IconFileTypePdf size={16} color={theme.greenAccent} />} onPress={pdf} loading={busy} />
      </View>
    </View>
  );
}

/** A report with its actions — used in the supervisor/admin list. */
export function DailyReportCard({ report }: { report: DailyReport }) {
  return (
    <View style={{ gap: 10 }}>
      <DailyReportSheet report={report} />
      <DailyReportActions text={reportText(report)} title={reportFileName(report)} html={() => reportSheetHtml(report)} />
    </View>
  );
}

export function reportFileName(r: DailyReport): string {
  return `تقرير-${r.trackTitle}-${r.date}`;
}

/** One teacher's day merged into a single sheet, with its actions. */
export function DailyReportCombinedCard({ teacher, date, reports, pending }: { teacher: string; date: string; reports: DailyReport[]; pending?: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      <DailyReportCombinedSheet teacher={teacher} date={date} reports={reports} pending={pending} />
      <DailyReportActions
        text={combinedReportText(teacher, date, reports, pending)}
        title={`تقرير-مجمع-${teacher}-${date}`}
        html={() => combinedSheetHtml(teacher, date, reports, pending)}
      />
    </View>
  );
}

/* ─── changes box ──────────────────────────────────────────────────────── */

/** "2.5" → «٢٫٥»; words (e.g. attendance) unchanged. */
const val = (v: string) => (v && /^\d+(\.\d+)?$/.test(v) ? toAr(Number(v)).replace('.', '٫') : v || '—');

const SECTION_LABEL: Record<ReportChanges['sections'][number]['key'], string> = {
  struggling: 'المتعثرون',
  absent: 'الغائبون',
  excused: 'المعتذرون',
};

/** «عُدّلت التقييمات بعد الإرسال» — what changed in the records since the report was sent. */
export function ReportChangesBox({ changes, children }: { changes: ReportChanges; children?: React.ReactNode }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const c = theme.tone.gold;
  return (
    <View style={[s.changes, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={s.changesHead}>
        <IconAlertTriangle size={16} color={c.text} />
        <Text style={[s.bold, { color: c.text, flex: 1 }]}>عُدّلت التقييمات أو الحضور بعد إرسال التقرير</Text>
      </View>
      {changes.sections.map((sec) => (
        <Text key={sec.key} style={[s.small, { color: c.text }]}>
          <Text style={s.bold}>{SECTION_LABEL[sec.key]}: </Text>
          {[
            ...sec.added.map((n) => `+ أُضيف ${n}`),
            ...sec.removed.map((n) => `− خرج ${n}`),
            ...sec.changed.map((x) => `${x.name}: ${x.from || '—'} ← ${x.to || '—'}`),
          ].join(' · ')}
        </Text>
      ))}
      {changes.present && (
        <Text style={[s.small, { color: c.text }]}>
          <Text style={s.bold}>الحضور: </Text>{toAr(changes.present.from)} ← {toAr(changes.present.to)}
        </Text>
      )}
      {changes.grades?.map((g, i) => (
        <Text key={i} style={[s.small, { color: c.text }]}>
          <Text style={s.bold}>{g.studentName}: </Text>
          {g.changes.map((x) => `${x.label} ${val(x.from)} ← ${val(x.to)}`).join(' · ')}
          {` (${g.editedByName} · ${new Date(g.at).toLocaleString(AR_LOCALE, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })})`}
        </Text>
      ))}
      {children}
    </View>
  );
}

const createS = (theme: AppTheme) => StyleSheet.create({
  dateBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: 8,
  },
  dateBtn: {
    width: 40, height: 40, borderRadius: theme.radiusSm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.cardAlt,
  },
  disabled: { opacity: 0.4 },
  dateMid: { flex: 1, alignItems: 'center' },
  dateDay: { fontFamily: theme.fontCairoBold, fontSize: 14, color: theme.text, textAlign: 'center' },
  sheet: {
    backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border,
    padding: 14, gap: 10,
  },
  head: { gap: 2, alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontFamily: theme.fontCairoBold, fontSize: 15, color: theme.text, textAlign: 'center' },
  center: { fontSize: 13, color: theme.text, textAlign: 'center' },
  label: { fontFamily: theme.fontCairoBold, fontSize: 14, color: theme.text },
  section: { gap: 6 },
  secHead: { borderRadius: theme.radiusSm, paddingHorizontal: 10, paddingVertical: 6 },
  secTitle: { fontFamily: theme.fontCairoBold, fontSize: 13 },
  row: { gap: 2, paddingHorizontal: 4 },
  rowName: { fontFamily: theme.fontCairoBold, fontSize: 13, color: theme.text },
  rowArea: { fontSize: 12, color: theme.tone.gold.text },
  group: { gap: 4 },
  groupTitle: { fontFamily: theme.fontCairoBold, fontSize: 12, color: theme.textMuted },
  muted: { fontSize: 12, color: theme.textMuted },
  notes: { fontSize: 13, color: theme.text },
  closing: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  changes: { borderWidth: 1, borderRadius: theme.radius, padding: 12, gap: 6 },
  changesHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bold: { fontFamily: theme.fontCairoBold },
  small: { fontSize: 12, lineHeight: 19 },
});
