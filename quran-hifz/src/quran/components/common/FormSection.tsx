import type { ReactNode } from "react";

export function FormSection({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        marginBottom: 12, paddingBottom: 8,
        borderBottom: "1px solid var(--border)",
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--green)", fontSize: 14 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
