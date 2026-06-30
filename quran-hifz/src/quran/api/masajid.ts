import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "../../lib/api";

export type Masjid = {
  _id: string;
  name: string;
  location: string;
  halqat?: { _id: string; name: string; studentCount?: number }[];
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
    mutationFn: (body: { name: string; location: string }) => post<SingleResponse>("/masajid", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masajid"] }),
  });
}

export function useUpdateMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; location?: string }) =>
      put<SingleResponse>(`/masajid/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masajid"] }),
  });
}
