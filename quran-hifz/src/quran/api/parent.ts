import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import type { AttendanceRecord } from "./attendance";
import type { HifzEntry } from "./hifz";
import type { Homework } from "./homework";
import type { Message } from "./messages";

export type ParentChild = {
  _id: string;
  name: string;
  path: string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  halqa: { _id: string; name: string } | string;
};

export type ChildRecording = {
  _id: string;
  type: string;
  segment: string;
  points: number;
  teacherNote?: string;
  recordedAt: string;
  teacher: { _id: string; name: string } | string;
};

export type ChildHomework = {
  individual: Homework[];
  group: { _id: string; title: string; description: string; dueDay: string; dueDate: string }[];
};

type ListResponse<T> = { success: boolean; data: T };

export function useParentChildren() {
  return useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => get<ListResponse<ParentChild[]>>("/parent/children").then((r) => r.data),
  });
}

export function useChildHifz(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent", "hifz", studentId],
    queryFn: () => get<ListResponse<HifzEntry[]>>(`/parent/children/${studentId}/hifz`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent", "attendance", studentId],
    queryFn: () => get<ListResponse<AttendanceRecord[]>>(`/parent/children/${studentId}/attendance`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildHomework(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent", "homework", studentId],
    queryFn: () => get<ListResponse<ChildHomework>>(`/parent/children/${studentId}/homework`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildRecordings(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent", "recordings", studentId],
    queryFn: () => get<ListResponse<ChildRecording[]>>(`/parent/children/${studentId}/recordings`).then((r) => r.data),
    enabled: !!studentId,
  });
}

export function useChildMessages(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent", "messages", studentId],
    queryFn: () => get<ListResponse<Message[]>>(`/parent/children/${studentId}/messages`).then((r) => r.data),
    enabled: !!studentId,
  });
}
