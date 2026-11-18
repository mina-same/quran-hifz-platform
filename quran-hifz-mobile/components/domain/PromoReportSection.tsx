import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import CardHeader from '@/components/ui/CardHeader';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormSelect from '@/components/forms/FormSelect';
import FormDatePicker from '@/components/forms/FormDatePicker';
import StudentPointsSheet from '@/components/domain/StudentPointsSheet';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { useMasajid } from '@/lib/queries/masajid';
import { useTracks } from '@/lib/queries/tracks';
import { useRankings, ADMIN_PERIOD_LABEL, type AdminRankPeriod, type RankStudent } from '@/lib/queries/rankings';
import { todayIso, AR_LOCALE } from '@/lib/date';
import { sharePdf } from '@/lib/pdf';
import { promoReportHtml, PROMO_REPORT_CSS, WORDS, MEDALS, ranks } from '@/lib/promoReportPdf';
import type { GenderScope } from '@/lib/constants/genderScope';

type SectionKey = 'all' | 'male' | 'female';
const SECTION_TABS: { value: SectionKey; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'male', label: 'قسم البنين' },
  { value: 'female', label: 'قسم البنات' },
];
const PERIODS: AdminRankPeriod[] = ['week', 'month', 'lastMonth', 'all', 'custom'];
function num(n: number): string {
  return String(Number.isInteger(n) ? n : Number(n.toFixed(1)));
}
function pct10(avg10: number): string {
  return `${Math.round(avg10 * 10)}٪`;
}
function dateAr(iso: string): string {
  return new Date(iso).toLocaleDateString(AR_LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * «تقرير الإنجاز والتميّز» on screen (web: PromoReportSection + PromoReport `web`).
 * «تحميل PDF» builds web's three A4 pages (lib/promoReportPdf.ts) for the current filters.
 */
export default function PromoReportSection({ genderScope }: { genderScope: GenderScope }) {
  const theme = useAppTheme();
  const s = useMemo(() => StyleSheet.create({
    filters: { gap: 10 },
    range: { flexDirection: 'row', gap: 8 },
    rangeCol: { flex: 1, gap: 4 },
    label: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    sub: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center', paddingVertical: 12 },
    error: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.red },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    kpi: { flexBasis: '47%', flexGrow: 1, backgroundColor: theme.cardAlt, borderRadius: theme.radiusSm, padding: 10 },
    kpiVal: { fontSize: 20, fontFamily: theme.fontCairoBold, color: theme.green },
    h2: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 14, marginBottom: 8 },
    podium: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    step: { flex: 1, alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: theme.radiusSm, padding: 8, gap: 2 },
    stepFirst: { paddingVertical: 16, backgroundColor: theme.greenPale },
    medal: { fontSize: 22 },
    stepName: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, textAlign: 'center' },
    stepPts: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.green },
    star: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 10, gap: 2, marginTop: 8 },
    starTag: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.gold },
    starName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
    rank: { width: 28, textAlign: 'center', fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    rowMain: { flex: 1 },
    rowName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    rowVal: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.green },
    barTrack: { height: 6, borderRadius: 3, backgroundColor: theme.cardAlt, marginTop: 4, overflow: 'hidden' },
    bar: { height: 6, borderRadius: 3, backgroundColor: theme.green },
    fetching: { opacity: 0.6 },
  }), [theme]);

  const [period, setPeriod] = useState<AdminRankPeriod>('month');
  const [section, setSection] = useState<SectionKey>(genderScope);
  const today = todayIso();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [masjid, setMasjid] = useState('');
  const [track, setTrack] = useState('');
  const [detail, setDetail] = useState<RankStudent | null>(null);
  const [making, setMaking] = useState(false);
  const { data: masajid = [] } = useMasajid();
  const { data: tracks = [] } = useTracks();
  const rankings = useRankings(period, { from, to, masjid, track, withAll: section === 'all' });

  // Sections come from the masajid this user can see (a supervisor: their own).
  const hasMale = masajid.some((m) => m.gender === 'male');
  const hasFemale = masajid.some((m) => m.gender === 'female');
  const available = SECTION_TABS.filter((t) =>
    t.value === 'all' ? hasMale && hasFemale : t.value === 'male' ? hasMale : hasFemale,
  );
  const active = available.some((t) => t.value === section) ? section : available[0]?.value;
  const sectionMasajid = masajid
    .filter((m) => active === 'all' || m.gender === active)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const masjidOf = (t: (typeof tracks)[number]) => (typeof t.masjid === 'string' ? t.masjid : t.masjid?._id);
  const trackOptions = sectionMasajid
    .filter((m) => !masjid || m._id === masjid)
    .flatMap((m) =>
      tracks
        .filter((t) => masjidOf(t) === m._id)
        .sort((a, b) => a.title.localeCompare(b.title, 'ar'))
        .map((t) => ({ value: t._id, label: masjid ? t.title : `${t.title} — ${m.name}` })),
    );
  const scopeName = tracks.find((t) => t._id === track)?.title ?? masajid.find((m) => m._id === masjid)?.name;
  const data = rankings.data;
  const sd = active ? data?.sections[active] : undefined;
  const invalidRange = period === 'custom' && (!from || !to || from > to);

  async function downloadPdf() {
    if (!data || !sd || !active || making) return;
    setMaking(true);
    // Web's toast lifecycle: loading → success / error on the same toast id.
    const toastId = toast.loading('جارٍ تجهيز التقرير…');
    try {
      const body = promoReportHtml({ section: active, data: sd, period: data.period, from: data.from, to: data.to, scopeName });
      await sharePdf('تقرير الإنجاز والتميّز', body, PROMO_REPORT_CSS);
      toast.success('تم تنزيل التقرير', { id: toastId });
    } catch (e) {
      toast.error((e as Error)?.message || 'تعذّر إنشاء ملف PDF', { id: toastId });
    } finally {
      setMaking(false);
    }
  }

  const filters = (
    <Card style={s.filters}>
      <CardHeader title="تقرير الإنجاز والتميّز" subtitle="أوائل الطلاب والحلقات والمعلمين" style={{ marginBottom: 0 }} />
      {available.length > 1 && (
        <ScopeTabs
          options={available}
          value={active ?? 'male'}
          onChange={(v) => { setSection(v as SectionKey); setMasjid(''); setTrack(''); }}
        />
      )}
      <ScopeTabs
        options={PERIODS.map((p) => ({ value: p, label: ADMIN_PERIOD_LABEL[p] }))}
        value={period}
        onChange={(v) => setPeriod(v as AdminRankPeriod)}
      />
      {period === 'custom' && (
        <View style={s.range}>
          <View style={s.rangeCol}>
            <Text style={s.label}>من</Text>
            <FormDatePicker value={from} onChange={(v) => v && setFrom(v)} maximumDate={fromIso(to)} title="من" />
          </View>
          <View style={s.rangeCol}>
            <Text style={s.label}>إلى</Text>
            <FormDatePicker value={to} onChange={(v) => v && setTo(v)} minimumDate={fromIso(from)} maximumDate={fromIso(today)} title="إلى" />
          </View>
        </View>
      )}
      {sectionMasajid.length > 1 && (
        <FormSelect
          value={masjid}
          onChange={(v) => { setMasjid(v); setTrack(''); }}
          title="المسجد"
          options={[
            { value: '', label: active === 'female' ? 'كل الدور' : active === 'all' ? 'كل المساجد والدور' : 'كل المساجد' },
            ...sectionMasajid.map((m) => ({ value: m._id, label: m.name })),
          ]}
        />
      )}
      {trackOptions.length > 1 && (
        <FormSelect
          value={track}
          onChange={setTrack}
          title="المسار"
          options={[{ value: '', label: 'كل المسارات' }, ...trackOptions]}
        />
      )}
      <Button
        label={making ? 'جارٍ التجهيز…' : 'تحميل PDF'}
        onPress={downloadPdf}
        loading={making}
        disabled={rankings.isFetching || !sd || invalidRange}
        fullWidth
      />
    </Card>
  );

  if (rankings.isError) {
    return <>{filters}<Card><Text style={s.error}>{(rankings.error as Error).message}</Text></Card></>;
  }
  if (rankings.isLoading) return <>{filters}<Card><SkeletonRows /></Card></>;
  if (!data || !sd || !active) return filters;

  const w = WORDS[active];
  const top = sd.students.filter((x) => x.points > 0).slice(0, 15);
  const topRanks = ranks(top);
  const board = sd.students;
  const boardRanks = ranks(board);
  const rankedTracks = sd.tracks.filter((t) => t.ranked);
  const rankedTeachers = sd.teachers.filter((t) => t.ranked);
  const bestTrack = rankedTracks[0];
  const bestTeacher = rankedTeachers[0];
  const champions = sd.tracks.filter((t) => t.champion).slice(0, 9);
  const excellentCount = sd.students.filter((x) => x.days >= 5 && x.avg10 >= 9).length;
  const fullAttendance = rankedTracks.filter((t) => t.attendancePct === 100).length;
  const sectionLabel = SECTION_TABS.find((t) => t.value === active)!.label;
  const subtitle = `${scopeName ?? (active === 'all' ? 'البنين والبنات' : sectionLabel)} · ${ADMIN_PERIOD_LABEL[data.period]}${
    data.from ? ` (${dateAr(data.from)} — ${dateAr(data.to)})` : ` (حتى ${dateAr(data.to)})`}`;
  const fetchingStyle = rankings.isFetching ? s.fetching : undefined;

  return (
    <>
      {filters}

      <Card style={fetchingStyle}>
        <Text style={s.sub}>{rankings.isFetching ? 'جارٍ التحديث…' : subtitle}</Text>
        <View style={[s.grid, { marginTop: 8 }]}>
          {[
            [num(sd.totals.students), w.registered],
            [num(sd.totals.points), 'مجموع النقاط'],
            [pct10(sd.totals.avg10), 'متوسط التقييم اليومي'],
            [`${num(sd.totals.attendancePct)}٪`, 'نسبة الحضور'],
          ].map(([v, l]) => (
            <View key={l} style={s.kpi}><Text style={s.kpiVal}>{v}</Text><Text style={s.sub}>{l}</Text></View>
          ))}
        </View>

        <Text style={s.h2}>{w.stars}</Text>
        {top.length ? (
          <View style={s.podium}>
            {[1, 0, 2].map((i) => {
              const st = top[i];
              if (!st) return <View key={i} style={s.step} />;
              return (
                <Pressable key={st.id} style={[s.step, i === 0 && s.stepFirst]} onPress={() => setDetail(st)}>
                  <Text style={s.medal}>{MEDALS[Math.min(topRanks[i], 3) - 1]}</Text>
                  <Text style={s.stepName} numberOfLines={2}>{st.name}</Text>
                  <Text style={s.sub} numberOfLines={1}>{st.trackTitle}</Text>
                  <Text style={s.stepPts}>{num(st.points)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={s.muted}>لا توجد تقييمات مسجّلة في هذه الفترة</Text>
        )}

        <Text style={s.h2}>✨ إنجازات الفترة</Text>
        <View style={s.grid}>
          {[
            [num(sd.totals.days), w.days],
            [num(excellentCount), w.excellent],
            [num(fullAttendance), 'حلقات بحضور كامل ١٠٠٪'],
          ].map(([v, l]) => (
            <View key={l} style={s.kpi}><Text style={s.kpiVal}>{v}</Text><Text style={s.sub}>{l}</Text></View>
          ))}
        </View>

        <View style={s.star}>
          <Text style={s.starTag}>⭐ الحلقة المتميزة</Text>
          {bestTrack ? (
            <>
              <Text style={s.starName}>{bestTrack.title}</Text>
              <Text style={s.sub}>
                متوسط {pct10(bestTrack.avg10)} · حضور {num(bestTrack.attendancePct)}٪
                {bestTrack.champion ? ` · بطلها: ${bestTrack.champion}` : ''}
              </Text>
            </>
          ) : <Text style={s.sub}>— لا توجد بيانات كافية —</Text>}
        </View>
        <View style={s.star}>
          <Text style={s.starTag}>{w.teacher}</Text>
          {bestTeacher ? (
            <>
              <Text style={s.starName}>{bestTeacher.name}</Text>
              <Text style={s.sub}>
                {w.teacherAvg} {pct10(bestTeacher.avg10)} · حضور {num(bestTeacher.attendancePct)}٪ · {bestTeacher.tracks.join('، ')}
              </Text>
            </>
          ) : <Text style={s.sub}>— لا توجد بيانات كافية —</Text>}
        </View>
      </Card>

      <Card style={fetchingStyle}>
        <CardHeader title="📊 ترتيب الحلقات حسب متوسط التقييم" />
        {rankedTracks.slice(0, 10).map((t, i) => (
          <View key={t.id} style={s.row}>
            <Text style={s.rank}>{i + 1}</Text>
            <View style={s.rowMain}>
              <Text style={s.rowName}>{t.title}</Text>
              <Text style={s.sub}>{w.count} {num(t.students)} · حضور {num(t.attendancePct)}٪</Text>
              <View style={s.barTrack}><View style={[s.bar, { width: `${Math.min(100, t.avg10 * 10)}%` }]} /></View>
            </View>
            <Text style={s.rowVal}>{pct10(t.avg10)}</Text>
          </View>
        ))}
        {rankedTracks.length === 0 && <Text style={s.muted}>— لا توجد بيانات كافية —</Text>}
        {sd.tracks.length > rankedTracks.length && (
          <Text style={[s.sub, { marginTop: 8 }]}>
            حلقات لم تُرتَّب لقلة التقييمات في الفترة: {sd.tracks.filter((t) => !t.ranked).map((t) => t.title).join('، ')}
          </Text>
        )}
      </Card>

      {rankedTeachers.length > 0 && (
        <Card style={fetchingStyle}>
          <CardHeader title={w.teachers} />
          {rankedTeachers.slice(0, 10).map((t, i) => (
            <View key={t.id} style={s.row}>
              <Text style={s.rank}>{i < 3 ? MEDALS[i] : i + 1}</Text>
              <View style={s.rowMain}>
                <Text style={s.rowName}>{t.name}</Text>
                <Text style={s.sub}>{t.tracks.join('، ')} · {w.count} {num(t.students)} · حضور {num(t.attendancePct)}٪</Text>
              </View>
              <Text style={s.rowVal}>{pct10(t.avg10)}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={fetchingStyle}>
        <CardHeader title={w.board} subtitle="اضغط على الاسم لعرض تفاصيل النقاط" />
        {board.map((st, i) => {
          const medal = boardRanks[i] <= 3 && st.points > 0;
          return (
            <Pressable key={st.id} style={s.row} onPress={() => setDetail(st)}>
              <Text style={s.rank}>{medal ? MEDALS[boardRanks[i] - 1] : boardRanks[i]}</Text>
              <View style={s.rowMain}>
                <Text style={s.rowName}>{st.name}</Text>
                <Text style={s.sub}>{st.trackTitle} · المتوسط {pct10(st.avg10)} · الحضور {num(st.attendancePct)}٪</Text>
              </View>
              <Text style={s.rowVal}>{num(st.points)}</Text>
            </Pressable>
          );
        })}
        {board.length === 0 && <Text style={s.muted}>لا توجد تقييمات مسجّلة في هذه الفترة</Text>}
      </Card>

      {champions.length > 0 && (
        <Card style={fetchingStyle}>
          <CardHeader title="🏅 أبطال الحلقات" />
          {champions.map((t) => (
            <View key={t.id} style={s.row}>
              <Text style={[s.sub, s.rowMain]}>{t.title}</Text>
              <Text style={s.rowName}>{t.champion}</Text>
            </View>
          ))}
        </Card>
      )}

      <StudentPointsSheet student={detail} from={data.from} to={data.to} onClose={() => setDetail(null)} />
    </>
  );
}
