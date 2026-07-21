import { useState } from "react";
import { useTopbar } from "../../context/useTopbar";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";

const MY_POINTS = 740;

const ITEMS = [
  { id: 1, name: "كتاب تجويد مُصوَّر",     pts: 200, icon: "ti-book",      available: true },
  { id: 2, name: "مسبحة إلكترونية",        pts: 350, icon: "ti-circle",    available: true },
  { id: 3, name: "قلم تخطيط للمصحف",      pts: 150, icon: "ti-pencil",    available: true },
  { id: 4, name: "دروع تقدير من الإدارة", pts: 500, icon: "ti-award",     available: true },
  { id: 5, name: "اشتراك رحلة ترفيهية",   pts: 700, icon: "ti-map-pin",   available: MY_POINTS >= 700 },
  { id: 6, name: "شهادة تميز مُذهَّبة",    pts: 900, icon: "ti-certificate", available: MY_POINTS >= 900 },
];

export function StudentStore() {
  const [redeemed, setRedeemed] = useState<number | null>(null);

  useTopbar("ti-gift", "متجر المكافآت", <></>);

  function handleRedeem(id: number, pts: number) {
    if (pts > MY_POINTS) return;
    setRedeemed(id);
    setTimeout(() => setRedeemed(null), 4000);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: 18 }}>
        <i className="ti ti-star" style={{ fontSize: 24, color: "var(--gold)" }} />
        <div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>رصيدك الحالي</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>{MY_POINTS} نقطة</div>
        </div>
      </div>

      {redeemed !== null && (
        <Alert tone="success">
          تم الاستبدال بنجاح! سيتواصل معك الأستاذ لتسليم المكافأة ✓
        </Alert>
      )}

      <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {ITEMS.map((item) => {
          const canAfford = MY_POINTS >= item.pts;
          return (
            <Card key={item.id} icon={item.icon} title={item.name}>
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 40, color: canAfford ? "var(--gold)" : "var(--text3)", marginBottom: 8, display: "block" }} />
                <div style={{ fontSize: 20, fontWeight: 700, color: canAfford ? "var(--green)" : "var(--text3)", marginBottom: 12 }}>
                  {item.pts} نقطة
                </div>
                <button
                  className={`topbar-btn ${canAfford ? "btn-primary" : "btn-ghost"}`}
                  style={{ width: "100%", justifyContent: "center", fontSize: 12, opacity: canAfford ? 1 : 0.5 }}
                  disabled={!canAfford}
                  onClick={() => handleRedeem(item.id, item.pts)}
                >
                  {canAfford ? "استبدال" : `تحتاج ${item.pts - MY_POINTS} نقطة`}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
