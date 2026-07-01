import { useTopbar } from "../../context/useTopbar";
import { AyahBar } from "../../components/common/AyahBar";
import { Card } from "../../components/common/Card";
import { StatsRow } from "../../components/common/StatsRow";

const MY_POINTS = 740;

const LEVELS: { label: string; range: string; pct: number; active: boolean }[] = [
  { label: "مبتدئ",    range: "0–200",   pct: 100, active: false },
  { label: "ناشط",     range: "200–450",  pct: 100, active: false },
  { label: "متميز",    range: "450–700",  pct: 100, active: false },
  { label: "نجم ⭐",   range: "700–1000", pct: 57,  active: true  },
  { label: "حافظ 🏆",  range: "1000+",    pct: 0,   active: false },
];

const HISTORY = [
  { date: "اليوم",    text: "واجب حفظ جديد — البقرة آيات ٢٤٠-٢٤٥",  pts: "+٨٠",  tone: "green" },
  { date: "أمس",     text: "واجب مراجعة بعيدة — سورة الكهف",          pts: "+٦٠",  tone: "green" },
  { date: "الاثنين", text: "حضور حلقة الفجر",                           pts: "+٢٠",  tone: "blue"  },
  { date: "الأحد",   text: "تقييم الأستاذ: ممتاز",                     pts: "+١٠٠", tone: "gold"  },
  { date: "السبت",   text: "واجب تحسين تلاوة",                          pts: "+٥٠",  tone: "green" },
  { date: "الخميس",  text: "حضور حلقة الفجر",                           pts: "+٢٠",  tone: "blue"  },
  { date: "الأربعاء",text: "واجب حفظ جديد",                             pts: "+٨٠",  tone: "green" },
];

export function StudentPoints() {
  useTopbar("ti-star", "نقاطي ومستواي");

  return (
    <>
      <AyahBar />
      <StatsRow
        items={[
          { num: String(MY_POINTS), label: "إجمالي النقاط",       icon: "ti-star",      variant: "gold" },
          { num: "٣",               label: "أسابيع متتالية",       icon: "ti-trophy" },
          { num: "١٢",              label: "واجب مسلَّم",           icon: "ti-microphone", variant: "blue" },
          { num: "نجم",             label: "المستوى الحالي",        icon: "ti-award" },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 18 }}>
        <Card icon="ti-chart-bar" title="المستويات">
          <div style={{ fontSize: 13 }}>
            {LEVELS.map((lv) => (
              <div
                key={lv.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  padding: 8,
                  borderRadius: 8,
                  background: lv.active ? "var(--gold-pale, #fef9ec)" : "var(--cream, #f9f6f2)",
                }}
              >
                <span
                  style={{
                    minWidth: 70,
                    fontSize: 12,
                    fontWeight: lv.active ? 700 : undefined,
                    color: lv.active ? "var(--brown, #7c5c2a)" : undefined,
                  }}
                >
                  {lv.label}
                </span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${lv.pct}%`,
                      background: lv.active ? "var(--gold)" : undefined,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "var(--text2)", minWidth: 65, textAlign: "right" }}>
                  {lv.range}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card icon="ti-history" title="تاريخ النقاط">
          <div style={{ fontSize: 12 }}>
            {HISTORY.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text3)", fontSize: 11, minWidth: 52 }}>{h.date}</span>
                <span style={{ flex: 1 }}>{h.text}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      h.tone === "gold" ? "var(--gold)" :
                      h.tone === "blue" ? "var(--text2)" :
                      "var(--green)",
                  }}
                >
                  {h.pts}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
