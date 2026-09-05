import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

export type Masjid = {
  _id: string;
  name: string;
  location: string;
  gender: "male" | "female";
  /** The server's `getMasajid`/`getMasjid` select this exact field set — no
   * `studentCount` here (unlike `Track` from `api/tracks.ts`, whose list
   * endpoint computes it separately) — don't assume it's present. */
  tracks?: { _id: string; title: string; daysPerWeek: string; timeSlot: string; maxStudents: number; status: "active" | "upcoming" | "ended" }[];
};

type ListResponse = { success: boolean; count: number; data: Masjid[] };
type SingleResponse = { success: boolean; data: Masjid };

export function useMasajid() {
  return useQuery({
    queryKey: ["masajid"],
    queryFn: () => get<ListResponse>("/masajid").then((r) => r.data),
  });
}

export function useMasjid(id: string | undefined) {
  return useQuery({
    queryKey: ["masajid", id],
    queryFn: () => get<SingleResponse>(`/masajid/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; location: string; gender: "male" | "female" }) => post<SingleResponse>("/masajid", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masajid"] }),
  });
}

export function useUpdateMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; location?: string; gender?: "male" | "female" }) =>
      put<SingleResponse>(`/masajid/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masajid"] }),
  });
}

export function useDeleteMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/masajid/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masajid"] }),
  });
}
