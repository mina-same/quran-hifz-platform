import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../lib/api";

/** One student line in the daily halqa report. */
export type ReportLine = { student: string; name: string; area?: string; note?: string };

/** «التقرير اليومي للحلقة» — sent by the teacher after the session. */
export type DailyReport = {
  _id?: string;
  track: string;
  date: string;
  trackTitle: string;
  masjidName: string;
  teacherName?: string;
  struggling: ReportLine[];
  absent: ReportLine[];
  excused: ReportLine[];
  presentCount: number;
  totalCount: number;
  notes?: string;
  updatedAt?: string;
};

type DraftResponse = {
  success: boolean;
  /** False when nothing was recorded for that day yet (attendance/evaluation). */
  recorded: boolean;
  saved: DailyReport | null;
  draft: DailyReport;
  students: { _id: string; name: string }[];
};

export function useDailyReportDraft(track: string | undefined, date: string) {
  return useQuery({
    queryKey: ["daily-report-draft", track ?? "", date],
    queryFn: () => get<DraftResponse>(`/daily-reports/draft?track=${track}&date=${date}`),
    enabled: !!track && !!date,
  });
}

export function useSendDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<DailyReport, "_id" | "trackTitle" | "masjidName" | "teacherName" | "updatedAt">) =>
      post<{ success: boolean; data: DailyReport }>("/daily-reports", body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-reports"] });
      qc.invalidateQueries({ queryKey: ["daily-report-draft"] });
    },
  });
}

export function useDailyReports(filter: { date?: string; from?: string; to?: string; track?: string }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v) params.set(k, v);
  return useQuery({
    queryKey: ["daily-reports", params.toString()],
    queryFn: () => get<{ success: boolean; data: DailyReport[] }>(`/daily-reports?${params}`).then((r) => r.data),
  });
}
