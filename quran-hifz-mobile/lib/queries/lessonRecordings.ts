import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';

export type LessonRecording = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  halqa?: { _id: string; name: string } | string;
  specialTrack?: { _id: string; title: string } | string;
  type: string;
  segment: string;
  points: number;
  teacherNote?: string;
  audioUrl?: string;
  recordedAt: string;
};

export type LessonRecordingFilters = {
  student?: string;
  teacher?: string;
  halqa?: string;
  specialTrack?: string;
};

type ListResponse = { success: boolean; count: number; data: LessonRecording[] };
type SingleResponse = { success: boolean; data: LessonRecording };

function buildQuery(filters: LessonRecordingFilters) {
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.halqa) params.set('halqa', filters.halqa);
  if (filters.specialTrack) params.set('specialTrack', filters.specialTrack);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export function useRecordings(filters: LessonRecordingFilters = {}) {
  return useQuery({
    queryKey: ['lesson-recordings', filters],
    queryFn: () => get<ListResponse>(`/lesson-recordings${buildQuery(filters)}`).then((r) => r.data),
  });
}

export function useCreateRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/lesson-recordings', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-recordings'] }),
  });
}

export function useDeleteRecording() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/lesson-recordings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-recordings'] }),
  });
}
