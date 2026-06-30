import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { StatsRow } from "../../components/common/StatsRow";
import { ProgressBar } from "../../components/common/ProgressBar";

const MY_POINTS = 740;
const NEXT_LEVEL = 1000;

const LEADERBOARD = [
  { rank: 1, name: "عبدالله الحميداني",  pts: 740, initials: "عح" },
  { rank: 2, name: "يوسف الشمري",        pts: 680, initials: "يش" },
  { rank: 3, name: "محمد القحطاني",      pts: 620, initials: "مق" },
  { rank: 4, name: "عمر العتيبي",        pts: 550, initials: "عع" },
  { rank: 5, name: "خالد الدوسري",       pts: 490, initials: "خد" },
];

const HISTORY = [
  { date: "اليوم",    reason: "واجب يومي",              pts: "+٨٥٠" },
  { date: "أمس",     reason: "تقييم ممتاز من الأستاذ", pts: "+٦٠٠" },
  { date: "الأحد",   reason: "حضور منتظم",              pts: "+١٠٠" },
  { date: "السبت",   reason: "حفظ جزء جديد",           pts: "+٢٠٠" },
];

export function StudentPoints() {
  useTopbar("ti-star", "نقاطي والمتصدرون", <></>);

  const pct = Math.round((MY_POINTS / NEXT_LEVEL) * 100);

  return (
    <>
      <StatsRow
        items={[
          { num: String(MY_POINTS), label: "نقطة مكتسبة",         icon: "ti-star" },
          { num: `${NEXT_LEVEL - MY_POINTS}`, label: "نقطة للمستوى التالي", icon: "ti-arrow-up", variant: "gold" },
          { num: "١", label: "مرتبتك في الحلقة", icon: "ti-trophy", variant: "blue" },
          { num: "نجم ⭐", label: "مستواك الحالي", icon: "ti-award" },
        ]}
      />

      <Card icon="ti-chart-bar" title={`مسار النقاط — المستوى التالي: ${NEXT_LEVEL}`}>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "var(--text2)" }}>{MY_POINTS} / {NEXT_LEVEL} نقطة</span>
          <span style={{ fontWeight: 700, color: "var(--green)" }}>{pct}٪</span>
        </div>
        <ProgressBar pct={pct} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card icon="ti-trophy" title="المتصدرون — حلقتي">
          {LEADERBOARD.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderTop: i ? "1px solid var(--border)" : undefined,
                background: r.name === "عبدالله الحميداني" ? "var(--green-pale)" : undefined,
                borderRadius: 6,
                paddingRight: r.name === "عبدالله الحميداني" ? 8 : undefined,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--text3)", minWidth: 22 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${r.rank}`}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>
                {r.initials}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: r.name === "عبدالله الحميداني" ? 700 : undefined }}>{r.name}</span>
              <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: 13 }}>{r.pts}</span>
            </div>
          ))}
        </Card>

        <Card icon="ti-clock" title="آخر النقاط المكتسبة">
          {HISTORY.map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderTop: i ? "1px solid var(--border)" : undefined,
              }}
            >
              <span style={{ color: "var(--text3)", fontSize: 11, minWidth: 42 }}>{h.date}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{h.reason}</span>
              <span style={{ fontWeight: 700, color: "var(--green)", fontSize: 13 }}>{h.pts}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
