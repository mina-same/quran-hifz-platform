import type { ReactNode, CSSProperties } from "react";

type Tone = "info" | "success" | "warning" | "danger";
const ICONS: Record<Tone, string> = {
  info: "ti-info-circle",
  success: "ti-circle-check",
  warning: "ti-alert-circle",
  danger: "ti-alert-octagon",
};

export function Alert({
  tone,
  icon,
  children,
  style,
}: {
  tone: Tone;
  icon?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className={`alert alert-${tone}`} style={style}>
      <i className={`ti ${icon ?? ICONS[tone]}`} />
      <div>{children}</div>
    </div>
  );
}
