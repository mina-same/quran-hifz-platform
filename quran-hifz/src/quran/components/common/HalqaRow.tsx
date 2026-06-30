import type { ReactNode, CSSProperties } from "react";

export function HalqaRow({
  label,
  value,
  valueStyle,
}: {
  label: ReactNode;
  value: ReactNode;
  valueStyle?: CSSProperties;
}) {
  return (
    <div className="halqa-row">
      <span className="lbl">{label}</span>
      <span className="val" style={valueStyle}>{value}</span>
    </div>
  );
}
