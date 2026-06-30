import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "../../lib/api";

export type HifzEntry = {
  _id: string;
  student: string;
  surah: string;
  surahNumber: number;
  status: "مكتمل" | "جارٍ" | "لم يبدأ";
  completionDate?: string;
  notes?: string;
};

type ListResponse = { success: boolean; count: number; data: HifzEntry[] };
type SingleResponse = { success: boolean; data: HifzEntry };

export function useHifz(studentId: string | undefined) {
  return useQuery({
    queryKey: ["hifz", studentId],
    queryFn: () => get<ListResponse>(`/hifz/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useUpsertHifz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      student: string;
      surah: string;
      surahNumber: number;
      status: string;
      notes?: string;
    }) => post<SingleResponse>("/hifz", body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["hifz", vars.student] });
      qc.invalidateQueries({ queryKey: ["students", vars.student] });
    },
  });
}

export function useDeleteHifz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/hifz/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hifz"] }),
  });
}
