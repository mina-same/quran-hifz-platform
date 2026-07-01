import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export type ParentChild = {
  _id: string;
  name: string;
  path: string;
  halqa: { _id: string; name: string } | string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
};

export type ChildHifzEntry = {
  _id: string;
  surah: string;
  surahNumber: number;
  status: 'مكتمل' | 'جارٍ' | 'لم يبدأ';
  completionDate?: string;
  notes?: string;
};

export type ChildAttendanceRecord = {
  _id: string;
  date: string;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
};

export type ChildHomework = {
  _id: string;
  type: string;
  segment: string;
  dueDate: string;
  submittedAt?: string;
  status: 'مراجع' | 'معلق' | 'متأخر';
  rating?: string;
  notes?: string;
};

export type ChildGroupHomework = {
  _id: string;
  title: string;
  dueDate: string;
};

export type ChildRecording = {
  _id: string;
  teacher: { _id: string; name: string } | string;
  recordedAt: string;
  segment?: string;
  notes?: string;
};

export type ChildMessage = {
  _id: string;
  sender: { _id: string; name: string; role: string } | string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export function useParentChildren() {
  return useQuery({
    queryKey: ['parent', 'children'],
    queryFn: () => get<{ success: boolean; data: ParentChild[] }>('/parent/children').then((r) => r.data),
  });
}

export function useChildHifz(studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent', 'children', studentId, 'hifz'],
    queryFn: () =>
      get<{ success: boolean; data: ChildHifzEntry[] }>(`/parent/children/${studentId}/hifz`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent', 'children', studentId, 'attendance'],
    queryFn: () =>
      get<{ success: boolean; data: ChildAttendanceRecord[] }>(`/parent/children/${studentId}/attendance`).then(
        (r) => r.data,
      ),
    enabled: !!studentId,
  });
}

export function useChildHomework(studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent', 'children', studentId, 'homework'],
    queryFn: () =>
      get<{ success: boolean; data: { individual: ChildHomework[]; group: ChildGroupHomework[] } }>(
        `/parent/children/${studentId}/homework`,
      ).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildRecordings(studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent', 'children', studentId, 'recordings'],
    queryFn: () =>
      get<{ success: boolean; data: ChildRecording[] }>(`/parent/children/${studentId}/recordings`).then(
        (r) => r.data,
      ),
    enabled: !!studentId,
  });
}

export function useChildMessages(studentId: string | undefined) {
  return useQuery({
    queryKey: ['parent', 'children', studentId, 'messages'],
    queryFn: () =>
      get<{ success: boolean; data: ChildMessage[] }>(`/parent/children/${studentId}/messages`).then((r) => r.data),
    enabled: !!studentId,
  });
}
