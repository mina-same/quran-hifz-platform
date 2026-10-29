import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "../../lib/api";
import type { GenderScope } from "../lib/genderScope";
import type { BadgeTone } from "../components/common/Badge";
import { todayKey } from "../lib/dailyReport";

export type KpiStatus = "achieved" | "near" | "below" | "nodata";

/** One indicator, computed by the server from this month's real records. */
export type Kpi = {
  _id: string;
  key: string;
  indicator: string;
  /** How the value is computed. */
  hint: string;
  value: number | null;
  target: string;
  actual: string;
  status: KpiStatus;
  /** 0–100: progress toward the target. */
  progress: number;
  rating: "ممتاز" | "جيد" | "مقبول" | "ضعيف";
};

export const KPI_STATUS: Record<KpiStatus, { label: string; tone: BadgeTone; icon: string; color: string }> = {
  achieved: { label: "محقق", tone: "green", icon: "ti-circle-check", color: "var(--green)" },
  near: { label: "قريب من الهدف", tone: "gold", icon: "ti-progress", color: "#b7791f" },
  below: { label: "دون الهدف", tone: "red", icon: "ti-alert-triangle", color: "#c0392b" },
  nodata: { label: "لا توجد بيانات", tone: "gray", icon: "ti-database-off", color: "var(--text3)" },
};

type ListResponse = { success: boolean; count: number; data: Kpi[] };
type SingleResponse = { success: boolean; data: Kpi };

/** This month's indicators for the caller's scope (optionally one gender section). */
export function useKpis(gender?: GenderScope) {
  const params = new URLSearchParams({ today: todayKey() });
  if (gender && gender !== "all") params.set("gender", gender);
  return useQuery({
    queryKey: ["kpis", gender ?? "all", params.get("today")],
    queryFn: () => get<ListResponse>(`/kpis?${params}`).then((r) => r.data),
  });
}

export function useCreateKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Kpi, "_id">) => post<SingleResponse>("/kpis", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpis"] }),
  });
}

export function useUpdateKpi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<Kpi, "_id">>) =>
      put<SingleResponse>(`/kpis/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kpis"] }),
  });
}
