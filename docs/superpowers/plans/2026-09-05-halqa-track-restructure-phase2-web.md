# Halqa/Track Restructure — Phase 2 (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `quran-hifz` web app in line with the already-shipped Phase 1 server contract (Halqa deleted, Masjid gained `gender`, SpecialTrack renamed Track with a required `masjid`, every context-carrying model collapsed to a single `track` field) — no new features, no UI behavior beyond removing the halqa/specialTrack duality.

**Architecture:** Mechanical translation of a locked server contract onto the web layer: rename the API modules and their types, simplify `ContextPicker` from a two-kind union to a single kind, rename the Track CRUD pages, and update every screen that read `halqa`/`specialTrack` fields to read `track` instead. Two API files not identified during design (`api/students.ts`, and the trio `api/attendance.ts`/`api/evaluations.ts`/`api/group-homework.ts`) were found during planning to carry their own `halqa?`/`specialTrack?` pairs mirroring the server's now-collapsed fields — they are included here as Task 2.

**Tech Stack:** React 18, TanStack Query v5, TypeScript strict mode, hand-rolled CSS (no Tailwind), Vite.

**Spec:** `docs/superpowers/specs/2026-09-05-halqa-track-restructure-phase2-web-design.md` — read alongside this plan. Background research: `docs/superpowers/specs/2026-09-04-halqa-track-phase2-web-research.md`.

## Global Constraints

- No new features. Every change exists to consume the Phase 1 server contract or remove now-dead halqa/specialTrack duality — nothing else.
- Single-track-per-student: never build UI that lets a student appear on more than one track.
- Keep `useCreateTrack`/`useUpdateTrack`/`useDeleteTrack` hook names exactly as they already are — only their body/response types change shape.
- Mobile (`quran-hifz-mobile`) is out of scope — Phase 3, separate plan.
- Grading logic and the same-day multi-segment scheduling internals (`normalizePlanSegments`, `segmentOccurrenceCounts`, `todayAssignment(s)`, `validateSegmentDays`, everything in `lib/quranRange.ts`) are untouched by this phase — do not modify `lib/quranRange.ts`.
- ContextPicker stays a picker grid even for a single context — no auto-skip behavior.
- Route keys `special_tracks`/`specialtracks` (admin/teacher/student) rename to `tracks` for consistency with the server-side rename; `halqat` (admin) and `myhalqa` (teacher) route keys are removed entirely.
- Server response shapes already shipped and must be matched exactly: `Track` has `masjid` (required), no `location`, no `enrolledStudents`; `GET /api/tracks` list responses include a computed `studentCount`; `Masjid` list/get responses include `tracks` (not `halqat`); `Student.track` is populated as `{_id, title, daysPerWeek?, timeSlot?, masjid: {_id, name, location, gender}}` (double-populated) or a bare string id.

---

### Task 1: Track/Halqa API modules

**Files:**
- Delete: `quran-hifz/src/quran/api/halqat.ts`
- Delete: `quran-hifz/src/quran/api/special-tracks.ts`
- Create: `quran-hifz/src/quran/api/tracks.ts`
- Modify: `quran-hifz/src/quran/api/quran-plans.ts`

**Interfaces:**
- Produces: `Track` type, `TrackTeacher` type, `TrackMasjid` type, `TRACK_DETAIL_ID_KEY` constant, `useTracks(status?, teacherId?)`, `useTrack(id?)`, `useCreateTrack()`, `useUpdateTrack()`, `useDeleteTrack()`, `useAssignStudent()` — all consumed by every later task in this plan.
- Produces (from `quran-plans.ts`): `QuranPlan.targetType: "track" | "students"`, `QuranPlan.track?: PlanTrack | string` (replaces `halqa`/`specialTrack`), `PlanTrack` type (replaces `PlanHalqa`/`PlanSpecialTrack`), `PlanFormHandoff` with only `trackId?: string` (the `halqaId?` field is dropped — the type already carried an unused `trackId?` from an earlier phase's prep work, so this task finishes that migration), `useQuranPlans(filters: { teacher?; track?; student? })`.

- [ ] **Step 1: Delete `api/halqat.ts`**

```bash
rm quran-hifz/src/quran/api/halqat.ts
```

- [ ] **Step 2: Delete `api/special-tracks.ts`**

```bash
rm quran-hifz/src/quran/api/special-tracks.ts
```

- [ ] **Step 3: Create `api/tracks.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "../../lib/api";

/** sessionStorage key used to hand off "open this track's detail page" from the
 * Tracks list to TeacherTrackDetail, which reads it on mount to know which
 * track to show (the hash-based router has no room for per-page params). */
export const TRACK_DETAIL_ID_KEY = "qh_track_detail_id";

export type TrackTeacher = { _id: string; name: string };
export type TrackMasjid  = { _id: string; name: string; location?: string; gender: "male" | "female" };

export type Track = {
  _id: string;
  masjid: TrackMasjid | string;
  title: string;
  type: string;
  status: "active" | "upcoming" | "ended";
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  timeSlot: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: (TrackTeacher | string)[];
  maxStudents: number;
  notes?: string;
  /** Computed server-side (`Student.countDocuments({track})`) — present on
   * every `useTracks` list response, not stored on the document itself. */
  studentCount?: number;
};

type ListResponse   = { success: boolean; count: number; data: Track[] };
type SingleResponse = { success: boolean; data: Track };

export function useTracks(status?: string, teacherId?: string) {
  const params = new URLSearchParams();
  if (status)    params.set("status",  status);
  if (teacherId) params.set("teacher", teacherId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["tracks", status ?? "", teacherId ?? ""],
    queryFn: () => get<ListResponse>(`/tracks${qs}`).then((r) => r.data),
  });
}

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: ["tracks", id],
    queryFn: () => get<SingleResponse>(`/tracks/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>("/tracks", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/tracks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

/** Moves a student onto this track — a transfer, not an addition, since
 * `Student.track` is the student's sole membership (single-track-per-student
 * is intentional; there is no "add without removing from elsewhere"). */
export function useAssignStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      post<SingleResponse>(`/tracks/${id}/assign`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracks"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
```

- [ ] **Step 4: Update `api/quran-plans.ts` types and filters**

Replace lines 14-19 (the handoff type):

```ts
export const PLAN_FORM_HANDOFF_KEY = "qh_plan_form_handoff";
export type PlanFormHandoff =
  | { mode: "create"; trackId?: string }
  | { mode: "edit" | "duplicate"; plan: QuranPlan };
```

Replace lines 28-31 (target types) — remove `PlanHalqa` and `PlanSpecialTrack`, add `PlanTrack`:

```ts
export type PlanTeacher = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanTrack   = { _id: string; title: string };
```

Replace line 69 (`targetType`/`halqa`/`specialTrack` fields):

```ts
  targetType: "track" | "students";
  track?: PlanTrack | string;
  students?: (PlanStudent | string)[];
```

Replace lines 129-140 (`useQuranPlans`):

```ts
export function useQuranPlans(filters?: { teacher?: string; track?: string; student?: string }) {
  const params = new URLSearchParams();
  if (filters?.teacher) params.set("teacher", filters.teacher);
  if (filters?.track)   params.set("track", filters.track);
  if (filters?.student) params.set("student", filters.student);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["quran-plans", filters?.teacher ?? "", filters?.track ?? "", filters?.student ?? ""],
    queryFn: () => get<ListResponse>(`/quran-plans${qs}`).then((r) => r.data),
  });
}
```

- [ ] **Step 5: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: many errors from every file still importing `api/halqat`, `api/special-tracks`, or reading `plan.halqa`/`plan.specialTrack`/`handoff.halqaId` — these are exactly the files the remaining tasks fix. Confirm the errors are ONLY in files this plan's later tasks touch (cross-check against the task list below); anything else is a scope gap to flag in the report.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz/src/quran/api/tracks.ts quran-hifz/src/quran/api/quran-plans.ts
git rm quran-hifz/src/quran/api/halqat.ts quran-hifz/src/quran/api/special-tracks.ts
git commit -m "feat(web): replace halqat/special-tracks API with tracks API"
```

---

### Task 2: Context-field collapse across attendance/evaluations/group-homework/students APIs

**Files:**
- Modify: `quran-hifz/src/quran/api/students.ts`
- Modify: `quran-hifz/src/quran/api/attendance.ts`
- Modify: `quran-hifz/src/quran/api/evaluations.ts`
- Modify: `quran-hifz/src/quran/api/group-homework.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (these are siblings), but every later task consumes this task's `track`-shaped filters/types.
- Produces: `Student.track` (replaces `Student.halqa`+`Student.masjid`), `StudentFilters.track` (replaces `.halqa`+`.specialTrack`; `.masjid` param is KEPT — the server's `getStudents` still accepts `?masjid=` and resolves it to the masjid's tracks server-side), `AttendanceRecord.track`/`AttendanceFilters.track`/`useBulkAttendance` body `.track`, `EvaluationRecord.track`/`EvaluationFilters.track`/`useRubric` ctx `.track`/`useBulkEvaluate` body `.track`, `GroupHomework.track`/`GroupHomeworkFilters.track`.

- [ ] **Step 1: `api/students.ts` — collapse `halqa`+`masjid` to `track`**

Replace lines 4-33 (the `Student` type and `StudentFilters` type):

```ts
export type Student = {
  _id: string;
  name: string;
  path: string;
  level?: number;
  track: {
    _id: string;
    title: string;
    daysPerWeek?: string;
    timeSlot?: string;
    masjid?: { _id: string; name: string; location?: string; gender: "male" | "female" } | string;
  } | string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  guardian: string;
  guardianPhone: string;
  /** Saudi national ID — 10 digits, leading 1 (مواطن) or 2 (مقيم). */
  nationalId?: string;
  lastMemorization: string;
  status: "active" | "inactive" | "new";
  homeworkStatus: "submitted" | "pending" | "late";
  email: string | null;
  parentName: string | null;
  parentEmail: string | null;
};

export type StudentFilters = {
  track?: string;
  masjid?: string;
  status?: string;
  search?: string;
};
```

Replace lines 39-49 (`buildQuery`):

```ts
function buildQuery(filters?: StudentFilters) {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.track) params.set("track", filters.track);
  if (filters.masjid) params.set("masjid", filters.masjid);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const q = params.toString();
  return q ? `?${q}` : "";
}
```

- [ ] **Step 2: `api/attendance.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-26:

```ts
/** sessionStorage key used to hand off "take attendance for this track" from
 * the Tracks page to TeacherAttendance, which reads it on mount and jumps
 * straight to that track's attendance list instead of showing the picker. */
export const ATTENDANCE_PREFILL_TRACK_KEY = "qh_prefill_attendance_track";

export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  day: string;
  time: string;
  status: "حاضر" | "غائب" | "متأخر";
};

export type AttendanceFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};
```

Replace lines 30-40 (`buildQuery`):

```ts
function buildQuery(f?: AttendanceFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.track) p.set("track", f.track);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  const q = p.toString();
  return q ? `?${q}` : "";
}
```

Replace lines 42-48 (`useAttendance`):

```ts
export function useAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ["attendance", filters],
    queryFn: () => get<ListResponse>(`/attendance${buildQuery(filters)}`).then((r) => r.data),
    enabled: !!(filters?.student || filters?.track),
  });
}
```

Replace line 53 (`useRecordAttendance` mutationFn signature):

```ts
    mutationFn: (body: { student: string; track?: string; date: string; status: string }) =>
```

Replace line 72 (`useBulkAttendance` mutationFn signature):

```ts
    mutationFn: (body: { track?: string; date: string; records: { student: string; status: string }[] }) =>
```

- [ ] **Step 3: `api/evaluations.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 13-35:

```ts
export type EvaluationRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher?: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  attendanceStatus: "حاضر" | "غائب";
  criteria?: EvaluationCriterion[];
  /** Absent when the plan's rubric uses custom criteria. */
  scores?: EvaluationScores;
  total: number;
  totalMax?: number;
  note?: string;
};

export type EvaluationFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};
```

Replace lines 39-49 (`buildQuery`):

```ts
function buildQuery(f?: EvaluationFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.student) p.set("student", f.student);
  if (f.track) p.set("track", f.track);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  const q = p.toString();
  return q ? `?${q}` : "";
}
```

Replace lines 90-95 (`useRubric`):

```ts
/** The rubric the evaluation screen should render for a track session. */
export function useRubric(ctx: { track?: string; plan?: string } | undefined) {
  const p = new URLSearchParams();
  if (ctx?.track) p.set("track", ctx.track);
  if (ctx?.plan) p.set("plan", ctx.plan);
```

Replace line 107 (`useBulkEvaluate` mutationFn signature):

```ts
    mutationFn: (body: { teacher: string; track?: string; plan?: string; date: string; records: BulkEvaluateRecord[] }) =>
```

- [ ] **Step 4: `api/group-homework.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-15:

```ts
export type GroupHomework = {
  _id: string;
  track?: { _id: string; title: string } | string;
  teacher: { _id: string; name: string } | string;
  title: string;
  description: string;
  dueDay: string;
  dueDate: string;
};

export type GroupHomeworkFilters = { track?: string };
```

Replace lines 20-27 (`buildQuery`):

```ts
function buildQuery(f?: GroupHomeworkFilters) {
  if (!f) return "";
  const p = new URLSearchParams();
  if (f.track) p.set("track", f.track);
  const q = p.toString();
  return q ? `?${q}` : "";
}
```

- [ ] **Step 5: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: errors remain in every consumer file (fixed by later tasks). Confirm no NEW error categories appear beyond `halqa`/`specialTrack`/`masjid`-on-Student/`h.name`/`h.days`/`h.time`/`h.capacity` references.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz/src/quran/api/students.ts quran-hifz/src/quran/api/attendance.ts quran-hifz/src/quran/api/evaluations.ts quran-hifz/src/quran/api/group-homework.ts
git commit -m "feat(web): collapse halqa/specialTrack fields to track across context APIs"
```

---

### Task 3: ContextPicker simplification + TeacherDashboard consumer

**Files:**
- Modify: `quran-hifz/src/quran/components/common/ContextPicker.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherDashboard.tsx`

**Interfaces:**
- Consumes: `Track`, `useTracks` from Task 1's `api/tracks.ts`.
- Produces: `TeachingContext` (no `kind` field), `trackToContext(t: Track): TeachingContext`, `ContextPicker` component (unchanged props) — consumed by Tasks 9 and 10 (`TeacherAttendance.tsx`, `TeacherGroupHomework.tsx`).

- [ ] **Step 1: Rewrite `ContextPicker.tsx`**

Full replacement:

```tsx
import type { Track } from "../../api/tracks";

/** Unified shape for "teaching context" — always a Track now that Halqa is
 * gone and every track has direct students via `Student.track`. */
export type TeachingContext = {
  id: string;
  title: string;
  subtitle?: string;
  scheduleLabel?: string;
  studentCount?: number;
};

function getName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
  return typeof v === "string" ? v : "";
}

export function trackToContext(t: Track): TeachingContext {
  return {
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? "أونلاين" : getName(t.masjid),
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(" | "),
    studentCount: t.studentCount,
  };
}

/** Grid of selectable context cards (tracks). */
export function ContextPicker({
  contexts,
  onSelect,
  emptyLabel,
  heading,
  actionLabel,
  actionIcon,
}: {
  contexts: TeachingContext[];
  onSelect: (ctx: TeachingContext) => void;
  emptyLabel?: string;
  /** Short line above the grid stating what selecting a card will do (e.g. "اختر المسار لأخذ الحضور"). Keeps otherwise-identical picker screens across pages visually distinguishable. */
  heading?: string;
  /** Overrides the default "اختيار المسار" button text with an action-specific label (e.g. "أخذ الحضور"). */
  actionLabel?: string;
  /** Overrides the button icon (defaults to ti-calendar-event). */
  actionIcon?: string;
}) {
  if (contexts.length === 0) {
    return <div className="page-loading">{emptyLabel ?? "لا توجد مسارات مسجلة"}</div>;
  }

  return (
    <>
      {heading && (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text2)" }}>{heading}</p>
      )}
      <div
        className="grid-collapse"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
      >
        {contexts.map((ctx) => (
          <div
            key={ctx.id}
            className="card"
            style={{
              cursor: "pointer",
              border: "2px solid transparent",
              transition: "border .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            onClick={() => onSelect(ctx)}
          >
            <div className="card-header">
              <div className="card-title">
                <i className="ti ti-calendar-event" /> {ctx.title}
              </div>
            </div>
            {ctx.subtitle && (
              <div className="halqa-row">
                <span className="lbl">المسجد</span>
                <span className="val">{ctx.subtitle}</span>
              </div>
            )}
            {ctx.scheduleLabel && (
              <div className="halqa-row">
                <span className="lbl">المواعيد</span>
                <span className="val" style={{ fontSize: 11 }}>
                  {ctx.scheduleLabel}
                </span>
              </div>
            )}
            <div className="halqa-row">
              <span className="lbl">الطلاب</span>
              <span className="val">{ctx.studentCount ?? "—"} طالب</span>
            </div>
            <button
              className="topbar-btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(ctx);
              }}
            >
              <i className={`ti ${actionIcon ?? "ti-calendar-event"}`} />
              {actionLabel ?? "اختيار المسار"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Update `TeacherDashboard.tsx`'s context-building (lines 8-9, 12, 17-18, 21, 37)**

Replace lines 8-9 and 12 (imports):

```tsx
import { useTracks } from "../../api/tracks";
```

```tsx
import { trackToContext } from "../../components/common/ContextPicker";
```

Replace lines 17-18 (data fetching):

```tsx
  const { data: tracks = [] } = useTracks(undefined, user?.profileId as string | undefined);
```

Replace line 21 (`contexts` construction):

```tsx
  const contexts = tracks.map(trackToContext);
```

Replace line 37's stat label — "حلقاتي ومساراتي" no longer makes sense with Halqa gone:

```tsx
          { num: toAr(contexts.length), label: "مساراتي", icon: "ti-calendar-event", variant: "gold" },
```

Lines 22, 44, 47 (`totalStudents` computation, empty-state check, and `.map()` render) read `contexts` generically and need no change — they were already halqa/track-agnostic.

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `ContextPicker.tsx` and `TeacherDashboard.tsx` no longer error. Errors remain in `TeacherAttendance.tsx`/`TeacherGroupHomework.tsx` (Tasks 9-10).

- [ ] **Step 4: Commit**

```bash
git add quran-hifz/src/quran/components/common/ContextPicker.tsx quran-hifz/src/quran/pages/teacher/TeacherDashboard.tsx
git commit -m "feat(web): simplify ContextPicker to single-kind track picker"
```

---

### Task 4: Rename AdminSpecialTracks.tsx → AdminTracks.tsx

**Files:**
- Delete: `quran-hifz/src/quran/pages/admin/AdminSpecialTracks.tsx`
- Create: `quran-hifz/src/quran/pages/admin/AdminTracks.tsx`

**Interfaces:**
- Consumes: `useTracks`, `useCreateTrack`, `useUpdateTrack`, `useDeleteTrack`, `useAssignStudent`, `TRACK_DETAIL_ID_KEY`, `Track`, `TrackTeacher` from Task 1's `api/tracks.ts`; `useMasajid` (unchanged); `useStudents` (Task 2's `Student`/`StudentFilters`).
- Produces: exported `AdminTracks` component — consumed by Task 17's `pageRegistry.ts`.

This is a full rewrite of the 932-line `AdminSpecialTracks.tsx`, changing: the import (`special-tracks`→`tracks`, `SpecialTrack`→`Track`, drop `EnrolledStudent`), dropping `location`/`enrolledStudents` form fields and the whole students-modal enroll/unenroll UI (replaced by one "نقل طالب" transfer action since a student can only be on one track — there is no "enrolled list" to manage, only "which students point their `track` here", queried live), adding a required `masjid` select, and updating every `t.location`/`t.enrolledStudents` read.

- [ ] **Step 1: Create `AdminTracks.tsx`**

```tsx
import { useState, type CSSProperties } from "react";
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import {
  useTracks, useCreateTrack, useUpdateTrack, useDeleteTrack,
  useAssignStudent,
  TRACK_DETAIL_ID_KEY,
  type Track, type TrackTeacher,
} from "../../api/tracks";
import { useTeachers } from "../../api/teachers";
import { useMasajid } from "../../api/masajid";
import { useStudents } from "../../api/students";
import { useQuranPlans, segmentReversed } from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { isReversedRange, orientSlice } from "../../lib/quranRange";
import { Badge } from "../../components/common/Badge";
import { SkeletonCardGrid } from "../../components/common/Skeleton";
import { FormSection } from "../../components/common/FormSection";
import { AR_LOCALE } from "@/lib/format";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

/* ─── helpers ─────────────────────────────────────────────── */
function getTeacherId(v: TrackTeacher | string)      { return typeof v === "object" ? v._id  : v; }
function getTeacherName(v: TrackTeacher | string)    { return typeof v === "object" ? v.name : v; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(AR_LOCALE, { year: "numeric", month: "short", day: "numeric" });
}
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
}
const AVATAR_COLORS = [
  { bg: "var(--green-pale)", fg: "var(--green)" },
  { bg: "var(--gold-pale)",  fg: "#92400e" },
  { bg: "#eff6ff",           fg: "#1d4ed8" },
  { bg: "#fde8f0",           fg: "#9d174d" },
];

/* ─── types ───────────────────────────────────────────────── */
type FormFields = {
  title: string; type: string; timeSlot: string;
  masjid: string;
  isOnline: boolean; meetLink: string;
  teachers: string[];
  maxStudents: string;
  startDate: string; endDate: string;
  daysPerWeek: string;
  status: Track["status"];
  notes: string;
};
const EMPTY: FormFields = {
  title: "", type: "", timeSlot: "",
  masjid: "",
  isOnline: false, meetLink: "",
  teachers: [], maxStudents: "30",
  startDate: "", endDate: "",
  daysPerWeek: "", status: "upcoming", notes: "",
};

type Modal =
  | null
  | { mode: "form"; item?: Track }
  | { mode: "students"; item: Track };

/* ─── overlay / dialog styles ─────────────────────────────── */
const OVERLAY: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const DIALOG: CSSProperties = {
  background: "var(--surface)", borderRadius: 16, width: "100%",
  maxHeight: "92vh", overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

/* ─── status config ──────────────────────────────────────── */
const STATUS_CFG = {
  active:   { label: "نشط",    tone: "green" as const, color: "var(--green)",  bg: "var(--green-pale)", bar: "linear-gradient(90deg,var(--green),var(--green2))" },
  upcoming: { label: "قادم",   tone: "gold"  as const, color: "#d97706",       bg: "var(--gold-pale)",  bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  ended:    { label: "منتهي",  tone: "gray"  as const, color: "var(--text3)",  bg: "var(--cream)",      bar: "var(--border)" },
};
const TYPE_OPTS = ["مراجعة مكثّفة","تجويد","إجازة","ختمة مسرّعة","برنامج رمضاني","تحضير مسابقة","أخرى"];
const DAYS_OPTS = ["يومياً","السبت والثلاثاء","السبت والاثنين والأربعاء","عطلة نهاية الأسبوع","ثلاث مرات أسبوعياً","مرتين أسبوعياً"];

/* ════════════════════════════════════════════════════════════ */
export function AdminTracks() {
  const { data: tracks = [], isLoading } = useTracks();
  const { data: teachers = [] }          = useTeachers();
  const { data: masajid  = [] }          = useMasajid();
  const { data: allStudents = [] }       = useStudents();

  const createTrack    = useCreateTrack();
  const updateTrack    = useUpdateTrack();
  const deleteTrack    = useDeleteTrack();
  const assignStudent  = useAssignStudent();
  const { showPage }   = usePortal();

  function openDetail(track: Track) {
    sessionStorage.setItem(TRACK_DETAIL_ID_KEY, track._id);
    showPage("trackdetail");
  }

  const [modal,         setModal]         = useState<Modal>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);
  const [form,          setForm]          = useState<FormFields>(EMPTY);
  const [formError,     setFormError]     = useState("");
  const [addStudentId,  setAddStudentId]  = useState("");
  const [studentsSearch,setStudentsSearch]= useState("");

  /* ── open helpers ── */
  function openAdd() {
    setForm(EMPTY); setFormError(""); setModal({ mode: "form" });
  }
  function openEdit(item: Track) {
    const d = (s: string) => s ? new Date(s).toISOString().split("T")[0] : "";
    setForm({
      title:          item.title,
      type:           item.type,
      timeSlot:       item.timeSlot,
      masjid:         typeof item.masjid === "object" ? item.masjid._id : item.masjid,
      isOnline:       item.isOnline ?? false,
      meetLink:       item.meetLink ?? "",
      teachers:       item.teachers.map(getTeacherId),
      maxStudents:    String(item.maxStudents),
      startDate:      d(item.startDate),
      endDate:        d(item.endDate),
      daysPerWeek:    item.daysPerWeek,
      status:         item.status,
      notes:          item.notes ?? "",
    });
    setFormError(""); setModal({ mode: "form", item });
  }
  function openStudents(item: Track) {
    setAddStudentId(""); setStudentsSearch(""); setModal({ mode: "students", item });
  }

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }
  function toggleTeacher(id: string) {
    setForm((p) => ({
      ...p,
      teachers: p.teachers.includes(id)
        ? p.teachers.filter((x) => x !== id)
        : [...p.teachers, id],
    }));
  }

  /* ── submit ── */
  async function handleSubmit() {
    const { title, type, timeSlot, isOnline, masjid,
            meetLink, teachers: tids, maxStudents, startDate, endDate, daysPerWeek } = form;

    if (!title.trim())        { setFormError("اسم المسار مطلوب"); return; }
    if (!type.trim())         { setFormError("نوع المسار مطلوب"); return; }
    if (tids.length === 0)    { setFormError("يرجى اختيار معلم واحد على الأقل"); return; }
    if (!timeSlot.trim())     { setFormError("وقت الجلسة مطلوب"); return; }
    if (!daysPerWeek.trim())  { setFormError("الأيام مطلوبة"); return; }
    if (!startDate || !endDate) { setFormError("التواريخ مطلوبة"); return; }
    if (isOnline && !meetLink.trim()) { setFormError("رابط الجلسة مطلوب"); return; }
    if (!masjid) { setFormError("يرجى اختيار المسجد"); return; }

    setFormError("");
    const body = {
      title: title.trim(), type: type.trim(), status: form.status,
      timeSlot: timeSlot.trim(), masjid, isOnline,
      meetLink: isOnline ? meetLink.trim() : "",
      teachers: tids, maxStudents: Number(maxStudents) || 30,
      startDate, endDate, daysPerWeek: daysPerWeek.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (modal && "item" in modal && modal.item) {
        await updateTrack.mutateAsync({ id: modal.item._id, ...body });
      } else {
        await createTrack.mutateAsync(body);
      }
      setModal(null);
    } catch (e) { setFormError((e as Error).message); }
  }

  useTopbar("ti-calendar-event", "المسارات",
    <button className="topbar-btn btn-primary" onClick={openAdd}>
      <i className="ti ti-plus" /> مسار جديد
    </button>,
  );

  const isPending = createTrack.isPending || updateTrack.isPending;

  /* ── group by status ── */
  const active   = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended    = tracks.filter((t) => t.status === "ended");

  /* ════════════════════ RENDER ════════════════════════════ */
  return (
    <>
      {isLoading && <SkeletonCardGrid count={3} lines={4} />}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "56px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 16px",
          }}>
            <i className="ti ti-calendar-event" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>لا توجد مسارات بعد</p>
          <p style={{ margin: "6px 0 20px", fontSize: 13, color: "var(--text3)" }}>أضف أول مسار</p>
          <button className="topbar-btn btn-primary" style={{ padding: "10px 24px" }} onClick={openAdd}>
            <i className="ti ti-plus" /> مسار جديد
          </button>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {active.length > 0 && (
            <section>
              <SectionHeader label="المسارات النشطة" count={active.length} color="var(--green)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {active.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader label="المسارات القادمة" count={upcoming.length} color="#d97706" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
                {upcoming.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
          {ended.length > 0 && (
            <section>
              <SectionHeader label="المسارات المنتهية" count={ended.length} color="var(--text3)" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14, opacity: 0.75 }}>
                {ended.map((t) => (
                  <TrackCard key={t._id} t={t} onManageStudents={openStudents} onEdit={openEdit} onDelete={setDeleteId} onOpen={openDetail} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ════════ FORM MODAL ════════ */}
      {modal?.mode === "form" && (
        <div style={OVERLAY} onClick={() => setModal(null)}>
          <div style={{ ...DIALOG, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "20px 24px 16px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--green-pale)", color: "var(--green)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  <i className="ti ti-calendar-event" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                    {"item" in modal && modal.item ? "تعديل المسار" : "مسار جديد"}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>أدخل بيانات المسار بالكامل</p>
                </div>
              </div>
              <button className="topbar-btn btn-ghost" style={{ padding: "6px 9px" }} onClick={() => setModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {formError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#ef4444", fontSize: 13, marginBottom: 16,
                  padding: "10px 14px", background: "#fef2f2", borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} /> {formError}
                </div>
              )}

              <FormSection label="نوع الجلسة" icon="ti-device-laptop">
                <div style={{ display: "flex", gap: 8 }}>
                  {([false, true] as const).map((online) => (
                    <button
                      key={String(online)}
                      type="button"
                      onClick={() => sf("isOnline", online)}
                      style={{
                        flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${form.isOnline === online ? "var(--green)" : "var(--border)"}`,
                        background: form.isOnline === online ? "var(--green-pale)" : "var(--cream)",
                        color: form.isOnline === online ? "var(--green)" : "var(--text2)",
                        fontWeight: form.isOnline === online ? 700 : 400,
                        fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all .15s",
                      }}
                    >
                      <i className={`ti ${online ? "ti-video" : "ti-building-mosque"}`} />
                      {online ? "أونلاين" : "حضوري"}
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection label="المعلومات الأساسية" icon="ti-info-circle">
                <div className="form-grid-2">
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">اسم المسار <span>*</span></label>
                    <input className="form-input" placeholder="مثال: دورة المراجعة الصيفية ١٤٤٧" value={form.title} onChange={(e) => sf("title", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">النوع <span>*</span></label>
                    <select className="form-input" value={form.type} onChange={(e) => sf("type", e.target.value)}>
                      <option value="">— اختر —</option>
                      {TYPE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحالة</label>
                    <select className="form-input" value={form.status} onChange={(e) => sf("status", e.target.value as Track["status"])}>
                      <option value="upcoming">قادم</option>
                      <option value="active">نشط</option>
                      <option value="ended">منتهي</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">المسجد <span>*</span></label>
                    <select className="form-input" value={form.masjid} onChange={(e) => sf("masjid", e.target.value)}>
                      <option value="">— اختر مسجداً —</option>
                      {masajid.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الحد الأقصى للطلاب</label>
                    <input className="form-input" type="number" min={1} value={form.maxStudents} onChange={(e) => sf("maxStudents", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ملاحظات</label>
                    <input className="form-input" placeholder="أي معلومات إضافية..." value={form.notes} onChange={(e) => sf("notes", e.target.value)} />
                  </div>
                </div>
              </FormSection>

              <FormSection label="المعلمون المسؤولون" icon="ti-chalkboard">
                {form.teachers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {form.teachers.map((id) => {
                      const t = teachers.find((x) => x._id === id);
                      return (
                        <div key={id} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "var(--green-pale)", color: "var(--green)",
                          borderRadius: 99, padding: "5px 10px 5px 6px", fontSize: 12, fontWeight: 700,
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: "var(--green)", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8, fontWeight: 800,
                          }}>
                            {avatarInitials(t?.name ?? "")}
                          </div>
                          {t?.name}
                          <button
                            type="button"
                            onClick={() => toggleTeacher(id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, marginRight: 2 }}
                          >
                            <i className="ti ti-x" style={{ fontSize: 11 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{
                  border: "1px solid var(--border)", borderRadius: 10,
                  maxHeight: 160, overflowY: "auto",
                }}>
                  {teachers.length === 0 && (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--text3)", textAlign: "center" }}>
                      لا يوجد معلمون مسجّلون
                    </div>
                  )}
                  {teachers.map((tc, i) => {
                    const selected = form.teachers.includes(tc._id);
                    return (
                      <label
                        key={tc._id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", cursor: "pointer",
                          borderBottom: i < teachers.length - 1 ? "1px solid var(--border)" : "none",
                          background: selected ? "var(--green-pale)" : "transparent",
                          transition: "background .12s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleTeacher(tc._id)}
                          style={{ accentColor: "var(--green)", width: 15, height: 15, flexShrink: 0 }}
                        />
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: selected ? "var(--green)" : "var(--cream)",
                          color: selected ? "#fff" : "var(--text2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, flexShrink: 0,
                        }}>
                          {avatarInitials(tc.name)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? "var(--green)" : "var(--text)" }}>
                          {tc.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FormSection>

              <FormSection label="الجدول" icon="ti-map-pin">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">الوقت <span>*</span></label>
                    <input className="form-input" placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChange={(e) => sf("timeSlot", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الأيام <span>*</span></label>
                    <select className="form-input" value={form.daysPerWeek} onChange={(e) => sf("daysPerWeek", e.target.value)}>
                      <option value="">— اختر —</option>
                      {DAYS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      <option value="custom">أخرى (أدخل يدوياً)</option>
                    </select>
                    {form.daysPerWeek === "custom" && (
                      <input className="form-input" style={{ marginTop: 6 }} placeholder="مثال: السبت والثلاثاء والخميس" onChange={(e) => sf("daysPerWeek", e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ البداية <span>*</span></label>
                    <input className="form-input" type="date" dir="ltr" value={form.startDate} onChange={(e) => sf("startDate", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ النهاية <span>*</span></label>
                    <input className="form-input" type="date" dir="ltr" value={form.endDate} onChange={(e) => sf("endDate", e.target.value)} />
                  </div>
                  {form.isOnline && (
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">رابط الجلسة <span>*</span></label>
                      <input className="form-input" dir="ltr" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={form.meetLink} onChange={(e) => sf("meetLink", e.target.value)} />
                    </div>
                  )}
                </div>
              </FormSection>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  className="topbar-btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "11px 0" }}
                  onClick={handleSubmit} disabled={isPending}
                >
                  {isPending
                    ? <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> جارٍ الحفظ...</>
                    : <><i className="ti ti-check" /> حفظ المسار</>
                  }
                </button>
                <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setModal(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ STUDENTS MODAL — transfer-only, since a student's track is
          exclusive: this panel shows who's currently on the track (a live
          query, not a stored array) and offers "نقل طالب" (moves a student's
          `track` field here), never "add" alongside an existing track. ════════ */}
      {modal?.mode === "students" && (() => {
        const track = tracks.find((t) => t._id === modal.item._id) ?? modal.item;
        const enrolledStudents = allStudents.filter((s) => {
          const tId = typeof s.track === "object" ? s.track._id : s.track;
          return tId === track._id;
        });
        const enrolledCnt = enrolledStudents.length;
        const capPct      = Math.min(100, Math.round((enrolledCnt / track.maxStudents) * 100));
        const barClr      = capPct >= 90 ? "#ef4444" : capPct >= 70 ? "#f59e0b" : "var(--green)";
        const isFull      = enrolledCnt >= track.maxStudents;
        const available   = allStudents.filter((s) => {
          const tId = typeof s.track === "object" ? s.track._id : s.track;
          return tId !== track._id && (!studentsSearch.trim() || s.name.includes(studentsSearch.trim()));
        });

        return (
          <div style={OVERLAY} onClick={() => { setModal(null); setStudentsSearch(""); }}>
            <div style={{ ...DIALOG, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "18px 22px 14px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-pale)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                    <i className="ti ti-users" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text)" }}>إدارة طلاب المسار</h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text2)" }}>{track.title}</p>
                  </div>
                </div>
                <button className="topbar-btn btn-ghost" style={{ padding: "5px 8px" }} onClick={() => { setModal(null); setStudentsSearch(""); }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              <div style={{ padding: "16px 22px" }}>
                <div style={{ background: "var(--cream)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
                      <i className="ti ti-user-check" style={{ marginLeft: 4 }} />طاقة المسار
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barClr }}>{enrolledCnt} / {track.maxStudents}</span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${capPct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
                  </div>
                  {isFull && <p style={{ margin: "8px 0 0", fontSize: 11, color: "#ef4444", fontWeight: 600 }}><i className="ti ti-alert-circle" style={{ marginLeft: 4 }} />وصل المسار للحد الأقصى</p>}
                </div>

                {!isFull && (
                  <div style={{ border: "1.5px dashed var(--border2)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                      <i className="ti ti-user-plus" style={{ marginLeft: 5, color: "var(--green)" }} />نقل طالب إلى هذا المسار
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="form-input" style={{ flex: 1, fontSize: 13 }} value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)}>
                        <option value="">— اختر طالباً —</option>
                        {available.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                      <button
                        className="topbar-btn btn-primary"
                        style={{ padding: "0 16px", whiteSpace: "nowrap", fontSize: 13 }}
                        disabled={!addStudentId || assignStudent.isPending}
                        onClick={async () => {
                          if (!addStudentId) return;
                          await assignStudent.mutateAsync({ id: track._id, studentId: addStudentId });
                          setAddStudentId("");
                        }}
                      >
                        {assignStudent.isPending
                          ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
                          : <><i className="ti ti-plus" /> نقل</>}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>الطلاب المسجّلون</span>
                  {enrolledCnt > 0 && (
                    <input className="form-input" style={{ width: 140, fontSize: 12, padding: "5px 10px" }} placeholder="بحث..." value={studentsSearch} onChange={(e) => setStudentsSearch(e.target.value)} />
                  )}
                </div>

                {enrolledCnt === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", background: "var(--cream)", borderRadius: 10 }}>
                    <i className="ti ti-user-off" style={{ fontSize: 28, color: "var(--text3)", display: "block", marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text3)" }}>لا يوجد طلاب مسجّلون بعد</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                    {enrolledStudents
                      .filter((s) => !studentsSearch.trim() || s.name.includes(studentsSearch.trim()))
                      .map((s, idx) => {
                        const c = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <div key={s._id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "9px 12px", background: "var(--cream)", borderRadius: 10,
                            border: "1px solid var(--border)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: "50%",
                                background: c.bg, color: c.fg,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, flexShrink: 0,
                              }}>{avatarInitials(s.name)}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.name}</div>
                                <div style={{ fontSize: 10, color: "var(--text3)" }}>#{idx + 1}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--text3)" }}>
                  <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                  لإزالة طالب من المسار، انقله إلى مسار آخر من صفحة إدارة الطلاب.
                </p>

                <button
                  className="topbar-btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 16, padding: 10 }}
                  onClick={() => { setModal(null); setStudentsSearch(""); }}
                >إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════ DELETE CONFIRM ════════ */}
      {deleteId && (
        <div style={OVERLAY} onClick={() => setDeleteId(null)}>
          <div style={{ ...DIALOG, maxWidth: 360, padding: "28px 24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "#fef2f2", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, margin: "0 auto 14px",
              }}>
                <i className="ti ti-trash" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>حذف المسار</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>سيُحذف المسار نهائياً ولا يمكن التراجع.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="topbar-btn btn-primary"
                style={{ flex: 1, justifyContent: "center", background: "#ef4444", borderColor: "#ef4444", padding: 11 }}
                onClick={async () => { await deleteTrack.mutateAsync(deleteId); setDeleteId(null); }}
                disabled={deleteTrack.isPending}
              >
                <i className="ti ti-trash" />
                {deleteTrack.isPending ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button className="topbar-btn btn-ghost" style={{ padding: "11px 20px" }} onClick={() => setDeleteId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── track card ── */
function TrackCard({
  t, onManageStudents, onEdit, onDelete, onOpen,
}: {
  t: Track;
  onManageStudents: (t: Track) => void;
  onEdit: (t: Track) => void;
  onDelete: (id: string) => void;
  onOpen: (t: Track) => void;
}) {
  const cfg      = STATUS_CFG[t.status];
  const enrolled = t.studentCount ?? 0;
  const pct      = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
  const barClr   = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

  const { data: linkedPlans = [] } = useQuranPlans({ track: t._id });
  const linkedPlan = linkedPlans[0];
  const [planOpen, setPlanOpen] = useState(false);

  function getName(v: unknown): string {
    if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name;
    return typeof v === "string" ? v : "";
  }

  return (
    <div
      className="track-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(t); } }}
      style={{ cursor: "pointer" }}
    >
      <div style={{ height: 4, background: cfg.bar }} />

      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
            <Badge tone={cfg.tone}>{cfg.label}</Badge>
            <span style={{
              fontSize: 11, background: cfg.bg, color: cfg.color,
              borderRadius: 6, padding: "2px 9px", fontWeight: 600,
            }}>{t.type}</span>
            {t.isOnline
              ? <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                  <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                </span>
              : <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 9px" }}>
                  <i className="ti ti-building-arch" style={{ marginLeft: 3 }} />حضوري
                </span>
            }
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "var(--green)", borderColor: "rgba(26,92,42,0.25)" }}
              onClick={(e) => { e.stopPropagation(); onManageStudents(t); }}
            >
              <i className="ti ti-users" />
              {enrolled > 0 && (
                <span style={{ background: "var(--green)", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", marginRight: 4 }}>
                  {enrolled}
                </span>
              )}
            </button>
            <button className="topbar-btn btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
              <i className="ti ti-pencil" />
            </button>
            <button
              className="topbar-btn btn-ghost"
              style={{ padding: "5px 11px", fontSize: 12, color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={(e) => { e.stopPropagation(); onDelete(t._id); }}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        <h3 style={{ margin: "10px 0 12px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{t.title}</h3>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
          <InfoRow icon="ti-clock"    label="الوقت"    val={t.timeSlot} />
          <InfoRow icon="ti-calendar-repeat" label="الأيام" val={t.daysPerWeek} />
          <InfoRow icon="ti-calendar" label="البداية"  val={fmtDate(t.startDate)} />
          <InfoRow icon="ti-calendar-off" label="النهاية" val={fmtDate(t.endDate)} />
          <InfoRow
            icon={t.isOnline ? "ti-video" : "ti-map-pin"}
            label="المسجد"
            val={t.isOnline ? "أونلاين" : getName(t.masjid)}
            span
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>المعلمون</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {t.teachers.map((tc, i) => {
              const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={getTeacherId(tc)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: c.bg, color: c.fg,
                  borderRadius: 99, padding: "4px 10px 4px 4px", fontSize: 12, fontWeight: 600,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: c.fg, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800,
                  }}>
                    {avatarInitials(getTeacherName(tc))}
                  </div>
                  {getTeacherName(tc)}
                </div>
              );
            })}
            {t.teachers.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>— لا يوجد معلم —</span>
            )}
          </div>
        </div>

        <div style={{ background: "var(--cream)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطاقة الاستيعابية
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>
              {enrolled} / {t.maxStudents}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>

        <div style={{
          marginTop: 12, borderRadius: 10, padding: "10px 12px",
          background: linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 ? "var(--green-pale)" : "var(--cream)",
        }}>
          <div
            onClick={(e) => { e.stopPropagation(); linkedPlan && setPlanOpen((o) => !o); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, cursor: linkedPlan ? "pointer" : "default" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 ? "var(--green)" : "var(--text3)" }}>
              <i className="ti ti-target" />الخطة القرآنية
              {linkedPlan?.progress && (
                <span style={{ background: "var(--green)", color: "#fff", borderRadius: 99, padding: "1px 8px", fontSize: 10 }}>
                  {linkedPlan.progress.percent}%
                </span>
              )}
            </span>
            {linkedPlan && <i className={`ti ti-chevron-${planOpen ? "up" : "down"}`} style={{ fontSize: 13, color: "var(--text3)" }} />}
          </div>

          {linkedPlan && planOpen && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{linkedPlan.name}</div>

              {linkedPlan.progress && (
                <div style={{ margin: "6px 0" }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${linkedPlan.progress.percent}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3 }}>
                    {linkedPlan.juzProgress
                      ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء`
                      : ""}
                    {" · "}{linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>
                {linkedPlan.todayAssignments.length > 0 ? linkedPlan.todayAssignments.map((entry, idx) => {
                  const a = orientSlice(entry, segmentReversed(linkedPlan, entry.type));
                  return (
                  <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                    مقرَّر اليوم{linkedPlan.todayAssignments.length > 1 ? ` (${entry.type})` : ""}: {surahName(a.surahStart)} : {a.ayahStart}
                    {" — "}
                    {surahName(a.surahEnd)} : {a.ayahEnd}
                    {" "}(صفحة {a.pageStart}
                    {a.pageEnd !== a.pageStart ? ` - ${a.pageEnd}` : ""})
                  </div>
                  );
                }) : "لا يوجد جزء مخصص لليوم"}
              </div>
            </div>
          )}

          {!linkedPlan && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text3)" }}>لا توجد خطة حفظ مرتبطة بهذا المسار</p>
          )}
        </div>

        {t.isOnline && t.meetLink && (
          <a
            href={t.meetLink} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "#1d4ed8", background: "#eff6ff",
              padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(29,78,216,0.2)",
              textDecoration: "none", fontWeight: 600,
            }}
          >
            <i className="ti ti-video" /> انضم للجلسة
          </a>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val, span }: { icon: string; label: string; val: string; span?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, gridColumn: span ? "1 / -1" : undefined }}>
      <i className={`ti ${icon}`} style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>{label}</div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{val}</div>
      </div>
    </div>
  );
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
        background: color + "22", color,
      }}>{count}</span>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old file and commit**

```bash
git rm quran-hifz/src/quran/pages/admin/AdminSpecialTracks.tsx
git add quran-hifz/src/quran/pages/admin/AdminTracks.tsx
git commit -m "feat(web): rename AdminSpecialTracks to AdminTracks, add masjid field"
```

(Typecheck still fails at this point — `pageRegistry.ts` imports the old name until Task 17. That is expected; do not fix `pageRegistry.ts` here.)

---

### Task 5: Rename TeacherSpecialTracks.tsx → TeacherTracks.tsx

**Files:**
- Delete: `quran-hifz/src/quran/pages/teacher/TeacherSpecialTracks.tsx`
- Create: `quran-hifz/src/quran/pages/teacher/TeacherTracks.tsx`

**Interfaces:**
- Consumes: `useTracks`, `TRACK_DETAIL_ID_KEY`, `Track` from Task 1.
- Produces: exported `TeacherTracks` component — consumed by Task 17's `pageRegistry.ts`.

- [ ] **Step 1: Create `TeacherTracks.tsx`**

Same structure as the original `TeacherSpecialTracks.tsx` (136-line file, read in full during planning), with these substitutions applied throughout:
- Import line 5: `import { useTracks, TRACK_DETAIL_ID_KEY, type Track } from "../../api/tracks";` (was `useSpecialTracks, ..., type SpecialTrack` from `../../api/special-tracks`)
- Every `SpecialTrack` type reference → `Track`
- Line 24: `const enrolled = track.enrolledStudents.length;` → `const enrolled = track.studentCount ?? 0;`
- Line 30: `const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: track._id });` → `useQuranPlans({ track: track._id });`
- Line 34: `const linkedPlan = linkedPlans.find((p) => p.targetType === "specialTrack") ?? linkedPlans[0];` → `const linkedPlan = linkedPlans.find((p) => p.targetType === "track") ?? linkedPlans[0];`
- Component name `TeacherSpecialTracks` → `TeacherTracks`; line 139: `const { data: tracks = [], isLoading } = useSpecialTracks(undefined, teacherId);` → `useTracks(undefined, teacherId)`

```tsx
import { useTopbar } from "../../context/useTopbar";
import { usePortal } from "../../context/PortalContext";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useTracks, TRACK_DETAIL_ID_KEY, type Track } from "../../api/tracks";
import { useQuranPlans, segmentReversed } from "../../api/quran-plans";
import { SURAHS } from "../../data/surahs";
import { isReversedRange, orientSlice } from "../../lib/quranRange";
import { SkeletonCardGrid } from "../../components/common/Skeleton";

function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? "";
}

const STATUS_CFG = {
  active:   { label: "نشط",   tone: "green" as const, bar: "linear-gradient(90deg,var(--green),var(--green2))" },
  upcoming: { label: "قادم",  tone: "gold"  as const, bar: "linear-gradient(90deg,#f59e0b,#fbbf24)" },
  ended:    { label: "منتهي", tone: "gray"  as const, bar: "var(--border)" },
};

/* ─── simple, click-to-open summary card ─── */
function TrackCard({ track, onOpen }: { track: Track; onOpen: (t: Track) => void }) {
  const cfg = STATUS_CFG[track.status];
  const enrolled = track.studentCount ?? 0;
  const pct = Math.min(100, Math.round((enrolled / track.maxStudents) * 100));
  const barClr = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "var(--green)";

  // Small "N+1" fetch just for the at-a-glance today's-target teaser — same
  // trade-off already accepted elsewhere in this file (small per-teacher lists).
  const { data: linkedPlans = [] } = useQuranPlans({ track: track._id });
  const linkedPlan = linkedPlans.find((p) => p.targetType === "track") ?? linkedPlans[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(track)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(track); } }}
      style={{
        background: "var(--surface)", borderRadius: 16,
        border: "2px solid transparent", overflow: "hidden", cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
    >
      <div style={{ height: 4, background: cfg.bar }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "var(--green-pale)", color: "var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
            }}>
              <i className="ti ti-calendar-event" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {track.title}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                <span style={{ fontSize: 11, background: "var(--cream)", color: "var(--text2)", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                  {track.type}
                </span>
                {track.isOnline && (
                  <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 9px", fontWeight: 600 }}>
                    <i className="ti ti-wifi" style={{ marginLeft: 3 }} />أونلاين
                  </span>
                )}
              </div>
            </div>
          </div>
          <i className="ti ti-chevron-left" style={{ fontSize: 16, color: "var(--text3)", flexShrink: 0, marginTop: 8 }} />
        </div>

        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <i className="ti ti-clock" style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الوقت</div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{track.timeSlot}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <i className="ti ti-calendar-repeat" style={{ color: "var(--green)", marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>الأيام</div>
              <div style={{ fontWeight: 600, color: "var(--text)", marginTop: 1 }}>{track.daysPerWeek}</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 ? 10 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>
              <i className="ti ti-user-check" style={{ marginLeft: 4 }} />الطلاب
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barClr }}>{enrolled} / {track.maxStudents}</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barClr, borderRadius: 99, transition: "width .4s" }} />
          </div>
        </div>

        {linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 && (
          <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--green-pale)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>
              <i className="ti ti-calendar-star" style={{ marginLeft: 4 }} />الجزء المطلوب اليوم
            </div>
            {linkedPlan.todayAssignments.map((entry, idx) => {
              const a = orientSlice(entry, segmentReversed(linkedPlan, entry.type));
              return (
                <div key={idx} style={{ fontSize: 12, color: "var(--text)", fontWeight: 600, marginTop: idx > 0 ? 3 : 0 }}>
                  {linkedPlan.todayAssignments.length > 1 && (
                    <span style={{ fontWeight: 400, color: "var(--text2)" }}>{entry.type} · </span>
                  )}
                  {surahName(a.surahStart)} : {a.ayahStart}{" — "}{surahName(a.surahEnd)} : {a.ayahEnd}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export function TeacherTracks() {
  useTopbar("ti-calendar-event", "مساراتي");
  const { user, showPage } = usePortal();
  const teacherId = user?.profileId as string | undefined;

  const { data: tracks = [], isLoading } = useTracks(undefined, teacherId);

  const active = tracks.filter((t) => t.status === "active");
  const upcoming = tracks.filter((t) => t.status === "upcoming");
  const ended = tracks.filter((t) => t.status === "ended");

  function openDetail(track: Track) {
    sessionStorage.setItem(TRACK_DETAIL_ID_KEY, track._id);
    showPage("trackdetail");
  }

  function Section({ title, color, items }: { title: string; color: string; items: Track[] }) {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "22", color }}>
            {items.length}
          </span>
        </div>
        <div className="grid-collapse" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
          {items.map((t) => (
            <TrackCard key={t._id} track={t} onOpen={openDetail} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      {isLoading && <SkeletonCardGrid count={3} lines={4} />}

      {!isLoading && tracks.length === 0 && (
        <div style={{ textAlign: "center", padding: "52px 0" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "var(--green-pale)", color: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
          }}>
            <i className="ti ti-calendar-event" />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            لا توجد مسارات مُسنَدة إليك
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}>
            عندما تُعيّنك الإدارة لمسار سيظهر هنا تلقائياً
          </p>
        </div>
      )}

      {!isLoading && tracks.length > 0 && (
        <>
          <Section title="المسارات النشطة" color="var(--green)" items={active} />
          <Section title="المسارات القادمة" color="#d97706" items={upcoming} />
          <Section title="المسارات المنتهية" color="var(--text3)" items={ended} />
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Delete the old file and commit**

```bash
git rm quran-hifz/src/quran/pages/teacher/TeacherSpecialTracks.tsx
git add quran-hifz/src/quran/pages/teacher/TeacherTracks.tsx
git commit -m "feat(web): rename TeacherSpecialTracks to TeacherTracks"
```

---

### Task 6: Rename StudentSpecialTracks.tsx → StudentTracks.tsx

**Files:**
- Delete: `quran-hifz/src/quran/pages/student/StudentSpecialTracks.tsx`
- Create: `quran-hifz/src/quran/pages/student/StudentTracks.tsx`

**Interfaces:**
- Consumes: `useTracks`, `Track`, `TrackTeacher` from Task 1.
- Produces: exported `StudentTracks` component — consumed by Task 17's `pageRegistry.ts`.

- [ ] **Step 1: Create `StudentTracks.tsx`**

Same structure as the original `StudentSpecialTracks.tsx` (366-line file, read in full during planning), with these substitutions:
- Line 7: `import { useSpecialTracks, type SpecialTrack, type TrackTeacher } from "../../api/special-tracks";` → `import { useTracks, type Track, type TrackTeacher } from "../../api/tracks";`
- Every `SpecialTrack` → `Track`
- Line 51: `const { data: linkedPlans = [] } = useQuranPlans({ specialTrack: track._id });` → `useQuranPlans({ track: track._id });`
- Line 152: `{track.isOnline ? "أونلاين" : track.location}` → replace with a `getName` helper reading `track.masjid`: `{track.isOnline ? "أونلاين" : getName(track.masjid)}` (add the same `getName` helper used elsewhere in this plan: `function getName(v: unknown): string { if (v && typeof v === "object" && "name" in v) return (v as { name: string }).name; return typeof v === "string" ? v : ""; }`)
- Component `StudentSpecialTracks` → `StudentTracks`
- Lines 269-277 (the `useSpecialTracks` call with a `studentId` third argument): the `useTracks` hook (Task 1) no longer takes a student filter (the server dropped `?student=` — a student only ever needs their OWN track, singular, not a filtered list). `usePortal().user` is `AuthUser` (from `context/AuthContext.tsx`, auth-level fields only — name/role/`profileId` — no domain field like `track`), so the student's own track must come from `useStudent(profileId)` in `api/students.ts`. Replace the whole data-fetching approach and add the import:

```tsx
import { useStudent } from "../../api/students";
```

```tsx
export function StudentTracks() {
  useTopbar("ti-star", "مساري");
  const { user } = usePortal();
  const { data: student } = useStudent(user?.profileId as string | undefined);
  const studentTrackId = typeof student?.track === "object" ? student.track._id : student?.track;

  const { data: allTracks = [], isLoading } = useTracks();
  const tracks = allTracks.filter((t) => t._id === studentTrackId);
```

Since a student now has exactly ONE track, `tracks` will hold at most one element — the rest of the file's `active`/`upcoming`/`ended` grouping and rendering logic is unchanged (it degrades gracefully to showing 0 or 1 card per section). Rename the page heading from "مساراتي" (plural, made sense under multi-track) to "مساري" (singular) since a student has exactly one track now — reflected in the `useTopbar` call above.

- [ ] **Step 2: Delete the old file and commit**

```bash
git rm quran-hifz/src/quran/pages/student/StudentSpecialTracks.tsx
git add quran-hifz/src/quran/pages/student/StudentTracks.tsx
git commit -m "feat(web): rename StudentSpecialTracks to StudentTracks, single-track lookup"
```

---

### Task 7: AdminMasajid.tsx — gender field + tracks list

**Files:**
- Modify: `quran-hifz/src/quran/api/masajid.ts`
- Modify: `quran-hifz/src/quran/pages/admin/AdminMasajid.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (this file's own `Masjid` type was never touched by Phase 1's server-only work, so it still needs updating here to match the already-shipped server response shape).
- Produces: `Masjid.gender`, `Masjid.tracks` (replaces `Masjid.halqat`) — not consumed elsewhere in this plan.

This file has no `FormFields`/`sf(...)` helper pattern (unlike `AdminTracks.tsx`/`AdminStudents.tsx`) — it's simple `useState` per field. 267 lines total, read in full during planning.

- [ ] **Step 1: `api/masajid.ts` — add `gender`, rename `halqat` to `tracks` (lines 4-9)**

```ts
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
```

Replace line 32 (`useCreateMasjid`'s mutationFn signature):

```ts
    mutationFn: (body: { name: string; location: string; gender: "male" | "female" }) => post<SingleResponse>("/masajid", body),
```

Replace line 40 (`useUpdateMasjid`'s mutationFn signature):

```ts
    mutationFn: ({ id, ...body }: { id: string; name?: string; location?: string; gender?: "male" | "female" }) =>
```

- [ ] **Step 2: `AdminMasajid.tsx` — add gender state (lines 45-47)**

```tsx
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [formError, setFormError] = useState("");
```

- [ ] **Step 3: Seed `gender` when opening add/edit (lines 49-61)**

```tsx
  function openAdd() {
    setName("");
    setLocation("");
    setGender("male");
    setFormError("");
    setModal({ mode: "add" });
  }

  function openEdit(item: Masjid) {
    setName(item.name);
    setLocation(item.location);
    setGender(item.gender);
    setFormError("");
    setModal({ mode: "edit", item });
  }
```

- [ ] **Step 4: Include `gender` in the submit body (lines 63-79)**

```tsx
  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      setFormError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setFormError("");
    try {
      if (modal?.mode === "add") {
        await createMasjid.mutateAsync({ name: name.trim(), location: location.trim(), gender });
      } else if (modal?.mode === "edit") {
        await updateMasjid.mutateAsync({ id: modal.item._id, name: name.trim(), location: location.trim(), gender });
      }
      setModal(null);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
```

- [ ] **Step 5: Replace the "حلقات" count badge and nested list (lines 130, 150-165)**

Line 130 — replace `<Badge tone="green">{toAr(m.halqat?.length ?? 0)} حلقات</Badge>` with:

```tsx
              <Badge tone="green">{toAr(m.tracks?.length ?? 0)} مسارات</Badge>
```

Replace lines 150-165 (the nested list body). The server's `getMasajid` doesn't compute a per-track student count (unlike `api/tracks.ts`'s list endpoint) — show the track's `status` badge instead of inventing an enrolled/capacity ratio the data doesn't support:

```tsx
          <div className={`masjid-body${open.has(m._id) ? " open" : ""}`}>
            {(m.tracks ?? []).map((t) => (
              <div key={t._id} className="halqa-row-item">
                <span className="h-name">{t.title}</span>
                <Badge tone={t.status === "active" ? "green" : t.status === "upcoming" ? "gold" : "gray"}>
                  {t.status === "active" ? "نشط" : t.status === "upcoming" ? "قادم" : "منتهي"}
                </Badge>
                {t.timeSlot && (
                  <span className="h-info">
                    <i className="ti ti-clock" style={{ fontSize: 12 }} /> {t.timeSlot}
                  </span>
                )}
              </div>
            ))}
            {!m.tracks?.length && (
              <div style={{ padding: "10px 16px", color: "var(--text3)", fontSize: 13 }}>
                لا توجد مسارات مسجلة
              </div>
            )}
          </div>
```

- [ ] **Step 6: Add the gender selector to the form modal (after line 216, before the actions row)**

Insert directly after the "الموقع" `form-group` block (line 216) and before the actions `<div>` at line 218:

```tsx
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">الجنس <span>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { value: "male" as const, label: "جامع (رجال)" },
                  { value: "female" as const, label: "دار (نساء)" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${gender === opt.value ? "var(--green)" : "var(--border)"}`,
                      background: gender === opt.value ? "var(--green-pale)" : "var(--cream)",
                      color: gender === opt.value ? "var(--green)" : "var(--text2)",
                      fontWeight: gender === opt.value ? 700 : 400,
                      fontSize: 13,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
```

- [ ] **Step 7: Update the topbar title (line 102)**

```tsx
    "المساجد والمسارات",
```

(was "المساجد والحلقات".)

- [ ] **Step 8: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `AdminMasajid.tsx` and `api/masajid.ts` no longer error.

- [ ] **Step 9: Commit**

```bash
git add quran-hifz/src/quran/pages/admin/AdminMasajid.tsx quran-hifz/src/quran/api/masajid.ts
git commit -m "feat(web): add gender field to masjid form, show tracks instead of halqat"
```

---

### Task 8: AdminStudents.tsx — collapse halqa+masjid to track

**Files:**
- Modify: `quran-hifz/src/quran/pages/admin/AdminStudents.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1; `Student` (with `.track`) from Task 2.

- [ ] **Step 1: Replace the helper functions (lines 20-34)**

```tsx
function getObjName(h: unknown): string {
  if (h && typeof h === "object" && "name" in h) return (h as { name: string }).name;
  if (h && typeof h === "object" && "title" in h) return (h as { title: string }).title;
  return "";
}
function getTrackMasjidName(track: Student["track"]): string {
  if (!track || typeof track !== "object") return "";
  const m = track.masjid;
  if (m && typeof m === "object" && "name" in m) return (m as { name: string }).name;
  return "";
}
function getObjId(h: unknown): string {
  if (h && typeof h === "object" && "_id" in h) return (h as { _id: string })._id;
  if (typeof h === "string") return h;
  return "";
}
```

- [ ] **Step 2: Replace the `EditFormFields` type (lines 36-47)**

```tsx
type EditFormFields = {
  name: string;
  path: string;
  level: string;
  track: string;
  guardianPhone: string;
  nationalId: string;
  status: "active" | "inactive" | "new";
  email: string;
  password: string;
};
```

- [ ] **Step 3: Replace imports and hook calls (lines 8, 64)**

Replace `import { useHalqat } from "../../api/halqat";` with `import { useTracks } from "../../api/tracks";`, and `const { data: halqat = [] } = useHalqat();` with `const { data: tracks = [] } = useTracks();`. Remove `useMasajid` import and its call (line 9, 65) — the masjid select is dropped, since assigning a student is now purely "pick a track" (the track already belongs to a masjid).

- [ ] **Step 4: Replace the form's default state and `openEdit`/`handleUpdate` (lines 75, 82-97, 111-124)**

Line 75 default state — replace `halqa: "", masjid: "",` with `track: "",`.

`openEdit` — replace `halqa: getObjId(s.halqa), masjid: getObjId(s.masjid),` with `track: getObjId(s.track),`.

`handleUpdate`'s mutation body — replace `halqa: form.halqa || undefined, masjid: form.masjid || undefined,` with `track: form.track || undefined,`.

- [ ] **Step 5: Collapse the "الحلقة" column into "المسار", repoint "المسجد" (lines 202-228)**

The current table has 8 columns: الاسم, المسار (badge: track-via-halqa or `s.path`), المستوى, الحلقة (`getObjName(s.halqa)`, the halqa's own name), المسجد (`getObjName(s.masjid)`), ولي الأمر, الحالة, and an actions column (`colSpan={8}` on the empty-state row at line 266). Since `Student.halqa`/`Student.masjid` are both gone and `Student.track` already carries the track's title directly, the "الحلقة" column has nothing left to show and is deleted outright — dropping the column count from 8 to 7.

Replace the header row (lines 203-212):

```tsx
                <tr>
                  <th>الاسم</th>
                  <th>المسار</th>
                  <th>المستوى</th>
                  <th>المسجد</th>
                  <th>ولي الأمر</th>
                  <th>الحالة</th>
                  <th />
                </tr>
```

Replace the row cells (lines 217-228):

```tsx
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      {(() => {
                        const trackTitle = getObjName(s.track);
                        if (trackTitle) return <Badge tone="green">{trackTitle}</Badge>;
                        if (s.path) return <Badge tone={PATH_TONE[s.path] ?? "blue"}>{s.path}</Badge>;
                        return <span style={{ color: "var(--text3)" }}>—</span>;
                      })()}
                    </td>
                    <td>{s.level != null ? toAr(s.level) : "—"}</td>
                    <td>{getTrackMasjidName(s.track)}</td>
```

(The rest of the row — ولي الأمر, الحالة, actions — is unchanged; only the deleted "الحلقة" `<td>{getObjName(s.halqa)}</td>` and the repointed "المسجد" `<td>{getObjName(s.masjid)}</td>` → `<td>{getTrackMasjidName(s.track)}</td>` change.)

Update the empty-state row's `colSpan={8}` (line 266) to `colSpan={7}`.

- [ ] **Step 6: Replace the edit-modal's "الحلقة"/"المسجد" selects (lines 335-353)**

```tsx
<div className="form-group" style={{ gridColumn: "1 / -1" }}>
  <label className="form-label">المسار</label>
  <select className="form-input" value={form.track} onChange={(e) => setField("track", e.target.value)}>
    <option value="">اختر المسار</option>
    {tracks.map((t) => (
      <option key={t._id} value={t._id}>{t.title}</option>
    ))}
  </select>
</div>
```

(single select replaces the previous two — "الحلقة" and "المسجد" — since a track already belongs to exactly one masjid; there is nothing left to pick separately.)

- [ ] **Step 7: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `AdminStudents.tsx` no longer errors.

- [ ] **Step 8: Commit**

```bash
git add quran-hifz/src/quran/pages/admin/AdminStudents.tsx
git commit -m "feat(web): collapse student halqa+masjid fields to a single track picker"
```

---

### Task 9: TeacherAttendance.tsx consumer update

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx`

**Interfaces:**
- Consumes: `ContextPicker`, `trackToContext`, `TeachingContext` from Task 3; `useTracks` from Task 1; `track`-shaped filters from Task 2's `api/evaluations.ts`/`api/attendance.ts`/`api/students.ts`.

- [ ] **Step 1: Replace the import block (lines 8-24)**

```tsx
import {
  ContextPicker,
  trackToContext,
  type TeachingContext,
} from "../../components/common/ContextPicker";
import { SkeletonCard, SkeletonTable } from "../../components/common/Skeleton";
import { Leaderboard } from "../../components/common/Leaderboard";
import {
  IndividualPlanPanel,
  planCoversStudent,
} from "../../components/common/IndividualPlanPanel";
import { useTracks } from "../../api/tracks";
import { useStudents } from "../../api/students";
import { ATTENDANCE_PREFILL_TRACK_KEY } from "../../api/attendance";
```

- [ ] **Step 2: Replace context-building (lines 232-238)**

```tsx
  const { data: tracks = [], isLoading: loadingTracks } = useTracks(undefined, teacherId);

  const contexts: TeachingContext[] = tracks.map(trackToContext);
```

- [ ] **Step 3: Update the deep-link effect's `loadingHalqat` reference**

Every remaining `loadingHalqat` reference (lines 249, 716) becomes just `loadingTracks` alone (drop the `||` combination since there is no separate halqat loading state anymore) — e.g. line 716's `if (loadingHalqat || loadingTracks) {` becomes `if (loadingTracks) {`.

- [ ] **Step 4: Replace `contextFilter` (lines 259-263)**

```tsx
  const contextFilter = selected ? { track: selected.id } : undefined;
```

- [ ] **Step 5: Replace the plan-target match (lines 288-291)**

```tsx
  const linkedPlan =
    plans.find((p) => p.targetType === "track") ?? plans[0];
```

- [ ] **Step 6: Replace the bulk-evaluate mutation payload (line 587)**

```tsx
        track: selected.id,
```

(replaces `...(selected.kind === "halqa" ? { halqa: selected.id } : { specialTrack: selected.id }),`)

- [ ] **Step 7: Replace the cosmetic `selected.kind === "halqa"` branches (lines 803, 817)**

Line 803's alert text — replace `لا يوجد خطة حفظ نشطة لهذه {selected.kind === "halqa" ? "الحلقة" : "المسار"}` with `لا يوجد خطة حفظ نشطة لهذا المسار`.

Line 817's `<Card icon={selected.kind === "halqa" ? "ti-school" : "ti-calendar-event"} ...>` — replace with `<Card icon="ti-calendar-event" ...>`.

- [ ] **Step 8: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherAttendance.tsx` no longer errors.

- [ ] **Step 9: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx
git commit -m "feat(web): update TeacherAttendance for single-kind track context"
```

---

### Task 10: TeacherGroupHomework.tsx consumer update

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherGroupHomework.tsx`

**Interfaces:**
- Consumes: `ContextPicker`, `trackToContext`, `TeachingContext` from Task 3; `useTracks` from Task 1; `track`-shaped `GroupHomeworkFilters` from Task 2.

- [ ] **Step 1: Replace the import block (lines 5-10)**

```tsx
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from "../../api/group-homework";
import { useTracks } from "../../api/tracks";
import { Card } from "../../components/common/Card";
import { Alert } from "../../components/common/Alert";
import { Badge } from "../../components/common/Badge";
import { ContextPicker, trackToContext, type TeachingContext } from "../../components/common/ContextPicker";
```

- [ ] **Step 2: Replace context-building (lines 97-102)**

```tsx
  const { data: tracks = [], isLoading: loadingTracks } = useTracks(undefined, user?.profileId as string | undefined);
  const contexts: TeachingContext[] = tracks.map(trackToContext);
```

- [ ] **Step 3: Replace the `useGroupHomework` filter (lines 104-110)**

```tsx
  const { data: homeworks, isLoading } = useGroupHomework(
    selected ? { track: selected.id } : undefined
  );
```

- [ ] **Step 4: Replace `handleAdd`'s mutation payload (lines 133-141)**

```tsx
    await createHW.mutateAsync({
      track:       selected.id,
      title:       form.title,
      description: form.desc,
      dueDay:      form.dueDay,
      dueDate:     new Date().toISOString(),
    });
```

- [ ] **Step 5: Fix the `loadingHalqat || loadingTracks` guard (line 150)**

```tsx
    if (loadingTracks) {
```

- [ ] **Step 6: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherGroupHomework.tsx` no longer errors.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherGroupHomework.tsx
git commit -m "feat(web): update TeacherGroupHomework for single-kind track context"
```

---

### Task 11: TeacherPlanForm.tsx rewrite

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1; `PlanFormHandoff` (with `trackId?`), `PlanType`, `RangePoint`, `QuranPlan` (with `targetType: "track"|"students"`, `track?`) from Task 1's `quran-plans.ts`; `track`-shaped `StudentFilters` from Task 2.

- [ ] **Step 1: Replace imports (lines 13, 15)**

Replace `import { useHalqat } from "../../api/halqat";` and `import { useSpecialTracks } from "../../api/special-tracks";` with:

```tsx
import { useTracks } from "../../api/tracks";
```

- [ ] **Step 2: Replace the comment and `TARGET_TYPES` constant (lines 34-39)**

```tsx
// Plans are track-based only. "طلاب محددون" is intentionally the only other
// option offered here — per-student differentiation happens via individual
// plans, managed per student after the track plan is saved.
const TARGET_TYPES: { value: "track" | "students"; label: string; icon: string }[] = [
  { value: "track", label: "مسار كامل", icon: "ti-route" },
];
```

- [ ] **Step 3: Replace `FormFields` type (lines 58-74)**

```tsx
type FormFields = {
  name: string;
  description: string;
  /** One per selected type, max four. Their days must not overlap. */
  segments: FormSegment[];
  targetType: "track" | "students";
  track: string;
  students: string[];
  holidays: string[];
  startDate: string;
  endType: "activeDays" | "date";
  activeDaysCount: string;
  endDate: string;
  /** Daily grading split for this plan. Seeded from DEFAULT_GRADE_RUBRIC. */
  gradeRubric: GradeCriterion[];
};
```

- [ ] **Step 4: Replace `EMPTY` (lines 87-97)**

```tsx
const EMPTY: FormFields = {
  name: "", description: "",
  segments: [emptySegment("حفظ")],
  targetType: "track", track: "", students: [],
  holidays: [],
  startDate: todayISO(),
  endType: "activeDays",
  activeDaysCount: "10",
  endDate: "",
  gradeRubric: DEFAULT_GRADE_RUBRIC.map((c) => ({ ...c })),
};
```

- [ ] **Step 5: Replace `fieldsFromPlan` (lines 103-124)**

```tsx
function fieldsFromPlan(plan: QuranPlan, nameSuffix = ""): FormFields {
  return {
    name: `${plan.name}${nameSuffix}`, description: plan.description ?? "",
    segments: plan.segments.map((seg) => ({
      type: seg.type, days: seg.days, rangeStart: seg.rangeStart, rangeEnd: seg.rangeEnd,
    })),
    targetType: plan.targetType,
    track: plan.track ? getId(plan.track) : "",
    students: (plan.students ?? []).map(getId),
    holidays: plan.holidays ?? [],
    startDate: plan.startDate ? plan.startDate.split("T")[0] : todayISO(),
    endType: plan.endType,
    activeDaysCount: plan.activeDaysCount ? String(plan.activeDaysCount) : "",
    endDate: plan.endDate ? plan.endDate.split("T")[0] : "",
    gradeRubric: plan.gradeRubric?.length
      ? plan.gradeRubric.map((c) => ({ ...c }))
      : DEFAULT_GRADE_RUBRIC.map((c) => ({ ...c })),
  };
}
```

- [ ] **Step 6: Replace the hooks and handoff pre-select (lines 141-158)**

```tsx
  const { data: tracks = [] } = useTracks(undefined, teacherId);

  const createPlan = useCreateQuranPlan();
  const updatePlan = useUpdateQuranPlan();

  const [planRecord, setPlanRecord] = useState<QuranPlan | null>(handoff?.mode === "edit" ? handoff.plan : null);
  const [planPanelStudentId, setPlanPanelStudentId] = useState<string | null>(null);

  const [form, setForm] = useState<FormFields>(() => {
    if (handoff?.mode === "edit") return fieldsFromPlan(handoff.plan);
    if (handoff?.mode === "duplicate") return fieldsFromPlan(handoff.plan, " (نسخة)");
    if (handoff?.mode === "create" && handoff.trackId) {
      return { ...EMPTY, targetType: "track", track: handoff.trackId };
    }
    return EMPTY;
  });
```

(Remove the now-unused `allStudents`/`specialTracks` variable declarations only if they duplicate — check: `allStudents` is still needed for the "students" targetType roster and `StudentPicker`, so keep `const { data: allStudents = [] } = useStudents();` as-is; only the `specialTracks` variable and its `useSpecialTracks` call are removed, replaced by `tracks` above.)

- [ ] **Step 7: Replace the roster-fetching hooks (lines 227-233)**

```tsx
  const { data: trackStudents = [] } = useStudents({ track: form.track }, { enabled: form.targetType === "track" && !!form.track });

  const rosterStudents =
    form.targetType === "track" ? trackStudents :
    allStudents.filter((s) => form.students.includes(s._id));
```

- [ ] **Step 8: Replace validation (lines 243, 245)**

```tsx
    if (form.targetType === "track" && !form.track) { setFormError("يرجى اختيار مسار"); return; }
```

(delete the old `specialTrack` validation line entirely — there is no third branch anymore.)

- [ ] **Step 9: Replace the submit body (lines 266-269)**

```tsx
      targetType: form.targetType,
      track: form.targetType === "track" ? form.track : undefined,
      students: form.targetType === "students" ? form.students : undefined,
```

- [ ] **Step 10: Replace the target-card selects (lines 477-504)**

```tsx
        {form.targetType === "track" && (
          <div className="form-group">
            <label className="form-label">المسار <span>*</span></label>
            <select className="form-input" value={form.track} onChange={(e) => sf("track", e.target.value)}>
              <option value="">— اختر مساراً —</option>
              {tracks.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </div>
        )}
        {form.targetType === "students" && (
          <StudentPicker
            students={allStudents}
            selected={form.students}
            onChange={(students) => sf("students", students)}
          />
        )}
```

- [ ] **Step 11: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherPlanForm.tsx` no longer errors.

- [ ] **Step 12: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx
git commit -m "feat(web): rewrite TeacherPlanForm for track-only plan targeting"
```

---

### Task 12: TeacherPlanDetail.tsx + TeacherPlans.tsx display fixes

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx`

**Interfaces:**
- Consumes: `QuranPlan.targetType`/`.track` from Task 1.

- [ ] **Step 1: `TeacherPlanDetail.tsx` — replace `targetLabel`/`targetIcon` (lines 81-87)**

```tsx
  const targetLabel =
    plan.targetType === "track" ? (plan.track ? (typeof plan.track === "object" ? plan.track.title : plan.track) : "—") :
    `${(plan.students ?? []).length} طالب`;
  const targetIcon =
    plan.targetType === "track" ? "ti-route" : "ti-users";
```

- [ ] **Step 2: `TeacherPlans.tsx` — replace imports (line 8) and `targetLabel`/`targetIcon`/`onClick` in `PlanCard` (lines 166-172, 242)**

Remove `import type { PlanHalqa } from "../../api/quran-plans";` (no longer exists — `getName` still works generically on `plan.track` since `PlanTrack` also has a `.name`... actually `PlanTrack` has `.title`, not `.name` — check the `getName` helper at the top of this file, which reads `.name`; since `PlanTrack` uses `title`, do NOT reuse `getName` for the track label, write it inline instead):

```tsx
  const targetLabel =
    plan.targetType === "track" ? (plan.track ? (typeof plan.track === "object" ? plan.track.title : plan.track) : "—") :
    `${(plan.students ?? []).length} طالب`;
  const targetIcon =
    plan.targetType === "track" ? "ti-route" : "ti-users";
```

Line 242's `onClick={plan.targetType === "specialTrack" ? onViewTrack : undefined}` → `onClick={plan.targetType === "track" ? onViewTrack : undefined}`.

Line 113's `onViewTrack={() => showPage("specialtracks")}` — leave the string `"specialtracks"` as-is here; Task 17 renames this page-registry key project-wide in one pass, including this call site.

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherPlanDetail.tsx` and `TeacherPlans.tsx` no longer error (aside from the intentionally-deferred `"specialtracks"` string literal, which is not a type error).

- [ ] **Step 4: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx
git commit -m "feat(web): update plan target display for track-only targeting"
```

---

### Task 13: TeacherTrackDetail.tsx rewrite

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx`

**Interfaces:**
- Consumes: `useTracks`, `Track`, `TrackTeacher`, `TRACK_DETAIL_ID_KEY` from Task 1; `useStudents`/`Student` (with `.track`) from Task 2; `QuranPlan.track`, `PlanFormHandoff.trackId` from Task 1.

This is the largest single-file change in this plan (2013 lines). The core simplification: the roster no longer needs deriving through `Halqa` — `Student.track` is now the sole membership mechanism, so `useStudents({track: track._id})` replaces the whole `useHalqat`+`myHalqaIdsInTrack`+`{halqa: ...}` chain.

- [ ] **Step 1: Replace imports (lines 11-18, 31)**

```tsx
import {
  useTracks,
  TRACK_DETAIL_ID_KEY,
  type Track,
  type TrackTeacher,
} from "../../api/tracks";
import { useStudents, type Student } from "../../api/students";
```

(Remove `useHalqat` import and the `EnrolledStudent` type import entirely — no longer used.)

- [ ] **Step 2: Replace the helper functions (lines 155-163)**

Remove `getEnrolledName`/`getEnrolledId` (operated on `EnrolledStudent | string`, no longer needed since roster now comes directly from `Student[]`). Keep `getTeacherName`.

- [ ] **Step 3: Replace `LinkPlanPanel`'s track type and filtering (lines 252-277)**

```tsx
function LinkPlanPanel({
  track,
  teacherId,
  onLinked,
  onCreateNew,
}: {
  track: Track;
  teacherId?: string;
  onLinked: () => void;
  onCreateNew: () => void;
}) {
  const { data: myPlans = [], isLoading } = useQuranPlans({ teacher: teacherId });
  const updatePlan = useUpdateQuranPlan();

  const linkable = myPlans.filter(
    (p) =>
      p.track !== track._id &&
      (typeof p.track !== "object" || p.track?._id !== track._id),
  );

  function link(plan: QuranPlan) {
    updatePlan.mutate(
      { id: plan._id, targetType: "track", track: track._id },
      { onSuccess: onLinked },
    );
  }
```

- [ ] **Step 4: Replace the roster derivation (lines 359-386)**

```tsx
  const [trackId] = useState(() => sessionStorage.getItem(TRACK_DETAIL_ID_KEY));

  // No GET /tracks/:id endpoint used here — reuse the same teacher-scoped list
  // the Tracks page already fetches (small list, cheap) and find this one
  // client-side, exactly as before.
  const { data: tracks = [], isLoading: loadingTracks } = useTracks(undefined, teacherId);
  const track = tracks.find((t) => t._id === trackId);

  // `Student.track` is now the sole membership mechanism — the roster is a
  // direct query, no more halqa-mediated derivation.
  const { data: rosterStudents = [] } = useStudents(
    { track: track?._id },
    { enabled: !!track },
  );
  const roster: Student[] = rosterStudents;
```

Note for the implementer: the rest of this file reads roster entries via `getEnrolledId(s)`/`getEnrolledName(s)` (removed in Step 2) — Step 5 below replaces every call site with direct `Student` field access (`s._id`/`s.name`), since `roster` is now `Student[]` instead of `(EnrolledStudent | string)[]`.

- [ ] **Step 5: Replace every `getEnrolledId`/`getEnrolledName` call site**

Run `grep -n "getEnrolledId\|getEnrolledName" quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx` after Step 4 to find them (the research read identified these usages at the roster-mapping call around line 383-386, now removed, and inside the roster-rendering loop around lines 1236-1244: `const name = getEnrolledName(s); const id = getEnrolledId(s);`). Replace:

```tsx
                {roster.map((s) => {
                  const name = s.name;
                  const id = s._id;
```

- [ ] **Step 6: Replace `coveredStudentIds`' dependency on `roster`/`getEnrolledId` (lines 435-439)**

```tsx
  const coveredStudentIds = useMemo(() => {
    if (!track || !linkedPlan) return [];
    return roster.map((s) => s._id).filter((id) => planCoversStudent(linkedPlan, id));
  }, [track, linkedPlan, rosterStudents]);
```

- [ ] **Step 7: Replace the linked-plan query and selection (lines 413-420)**

```tsx
  const { data: linkedPlans = [] } = useQuranPlans(track ? { track: track._id } : undefined);
  // A plan can carry a stale `track` field left over from before its
  // targetType was switched to "students" (see planCoversStudent above), so
  // useQuranPlans({track}) can return several plans for this track — prefer
  // the one actually targeting the whole track (targetType: "track") over a
  // narrower students-only plan that merely still points at it.
  const linkedPlan = linkedPlans.find((p) => p.targetType === "track") ?? linkedPlans[0];
```

- [ ] **Step 8: Replace the saved-evaluation and rubric queries (lines 609-610, 622)**

```tsx
  const { data: savedForDay = [] } = useEvaluations(
    track ? { track: track._id, from: effectiveDate, to: effectiveDate } : undefined,
  );
```

```tsx
  const { data: rubricData } = useRubric(track ? { track: track._id } : undefined);
```

- [ ] **Step 9: Replace the save mutation payload (line 738)**

```tsx
      { teacher: teacherId!, track: track._id, date: effectiveDate, records },
```

- [ ] **Step 10: Replace the plan-creation handoffs (lines 852-874)**

```tsx
  function createNewPlan() {
    if (!track) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "create", trackId: track._id }));
    showPage("planform");
  }
  function editLinkedPlan() {
    if (!linkedPlan) return;
    sessionStorage.setItem(
      PLAN_FORM_HANDOFF_KEY,
      JSON.stringify({ mode: "edit", plan: linkedPlan }),
    );
    showPage("planform");
  }
  // A track's students are always exactly its own roster now (single-track-
  // per-student), so there's no per-student ambiguity to resolve — the
  // handoff is identical to createNewPlan's.
  function createPlanForStudent(_studentId: string) {
    if (!track) return;
    sessionStorage.setItem(PLAN_FORM_HANDOFF_KEY, JSON.stringify({ mode: "create", trackId: track._id }));
    showPage("planform");
  }
```

- [ ] **Step 11: Update the location display (lines 998-1001)**

```tsx
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1 }}>المسجد</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginTop: 1 }}>
                {track.isOnline ? "أونلاين" : (typeof track.masjid === "object" ? track.masjid.name : track.masjid)}
              </div>
            </div>
```

(replaces the `track.isOnline ? "أونلاين" : track.location` read, since `location` no longer exists.)

- [ ] **Step 12: Update `roster.length`/`enrolled` computation (line 913 and surrounding)**

Since `roster` is directly `Student[]` now (not the old `(EnrolledStudent|string)[]`), `roster.length` continues to work unchanged — no edit needed here beyond what Step 4 already established.

- [ ] **Step 13: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherTrackDetail.tsx` no longer errors (aside from the intentionally-deferred `"specialtracks"` string literal in `showPage("specialtracks")` at lines ~884, which Task 17 handles).

- [ ] **Step 14: Manual verification against the real dev server**

Start the web dev server and, logged in as a teacher, open a track's detail page: confirm the roster tab shows the track's real students (via `Student.track`, not a halqa chain), confirm the "الخطة" tab still shows/links/creates a plan correctly, and confirm attendance/evaluation saving still works. This mirrors Phase 1's live-verification approach — this file has the deepest behavioral surface of any file in this plan.

- [ ] **Step 15: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx
git commit -m "feat(web): rewrite TeacherTrackDetail roster derivation via Student.track"
```

---

### Task 14: IndividualPlanPanel.tsx comment fix

**Files:**
- Modify: `quran-hifz/src/quran/components/common/IndividualPlanPanel.tsx`

**Interfaces:** None — comment-only change, no code.

- [ ] **Step 1: Replace the comment at lines 67-70**

```tsx
/** Whether a plan actually covers a given student — true for track-targeted
 * plans (which by definition cover their whole roster), but for
 * `targetType: "students"` plans only true if the student is in that explicit
 * list. */
```

- [ ] **Step 2: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: no change (comment-only).

- [ ] **Step 3: Commit**

```bash
git add quran-hifz/src/quran/components/common/IndividualPlanPanel.tsx
git commit -m "docs(web): correct stale halqa/specialTrack comment in IndividualPlanPanel"
```

---

### Task 15: TeacherStudents.tsx roster simplification

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherStudents.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1; `track`-shaped `StudentFilters` from Task 2.

- [ ] **Step 1: Replace imports (lines 7-8)**

```tsx
import { useTracks } from "../../api/tracks";
```

- [ ] **Step 2: Replace the `Row` type (lines 37-47)**

```tsx
type Row = {
  id: string;
  name: string;
  trackId: string | null;
  trackName: string;
  guardian: string;
  guardianContact: string;
  lastMemorization: string;
  homeworkStatus: string | null;
};
```

- [ ] **Step 3: Replace the data-fetching and row-building (lines 50-117)**

```tsx
export function TeacherStudents() {
  const { user } = usePortal();
  const [filter, setFilter] = useState<string>("all"); // "all" | "track:<id>"

  const { data: myTracks = [], isLoading: loadingTracks } = useTracks(undefined, user?.profileId as string | undefined);
  const trackIds = myTracks.map((t) => t._id);
  const { data: students = [], isLoading: loadingStudents } = useStudents(
    { track: trackIds.join(",") },
    { enabled: !loadingTracks && trackIds.length > 0 },
  );

  const rows: Row[] = students.map((s) => {
    const trackId = typeof s.track === "object" ? s.track._id : s.track;
    return {
      id: s._id,
      name: s.name,
      trackId: trackId || null,
      trackName: typeof s.track === "object" ? s.track.title : "",
      guardian: s.parentName || s.guardian || "—",
      guardianContact: s.parentEmail || s.guardianPhone || "—",
      lastMemorization: s.lastMemorization || "—",
      homeworkStatus: s.homeworkStatus,
    };
  });

  const visibleRows = rows.filter((r) => {
    if (filter === "all") return true;
    return r.trackId === filter.slice(6);
  });

  useTopbar("ti-users", "طلابي");

  const loading = loadingTracks || loadingStudents;
  const hasAny = myTracks.length > 0;
```

Confirmed against the server: `student.controller.ts`'s `getStudents` already splits a comma-separated `track` query param the same way it split `halqa` before (`String(track).split(',')`), so `{ track: trackIds.join(",") }` is the correct wire format — no change needed from the old `{ halqa: halqaIds.join(",") }` convention beyond the field name.

- [ ] **Step 4: Replace the table's data-source and columns (lines 130-230)**

Replace the filter `<select>`'s options (drop the "الحلقات" optgroup entirely, keep only "المسارات"):

```tsx
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text)", fontSize: 13,
              }}
            >
              <option value="all">كل الطلاب ({rows.length})</option>
              {myTracks.length > 0 && (
                <optgroup label="المسارات">
                  {myTracks.map((t) => (
                    <option key={t._id} value={`track:${t._id}`}>{t.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
```

Replace the table header (drop the separate "الحلقة"/"المسارات" two-column split for a single "المسار" column):

```tsx
                <tr>
                  <th>الطالب</th>
                  <th>المسار</th>
                  <th>ولي الأمر</th>
                  <th>التواصل</th>
                  <th>آخر حفظ</th>
                  <th>الدرس</th>
                  <th>إجراء</th>
                </tr>
```

Replace the row rendering's corresponding cells:

```tsx
                {visibleRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.trackName ? <Badge tone="green">{r.trackName}</Badge> : "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.guardian}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)", direction: "ltr", textAlign: "right" }}>{r.guardianContact}</td>
                    <td style={{ fontSize: 12, color: "var(--text2)" }}>{r.lastMemorization}</td>
                    <td>
                      {r.homeworkStatus ? (
                        <Badge tone={HW_TONE[r.homeworkStatus] ?? "gold"}>
                          {HW_LABEL[r.homeworkStatus] ?? "لم يُسجَّل"}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td>
                      <button className="topbar-btn btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>
                        <i className="ti ti-microphone" /> سجّل
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
```

(colSpan drops from 8 to 7 — one fewer column.) Also update the empty-state copy at line 140 ("لا توجد حلقة أو مسارات مسندة لهذا المعلم") to "لا توجد مسارات مسندة لهذا المعلم".

- [ ] **Step 5: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: `TeacherStudents.tsx` no longer errors.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherStudents.tsx
git commit -m "feat(web): simplify TeacherStudents roster to direct track membership"
```

---

### Task 16: Reports — ReportsDashboard.tsx, StudentReportPanel.tsx, TeacherReports.tsx, AdminReports.tsx

**Files:**
- Modify: `quran-hifz/src/quran/components/common/ReportsDashboard.tsx`
- Modify: `quran-hifz/src/quran/components/common/StudentReportPanel.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherReports.tsx`
- Modify: `quran-hifz/src/quran/pages/admin/AdminReports.tsx`

**Interfaces:**
- Consumes: `useTracks`, `Track` from Task 1; `track`-shaped `StudentFilters`/`EvaluationFilters` from Task 2.

- [ ] **Step 1: `ReportsDashboard.tsx` — replace imports and props (lines 10-11, 103-123)**

Remove `import type { Halqa } from "../../api/halqat";`, change `import type { SpecialTrack } from "../../api/special-tracks";` to `import type { Track } from "../../api/tracks";`.

```tsx
export function ReportsDashboard({
  topbarIcon,
  topbarTitle,
  baseFilter,
  tracks,
  kpis,
  teachers,
  showAdmin = false,
  scopeAllLabel,
}: {
  topbarIcon: string;
  topbarTitle: string;
  baseFilter: StudentFilters;
  tracks: Track[];
  kpis?: Kpi[];
  teachers?: Teacher[];
  showAdmin?: boolean;
  scopeAllLabel: string;
}) {
```

- [ ] **Step 2: Replace `scopedFilter` (lines 125-130)**

```tsx
  const [scope, setScope] = useState("");
  const scopedFilter: StudentFilters = useMemo(() => {
    if (scope === "") return baseFilter;
    if (scope.startsWith("track:")) return { track: scope.slice(6) };
    return baseFilter;
  }, [scope, baseFilter]);
```

- [ ] **Step 3: Replace `halqaIdOf`/`halqaNameOf`/`evalHalqaId`/`evalHalqaName` (lines 27-44) with track equivalents**

```tsx
function trackIdOf(s: Student): string {
  return typeof s.track === "object" ? s.track._id : (s.track ?? "");
}
function trackNameOf(s: Student): string {
  return typeof s.track === "object" ? s.track.title : (s.track ?? "");
}
function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === "string" ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === "string" ? e.student : e.student.name;
}
function evalTrackId(e: EvaluationRecord): string {
  return typeof e.track === "object" ? (e.track?._id ?? "") : (e.track ?? "");
}
function evalTrackName(e: EvaluationRecord): string {
  return typeof e.track === "object" ? (e.track?.title ?? "") : "";
}
```

(`studentIdOf`/`studentNameOf` are unchanged — reproduced here only so the surrounding block reads as a complete replacement of lines 27-44.)

- [ ] **Step 4: Rename the halqa-comparison block to a track-comparison block (lines 210-244)**

```tsx
  /* ── track comparison (only meaningful when more than one track is in scope) ── */
  const trackEvalStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sums: { attendance: number; hifz: number; tajweed: number; talawah: number; total: number }; count: number }
    >();
    for (const e of evaluations) {
      const id = evalTrackId(e);
      if (!id) continue;
      const name = evalTrackName(e) || tracks.find((t) => t._id === id)?.title || "—";
      const entry = map.get(id) ?? {
        name,
        sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 },
        count: 0,
      };
      entry.sums.attendance += legacyScoresOf(e).attendance;
      entry.sums.hifz += legacyScoresOf(e).hifz;
      entry.sums.tajweed += legacyScoresOf(e).tajweed;
      entry.sums.talawah += legacyScoresOf(e).talawah;
      entry.sums.total += e.total;
      entry.count += 1;
      map.set(id, entry);
    }
    return Array.from(map.values())
      .map((e) => ({
        name: e.name,
        avgTotal: round1(e.sums.total / e.count),
        avgAttendance: pctOfMax(e.sums.attendance / e.count, MAX_SCORES.attendance),
        avgHifz: pctOfMax(e.sums.hifz / e.count, MAX_SCORES.hifz),
        avgTajweed: pctOfMax(e.sums.tajweed / e.count, MAX_SCORES.tajweed),
        avgTalawah: pctOfMax(e.sums.talawah / e.count, MAX_SCORES.talawah),
        count: e.count,
      }))
      .sort((a, b) => b.avgTotal - a.avgTotal);
  }, [evaluations, tracks]);
```

- [ ] **Step 5: Update every remaining `halqaEvalStats`/`halqat` reference in this file to `trackEvalStats`/`tracks`**

Run `grep -n "halqaEvalStats\|halqat\b" quran-hifz/src/quran/components/common/ReportsDashboard.tsx` after Step 4 to find the remaining call sites (the research read identified them at lines 320-327 in the insights block, 365-370/376 in `exportHalqaEval`, 417-425 in `scopeOptions`/`selectedHalqa`, and 591-632 in the comparison table render). Rename consistently:
- `halqaEvalStats` → `trackEvalStats`
- The insight text "حلقة **{halqaEvalStats[0].name}**" → "مسار **{trackEvalStats[0].name}**"
- `exportHalqaEval` → `exportTrackEval`, its filename `"تقرير-الحلقات-تقييم.csv"` → `"تقرير-المسارات-تقييم.csv"`, header `"الحلقة"` → `"المسار"`
- `exportAtRisk`'s `halqaNameOf(s)` → `trackNameOf(s)`
- `scopeOptions`: remove the `halqat.forEach(...)` line entirely (only tracks remain), drop `halqat` from the `useMemo` dependency array
- `selectedHalqa` → delete entirely; `aggregateTitle`'s ternary drops the `selectedHalqa` branch, keeping only `selectedTrack`
- The comparison `<BentoTile>` block's condition `halqaEvalStats.length > 1` → `trackEvalStats.length > 1`, its label "مقارنة الحلقات في التقييم" → "مقارنة المسارات في التقييم", its badge `{toAr(halqaEvalStats.length)} حلقة` → `{toAr(trackEvalStats.length)} مسار`, its table header `<th>الحلقة</th>` → `<th>المسار</th>`, and `halqaEvalStats.map(...)` → `trackEvalStats.map(...)`

- [ ] **Step 6: `StudentReportPanel.tsx` — narrow the `aggregateFilter` prop type (line 87)**

```tsx
  aggregateFilter: { track?: string };
```

- [ ] **Step 7: `TeacherReports.tsx` — full replacement**

```tsx
import { usePortal } from "../../context/PortalContext";
import { useTracks } from "../../api/tracks";
import { ReportsDashboard } from "../../components/common/ReportsDashboard";

/** Teacher reports — scoped to the tracks the teacher teaches.
 *  No KPI/teacher scorecards (those are org-wide admin views). */
export function TeacherReports() {
  const { user } = usePortal();
  const { data: tracks = [] } = useTracks(undefined, user?.profileId as string | undefined);

  // baseFilter = all of this teacher's track students (empty string = no
  // students when they have none yet, which is handled by the empty state).
  const baseFilter =
    tracks.length > 0 ? { track: tracks.map((t) => t._id).join(",") } : { track: "__none__" };

  return (
    <ReportsDashboard
      topbarIcon="ti-chart-bar"
      topbarTitle="تقارير طلابي"
      baseFilter={baseFilter}
      tracks={tracks}
      scopeAllLabel="كل مساراتي"
    />
  );
}
```

- [ ] **Step 8: `AdminReports.tsx` — full replacement**

```tsx
import { useStudents } from "../../api/students";
import { useTeachers } from "../../api/teachers";
import { useKpis } from "../../api/kpis";
import { useTracks } from "../../api/tracks";
import { ReportsDashboard } from "../../components/common/ReportsDashboard";

/** Admin reports — full school cohort. KPIs + teachers are org-wide widgets
 *  surfaced in addition to the student analytics. */
export function AdminReports() {
  const { data: teachers = [] } = useTeachers();
  const { data: kpis = [] } = useKpis();
  const { data: tracks = [] } = useTracks();
  // Pre-warm the full students query so the StatsRow/KPIs render instantly
  // once the user lands — ReportsDashboard re-queries under the active scope.
  useStudents();

  return (
    <ReportsDashboard
      topbarIcon="ti-chart-bar"
      topbarTitle="التقارير والتحليلات"
      baseFilter={{}}
      tracks={tracks}
      kpis={kpis}
      teachers={teachers}
      showAdmin
      scopeAllLabel="كل طلاب المدرسة"
    />
  );
}
```

- [ ] **Step 9: Typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: all four files no longer error.

- [ ] **Step 10: Commit**

```bash
git add quran-hifz/src/quran/components/common/ReportsDashboard.tsx quran-hifz/src/quran/components/common/StudentReportPanel.tsx quran-hifz/src/quran/pages/teacher/TeacherReports.tsx quran-hifz/src/quran/pages/admin/AdminReports.tsx
git commit -m "feat(web): rename halqa-comparison reports to track-comparison"
```

---

### Task 17: Routing cleanup — delete Halqa pages, rename route keys, update nav

**Files:**
- Delete: `quran-hifz/src/quran/pages/admin/AdminHalqat.tsx`
- Delete: `quran-hifz/src/quran/pages/teacher/TeacherHalqa.tsx`
- Modify: `quran-hifz/src/quran/router/pageRegistry.ts`
- Modify: `quran-hifz/src/quran/config/portals.ts`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx`

**Interfaces:**
- Consumes: `AdminTracks` (Task 4), `TeacherTracks` (Task 5), `StudentTracks` (Task 6) as the components now registered under the `tracks` key.

This is the final task — it deletes the two now-fully-superseded pages, and does the project-wide route-key rename in one pass so no intermediate task leaves a dangling reference.

- [ ] **Step 1: Delete the two superseded pages**

```bash
git rm quran-hifz/src/quran/pages/admin/AdminHalqat.tsx quran-hifz/src/quran/pages/teacher/TeacherHalqa.tsx
```

- [ ] **Step 2: Rewrite `pageRegistry.ts`**

Full replacement:

```ts
import type { ComponentType } from "react";
import type { PortalKey } from "../config/portals";

import { AdminDashboard }     from "../pages/admin/AdminDashboard";
import { AdminStudents }      from "../pages/admin/AdminStudents";
import { AdminRegister }      from "../pages/admin/AdminRegister";
import { AdminTeachers }      from "../pages/admin/AdminTeachers";
import { AdminMasajid }       from "../pages/admin/AdminMasajid";
import { AdminKpis }          from "../pages/admin/AdminKpis";
import { AdminReports }       from "../pages/admin/AdminReports";
import { AdminTracks }        from "../pages/admin/AdminTracks";
import { AdminParents }       from "../pages/admin/AdminParents";

import { TeacherDashboard }      from "../pages/teacher/TeacherDashboard";
import { TeacherStudents }       from "../pages/teacher/TeacherStudents";
import { TeacherAttendance }     from "../pages/teacher/TeacherAttendance";
import { TeacherHomework }       from "../pages/teacher/TeacherHomework";
import { TeacherPlans }          from "../pages/teacher/TeacherPlans";
import { TeacherPlanForm }       from "../pages/teacher/TeacherPlanForm";
import { TeacherPlanDetail }     from "../pages/teacher/TeacherPlanDetail";
import { TeacherReports }        from "../pages/teacher/TeacherReports";
import { TeacherRecordLesson }   from "../pages/teacher/TeacherRecordLesson";
import { TeacherGroupHomework }  from "../pages/teacher/TeacherGroupHomework";
import { TeacherTracks }         from "../pages/teacher/TeacherTracks";
import { TeacherTrackDetail }    from "../pages/teacher/TeacherTrackDetail";

import { StudentDashboard }      from "../pages/student/StudentDashboard";
import { StudentHifz }           from "../pages/student/StudentHifz";
import { StudentHomework }       from "../pages/student/StudentHomework";
import { StudentAttendance }     from "../pages/student/StudentAttendance";
import { StudentSchedule }       from "../pages/student/StudentSchedule";
import { StudentMessages }       from "../pages/student/StudentMessages";
import { StudentPoints }         from "../pages/student/StudentPoints";
import { StudentStore }          from "../pages/student/StudentStore";
import { StudentTracks }         from "../pages/student/StudentTracks";

import { AccountSettings }    from "../pages/common/AccountSettings";

import { ParentDashboard }    from "../pages/parent/ParentDashboard";
import { ParentTimeline }     from "../pages/parent/ParentTimeline";
import { ParentRecordings }   from "../pages/parent/ParentRecordings";
import { ParentAttendance }   from "../pages/parent/ParentAttendance";
import { ParentMessages }     from "../pages/parent/ParentMessages";
import { ParentHomeworkView } from "../pages/parent/ParentHomeworkView";

export const PAGE_REGISTRY: Record<PortalKey, Record<string, ComponentType>> = {
  admin: {
    dashboard:   AdminDashboard,
    students:    AdminStudents,
    register:    AdminRegister,
    teachers:    AdminTeachers,
    masajid:     AdminMasajid,
    kpis:        AdminKpis,
    reports:     AdminReports,
    tracks:      AdminTracks,
    parents:     AdminParents,
    // Admin reuses the teacher's track detail (and the pages it navigates to).
    trackdetail: TeacherTrackDetail,
    planform:    TeacherPlanForm,
    attendance:  TeacherAttendance,
  },
  teacher: {
    dashboard:     TeacherDashboard,
    tracks:        TeacherTracks,
    students:      TeacherStudents,
    attendance:    TeacherAttendance,
    homework:      TeacherHomework,
    plans:         TeacherPlans,
    planform:      TeacherPlanForm,
    plandetail:    TeacherPlanDetail,
    reports:       TeacherReports,
    recordlesson:  TeacherRecordLesson,
    grouphomework: TeacherGroupHomework,
    trackdetail:   TeacherTrackDetail,
    account:       AccountSettings,
  },
  student: {
    dashboard: StudentDashboard,
    myhifz:    StudentHifz,
    homework:  StudentHomework,
    attendance: StudentAttendance,
    schedule:  StudentSchedule,
    messages:  StudentMessages,
    points:    StudentPoints,
    store:     StudentStore,
    tracks:    StudentTracks,
    account:   AccountSettings,
  },
  parent: {
    dashboard:    ParentDashboard,
    timeline:     ParentTimeline,
    recordings:   ParentRecordings,
    attendance:   ParentAttendance,
    messages:     ParentMessages,
    homework_view: ParentHomeworkView,
  },
};
```

(Both the admin `special_tracks`/`specialtracks` duplicate keys and the teacher/student `specialtracks` keys collapse to the single `tracks` key — the duplicate-key comment from the original file is no longer needed since there's nothing left to alias.)

- [ ] **Step 3: Update `portals.ts` nav config**

Replace the admin nav's "الحلقات والمساجد" group (lines 85-89):

```ts
      { group: "المساجد والمسارات", items: [
        { id: "masajid", icon: "ti-building-arch",   label: "المساجد" },
        { id: "tracks",  icon: "ti-calendar-event",  label: "المسارات", dot: true },
      ]},
```

Replace the teacher nav's "الحلقات" group (lines 54-61) — the group heading no longer fits "الحلقات" since there's no halqa concept left; rename to "المسارات":

```ts
      { group: "المسارات", items: [
        { id: "tracks",        icon: "ti-calendar-event",  label: "مساراتي" },
        { id: "students",      icon: "ti-users",           label: "طلابي" },
        { id: "attendance",    icon: "ti-calendar-check",  label: "الحضور والتقييم",    dot: true },
        { id: "recordlesson",  icon: "ti-player-record",   label: "سجّل درس المسار",   dot: true },
        { id: "grouphomework", icon: "ti-list-check",      label: "واجبات المسار" },
      ]},
```

Replace the student nav's `specialtracks` item (line 33):

```ts
        { id: "tracks", icon: "ti-calendar-event",  label: "مساري" },
```

- [ ] **Step 4: Update the remaining `showPage("specialtracks"|"special_tracks")` call sites**

`TeacherAttendance.tsx` line 709's back-button label: change the button text from "الحلقات والمسارات" to "المسارات" (this button doesn't call `showPage` with a string key — it just resets `selected` to `null`, per the file's own code at lines 703-708 — so no route-key string to change here, only the label text).

`TeacherGroupHomework.tsx` line 123-125's identical back-button — same label-only fix, "الحلقات والمسارات" → "المسارات".

`TeacherTrackDetail.tsx` line 884-886: `if (guardDiscardDayEdit()) showPage("specialtracks");` → `showPage("tracks")`.

`TeacherPlans.tsx` line 113: `onViewTrack={() => showPage("specialtracks")}` → `showPage("tracks")`.

Run a final project-wide grep to confirm nothing was missed:

```bash
grep -rn "specialtracks\|special_tracks\|\"halqat\"\|\"myhalqa\"" quran-hifz/src
```

Expected: zero results.

- [ ] **Step 5: Full typecheck**

```bash
cd quran-hifz && npx tsc --noEmit
```

Expected: **zero errors** — this is the task that resolves every error left dangling by every prior task in this plan.

- [ ] **Step 6: Manual verification against the real dev server**

Log in as admin, teacher, and student in turn; confirm the sidebar shows "المسارات" (not "الحلقات") with no broken nav items, confirm every renamed route (`tracks`, `trackdetail`) loads its component, and confirm no console errors reference a missing `halqat`/`special-tracks` import.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz/src/quran/router/pageRegistry.ts quran-hifz/src/quran/config/portals.ts quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx quran-hifz/src/quran/pages/teacher/TeacherGroupHomework.tsx quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx
git commit -m "feat(web): delete superseded Halqa pages, rename tracks route keys"
```

---

## Final Verification (after Task 17)

- [ ] `cd quran-hifz && npx tsc --noEmit` — zero errors.
- [ ] `cd quran-hifz && npm test` (or whatever the project's actual test command is — confirm via `package.json` before running; the research pass did not confirm a test suite exists for this sub-project, unlike `quran-hifz-server`'s `tsc`+`jest` combo) — passes, or the plan's final report states explicitly that none exists.
- [ ] Manual click-through (live dev server + the Phase-1-migrated Atlas dev DB) of every golden path listed in the spec's Testing section: admin creates a masjid with a gender and a track under it; admin assigns a student to that track; teacher takes attendance and records group homework for the track via the picker; teacher views/edits/creates a plan targeting the track; teacher and admin reports show the track-scoped and track-comparison views correctly.
