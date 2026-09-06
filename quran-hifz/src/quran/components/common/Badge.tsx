import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "green" | "gold" | "blue" | "red" | "brown" | "gray";

export function Badge({
  children,
  tone = "green",
  style,
}: {
  children?: ReactNode;
  tone?: BadgeTone;
  style?: CSSProperties;
}) {
  return <span className={`badge badge-${tone}`} style={style}>{children}</span>;
}
