import { useParentChildren } from "../api/parent";
import { useParentContext } from "../context/ParentContext";
import type { ParentChild } from "../api/parent";

const LOGO_SRC = "/quran/logo.png";

export function ChildSelector({ onBack }: { onBack: () => void }) {
  const { data: children, isLoading, isError } = useParentChildren();
  const { setActiveChild } = useParentContext();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--green)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "var(--font-cairo, Cairo, sans-serif)",
        overflow: "auto",
        padding: "32px 16px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img
          src={LOGO_SRC}
          alt="شعار"
          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 14 }}
        />
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
          الجمعية الخيرية لتحفيظ القرآن
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 6 }}>
          اختر ابنك لمتابعة أدائه
        </div>
      </div>

      {isLoading && (
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
          <i className="ti ti-loader-2" style={{ marginLeft: 8, animation: "spin 1s linear infinite" }} />
          جارٍ التحميل...
        </div>
      )}

      {isError && (
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center" }}>
          فشل تحميل قائمة الأبناء. تحقق من الاتصال وأعد المحاولة.
        </div>
      )}

      {children && children.length === 0 && (
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>
          لا يوجد طلاب مرتبطون بحسابك.
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 720 }}>
        {(children ?? []).map((child: ParentChild) => {
          const halqaName = typeof child.halqa === "object" ? child.halqa.name : child.halqa;
          const initials = child.name.slice(0, 2);
          return (
            <div
              key={child._id}
              onClick={() => setActiveChild(child)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: "28px 24px",
                width: 200,
                textAlign: "center",
                cursor: "pointer",
                color: "white",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--gold)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                  margin: "0 auto 12px",
                }}
              >
                {initials}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{child.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginBottom: 9 }}>{child.path}</div>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: 6,
                  fontSize: 12,
                }}
              >
                {child.progressPages} صفحة &bull; {child.attendancePct}٪ حضور
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>{halqaName}</div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 28,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.35)",
          color: "rgba(255,255,255,0.85)",
          padding: "9px 22px",
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
        }}
      >
        ← العودة للبوابات
      </button>
    </div>
  );
}
