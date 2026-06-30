import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "../../lib/api";

export type Kpi = {
  _id: string;
  indicator: string;
  target: string;
  actual: string;
  rating: "ممتاز" | "جيد" | "مقبول" | "ضعيف";
  period: string;
};

type ListResponse = { success: boolean; count: number; data: Kpi[] };
type SingleResponse = { success: boolean; data: Kpi };

export function useKpis() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: () => get<ListResponse>("/kpis").then((r) => r.data),
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
