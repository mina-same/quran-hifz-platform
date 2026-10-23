import type { RankPeriod, RankSection, RankStudent } from "../../api/rankings";
import { PERIOD_LABEL } from "../../api/rankings";
import { gregorianAr } from "../../lib/dailyReport";
import { toAr } from "../../../lib/format";

const LOGO_SRC = "/quran/logo.png";
const PLATFORM = "المنصة التعليمية لجمعية التحفيظ بالعماير";
const SECTION_LABEL = { male: "قسم البنين", female: "قسم البنات" } as const;
const MEDALS = ["🥇", "🥈", "🥉"];

/** Wording per section — the girls' report speaks of «الطالبات». */
const WORDS = {
  male: {
    students: "الطلاب",
    registered: "الطلاب المسجّلون",
    stars: "🏆 فرسان الفترة",
    student: "الطالب",
    excellent: "طلاب بمتوسط ٩ من ١٠ فأكثر",
    days: "يوم تقييم مسجّل للطلاب",
    board: "🌟 لوحة شرف الطلاب",
    teacher: "⭐ المعلم المتميز",
    teacherAvg: "متوسط طلابه",
    teachers: "👨‍🏫 ترتيب المعلمين",
    count: "عدد الطلاب",
  },
  female: {
    students: "الطالبات",
    registered: "الطالبات المسجّلات",
    stars: "🏆 نجمات الفترة",
    student: "الطالبة",
    excellent: "طالبات بمتوسط ٩ من ١٠ فأكثر",
    days: "يوم تقييم مسجّل للطالبات",
    board: "🌟 لوحة شرف الطالبات",
    teacher: "⭐ المعلمة المتميزة",
    teacherAvg: "متوسط طالباتها",
    teachers: "👩‍🏫 ترتيب المعلمات",
    count: "عدد الطالبات",
  },
} as const;

/** 2.5 → «٢٫٥», 120 → «١٢٠» (points may carry decimals since grades can). */
function num(n: number): string {
  return toAr(Number.isInteger(n) ? n : Number(n.toFixed(1))).replace(".", "٫");
}

/** «نقطة / نقطتان / نقاط / نقطة» — Arabic counted-noun agreement for points. */
function pointsWord(n: number): string {
  if (!Number.isInteger(n)) return "نقطة";
  if (n === 2) return "نقطتان";
  return n >= 3 && n <= 10 ? "نقاط" : "نقطة";
}

/** Competition ranking: ties share a place. */
function ranks(rows: { points: number }[]): number[] {
  return rows.map((r) => 1 + rows.filter((x) => x.points > r.points).length);
}

function Header({
  section,
  period,
  from,
  to,
  page,
}: {
  section: "male" | "female";
  period: RankPeriod;
  from: string | null;
  to: string;
  page: number;
}) {
  return (
    <header className={`pr-head ${page === 1 ? "cover" : ""}`}>
      <img src={LOGO_SRC} alt="" className="pr-logo" />
      <div className="pr-head-text">
        <div className="pr-platform">{PLATFORM}</div>
        {page === 1 ? (
          <>
            <h1>تقرير الإنجاز والتميّز</h1>
            <div className="pr-sub">
              {SECTION_LABEL[section]} · {PERIOD_LABEL[period]}
              {from ? ` (${gregorianAr(from)} — ${gregorianAr(to)})` : ` (حتى ${gregorianAr(to)})`}
            </div>
          </>
        ) : (
          <div className="pr-sub strong">
            تقرير الإنجاز والتميّز · {SECTION_LABEL[section]} · {PERIOD_LABEL[period]}
          </div>
        )}
      </div>
      <div className="pr-pageno">{toAr(page)}</div>
    </header>
  );
}

function Podium({ top, topRanks }: { top: RankStudent[]; topRanks: number[] }) {
  // Visual order 2 · 1 · 3 (RTL puts the first child on the right). The block
  // height follows the position; the medal follows the shared rank (ties).
  const order = [top[1], top[0], top[2]];
  const place = [2, 1, 3];
  const medalOf = [topRanks[1], topRanks[0], topRanks[2]];
  return (
    <div className="pr-podium">
      {order.map((s, i) =>
        s ? (
          <div key={s.id} className={`pr-step p${place[i]}`}>
            <div className="pr-medal">{MEDALS[Math.min(medalOf[i], 3) - 1]}</div>
            <div className="pr-step-name">{s.name}</div>
            <div className="pr-step-track">{s.trackTitle}</div>
            <div className="pr-step-block">
              <b>{num(s.points)}</b>
              <span>{pointsWord(s.points)}</span>
            </div>
          </div>
        ) : (
          <div key={i} className="pr-step empty" />
        ),
      )}
    </div>
  );
}

/** Single-series horizontal bars: one hue, value at the tip (no legend needed). */
function Bars({
  rows,
}: {
  rows: { label: string; sub?: string; value: number; display: string }[];
}) {
  const max = Math.max(10, ...rows.map((r) => r.value));
  return (
    <div className="pr-bars">
      {rows.map((r) => (
        <div key={r.label} className="pr-bar-row">
          <div className="pr-bar-label">
            <b>{r.label}</b>
            {r.sub && <span>{r.sub}</span>}
          </div>
          <div className="pr-bar-track">
            <div className="pr-bar" style={{ width: `${(r.value / max) * 100}%` }} />
            <span className="pr-bar-value">{r.display}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The promotional «تقرير الإنجاز والتميّز» for one gender section: three A4
 * pages (794×1123 px) rendered off-screen and captured by downloadPagesPdf.
 */
export function PromoReport({
  section,
  data,
  period,
  from,
  to,
}: {
  section: "male" | "female";
  data: RankSection;
  period: RankPeriod;
  from: string | null;
  to: string;
}) {
  const studentsWithPoints = data.students.filter((s) => s.points > 0);
  const top = studentsWithPoints.slice(0, 15);
  const topRanks = ranks(top);
  const rankedTracks = data.tracks.filter((t) => t.ranked);
  const rankedTeachers = data.teachers.filter((t) => t.ranked);
  const bestTrack = rankedTracks[0];
  const bestTeacher = rankedTeachers[0];
  const champions = data.tracks.filter((t) => t.champion).slice(0, 9);
  const head = { section, period, from, to };
  const w = WORDS[section];
  const excellentCount = data.students.filter((s) => s.days >= 5 && s.avg10 >= 9).length;
  const fullAttendance = rankedTracks.filter((t) => t.attendancePct === 100).length;

  return (
    <>
      {/* ── Page 1: cover, headline numbers, podium, stars ── */}
      <div className="pr-page" dir="rtl">
        <Header {...head} page={1} />
        <div className="pr-kpis">
          <div className="pr-kpi">
            <b>{num(data.totals.students)}</b>
            <span>{w.registered}</span>
          </div>
          <div className="pr-kpi">
            <b>{num(data.totals.points)}</b>
            <span>مجموع النقاط</span>
          </div>
          <div className="pr-kpi">
            <b>
              {num(data.totals.avg10)}
              <small>/١٠</small>
            </b>
            <span>متوسط التقييم اليومي</span>
          </div>
          <div className="pr-kpi">
            <b>
              {num(data.totals.attendancePct)}
              <small>٪</small>
            </b>
            <span>نسبة الحضور</span>
          </div>
        </div>

        <h2 className="pr-h2">{w.stars}</h2>
        {top.length ? (
          <Podium top={top} topRanks={topRanks} />
        ) : (
          <p className="pr-empty">لا توجد تقييمات مسجّلة في هذه الفترة</p>
        )}

        <h2 className="pr-h2">✨ إنجازات الفترة</h2>
        <div className="pr-wins">
          <div className="pr-win">
            <b>{num(data.totals.days)}</b>
            <span>{w.days}</span>
          </div>
          <div className="pr-win">
            <b>{num(excellentCount)}</b>
            <span>{w.excellent}</span>
          </div>
          <div className="pr-win">
            <b>{num(fullAttendance)}</b>
            <span>حلقات بحضور كامل ١٠٠٪</span>
          </div>
        </div>

        <div className="pr-stars">
          <div className="pr-star">
            <div className="pr-star-tag">⭐ الحلقة المتميزة</div>
            {bestTrack ? (
              <>
                <div className="pr-star-name">{bestTrack.title}</div>
                <div className="pr-star-facts">
                  <span>
                    متوسط <b>{num(bestTrack.avg10)}/١٠</b>
                  </span>
                  <span>
                    حضور <b>{num(bestTrack.attendancePct)}٪</b>
                  </span>
                  {bestTrack.champion && (
                    <span>
                      بطلها: <b>{bestTrack.champion}</b>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="pr-star-name muted">— لا توجد بيانات كافية —</div>
            )}
          </div>
          <div className="pr-star">
            <div className="pr-star-tag">{w.teacher}</div>
            {bestTeacher ? (
              <>
                <div className="pr-star-name">{bestTeacher.name}</div>
                <div className="pr-star-facts">
                  <span>
                    {w.teacherAvg} <b>{num(bestTeacher.avg10)}/١٠</b>
                  </span>
                  <span>
                    حضور <b>{num(bestTeacher.attendancePct)}٪</b>
                  </span>
                  <span>{bestTeacher.tracks.join("، ")}</span>
                </div>
              </>
            ) : (
              <div className="pr-star-name muted">— لا توجد بيانات كافية —</div>
            )}
          </div>
        </div>
        <p className="pr-closing">﴿وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ﴾</p>
      </div>

      {/* ── Page 2: halqas + teachers ── */}
      <div className="pr-page" dir="rtl">
        <Header {...head} page={2} />
        <h2 className="pr-h2">📊 ترتيب الحلقات حسب متوسط التقييم</h2>
        <Bars
          rows={rankedTracks.slice(0, 10).map((t) => ({
            label: t.title,
            sub: `${w.count} ${num(t.students)} · حضور ${num(t.attendancePct)}٪`,
            value: t.avg10,
            display: `${num(t.avg10)}/١٠`,
          }))}
        />
        {data.tracks.length > rankedTracks.length && (
          <p className="pr-note">
            حلقات لم تُرتَّب لقلة التقييمات في الفترة:{" "}
            {data.tracks
              .filter((t) => !t.ranked)
              .map((t) => t.title)
              .join("، ")}
          </p>
        )}

        <h2 className="pr-h2">{w.teachers}</h2>
        <table className="pr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>الحلقات</th>
              <th>{w.students}</th>
              <th>متوسط التقييم</th>
              <th>الحضور</th>
            </tr>
          </thead>
          <tbody>
            {rankedTeachers.slice(0, 10).map((t, i) => (
              <tr key={t.id} className={i < 3 ? "top" : ""}>
                <td>{i < 3 ? MEDALS[i] : num(i + 1)}</td>
                <td>
                  <b>{t.name}</b>
                </td>
                <td>{t.tracks.join("، ")}</td>
                <td>{num(t.students)}</td>
                <td>
                  <b>{num(t.avg10)}</b>/١٠
                </td>
                <td>{num(t.attendancePct)}٪</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Page 3: top students + halqa champions ── */}
      <div className="pr-page" dir="rtl">
        <Header {...head} page={3} />
        <h2 className="pr-h2">{w.board}</h2>
        <table className="pr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{w.student}</th>
              <th>الحلقة</th>
              <th>النقاط</th>
              <th>المتوسط</th>
              <th>الحضور</th>
            </tr>
          </thead>
          <tbody>
            {top.map((s, i) => (
              <tr key={s.id} className={topRanks[i] <= 3 ? "top" : ""}>
                <td>{topRanks[i] <= 3 ? MEDALS[topRanks[i] - 1] : num(topRanks[i])}</td>
                <td>
                  <b>{s.name}</b>
                </td>
                <td>{s.trackTitle}</td>
                <td>
                  <b>{num(s.points)}</b>
                </td>
                <td>{num(s.avg10)}/١٠</td>
                <td>{num(s.attendancePct)}٪</td>
              </tr>
            ))}
          </tbody>
        </table>

        {champions.length > 0 && (
          <>
            <h2 className="pr-h2">🏅 أبطال الحلقات</h2>
            <div className="pr-champs">
              {champions.map((t) => (
                <div key={t.id} className="pr-champ">
                  <span>{t.title}</span>
                  <b>{t.champion}</b>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="pr-closing">
          «خيركم من تعلّم القرآن وعلّمه» — بارك الله في الجهود، وإلى مزيد من التميّز.
        </p>
      </div>
    </>
  );
}
