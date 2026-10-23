import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { ScopeTabs } from "../../components/common/ScopeTabs";
import { Alert } from "../../components/common/Alert";
import { SkeletonList } from "../../components/common/Skeleton";
import {
  useMyRanking,
  PERIOD_LABEL,
  type MyRankRow,
  type MyRanking,
  type RankPeriod,
} from "../../api/rankings";
import { toAr } from "../../../lib/format";

const MEDALS = ["🥇", "🥈", "🥉"];

/** 2.5 → «٢٫٥». */
function num(n: number): string {
  return toAr(Number.isInteger(n) ? n : Number(n.toFixed(1))).replace(".", "٫");
}

/** «نقطة / نقطتان / نقاط / نقطة» — Arabic counted-noun agreement for points. */
function pointsWord(n: number): string {
  if (!Number.isInteger(n)) return "نقطة";
  if (n === 2) return "نقطتان";
  return n >= 3 && n <= 10 ? "نقاط" : "نقطة";
}

/** A short, encouraging line for where the student stands in their halqa. */
function cheer(r: MyRanking): string {
  const { rankInTrack, points } = r.me;
  if (points === 0) return "ابدأ رحلتك اليوم — كل يوم تحضر فيه وتُقيَّم يضيف إلى نقاطك 🌱";
  if (rankInTrack === 1) return "ما شاء الله! أنت في صدارة حلقتك — حافظ على مكانك 🏆";
  if (rankInTrack <= 3) return "أنت من الثلاثة الأوائل في حلقتك — خطوة واحدة نحو الصدارة 🌟";
  const above = r.track.filter((x) => x.points > points);
  const next = above.length ? Math.min(...above.map((x) => x.points)) : null;
  if (next !== null)
    return `تحتاج ${num(next - points)} ${pointsWord(next - points)} لتتقدّم مركزاً في حلقتك — أنت قادر بإذن الله 💪`;
  return "واصل التقدّم، فالمنافسة في الخير محمودة 💪";
}

function RankList({
  title,
  icon,
  rows,
  mine,
}: {
  title: string;
  icon: string;
  rows: MyRankRow[];
  mine: { rank: number; points: number; inList: boolean };
}) {
  return (
    <section className="card slb-card">
      <h3 className="slb-title">
        <i className={`ti ${icon}`} /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="slb-empty">لا توجد نقاط مسجّلة في هذه الفترة بعد</p>
      ) : (
        <ol className="slb-list">
          {rows.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className={`${r.me ? "me" : ""} ${r.rank <= 3 ? "top" : ""}`}
            >
              <span className="slb-rank">{r.rank <= 3 ? MEDALS[r.rank - 1] : num(r.rank)}</span>
              <span className="slb-name">
                <b>
                  {r.name}
                  {r.me && <em> (أنت)</em>}
                </b>
                <small>{r.trackTitle}</small>
              </span>
              <span className="slb-points">
                {num(r.points)}
                <small> {pointsWord(r.points)}</small>
              </span>
            </li>
          ))}
          {!mine.inList && (
            <li className="me gap">
              <span className="slb-rank">{num(mine.rank)}</span>
              <span className="slb-name">
                <b>أنت</b>
              </span>
              <span className="slb-points">
                {num(mine.points)}
                <small> {pointsWord(mine.points)}</small>
              </span>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}

/**
 * «لوحة الشرف» for students: their points (sum of daily grades) and rank in
 * their halqa and in their whole section (boys or girls), to encourage them.
 */
export function StudentLeaderboard() {
  const [period, setPeriod] = useState<RankPeriod>("month");
  const { data, isLoading, isError, error } = useMyRanking(period);
  useTopbar("ti-trophy", "لوحة الشرف");

  return (
    <div className="slb-page">
      <ScopeTabs
        value={period}
        onChange={(v) => setPeriod(v as RankPeriod)}
        options={(["week", "month", "all"] as const).map((p) => ({
          value: p,
          label: PERIOD_LABEL[p],
        }))}
      />

      {isError && <Alert tone="danger">{(error as Error).message}</Alert>}

      {isLoading || !data ? (
        !isError && (
          <>
            <div className="slb-hero skeleton" aria-label="جارٍ التحميل">
              <span className="skl" style={{ width: 120, height: 48 }} />
              <span className="skl" style={{ width: 220, height: 14 }} />
              <div className="slb-hero-ranks">
                <span className="skl" style={{ height: 64 }} />
                <span className="skl" style={{ height: 64 }} />
              </div>
            </div>
            <div className="slb-grid">
              <div className="card slb-card">
                <SkeletonList rows={6} />
              </div>
              <div className="card slb-card">
                <SkeletonList rows={6} />
              </div>
            </div>
          </>
        )
      ) : (
        <>
          <div className="slb-hero">
            <div className="slb-hero-points">
              <b>{num(data.me.points)}</b>
              <span>
                {pointsWord(data.me.points)} · {PERIOD_LABEL[period]}
              </span>
            </div>
            <p className="slb-cheer">{cheer(data)}</p>
            <div className="slb-hero-ranks">
              <div>
                <b>
                  {num(data.me.rankInTrack)}
                  <small> من {num(data.me.trackSize)}</small>
                </b>
                <span>ترتيبك في حلقتك</span>
              </div>
              <div>
                <b>
                  {num(data.me.rankInSection)}
                  <small> من {num(data.me.sectionSize)}</small>
                </b>
                <span>ترتيبك بين كل الحلقات</span>
              </div>
            </div>
          </div>

          <div className="slb-grid">
            <RankList
              title={`أوائل حلقتك — ${data.me.trackTitle}`}
              icon="ti-users"
              rows={data.track}
              mine={{
                rank: data.me.rankInTrack,
                points: data.me.points,
                inList: data.track.some((r) => r.me),
              }}
            />
            <RankList
              title="أوائل كل الحلقات"
              icon="ti-world"
              rows={data.section}
              mine={{
                rank: data.me.rankInSection,
                points: data.me.points,
                inList: data.section.some((r) => r.me),
              }}
            />
          </div>
          <p className="slb-note">
            <i className="ti ti-info-circle" /> النقاط = مجموع درجات تقييمك اليومي في الفترة؛ الحضور
            المنتظم والإتقان يرفعانها.
          </p>
        </>
      )}
    </div>
  );
}
