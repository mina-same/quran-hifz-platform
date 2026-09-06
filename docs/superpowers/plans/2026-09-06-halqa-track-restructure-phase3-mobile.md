# Halqa/Track Restructure — Phase 3 (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `quran-hifz-mobile` in line with the already-shipped Phase 1 server contract and the already-shipped Phase 2 web precedent (Halqa deleted, `Masjid` gained `gender`, `SpecialTrack` renamed `Track` with a required `masjid`, every context-carrying model collapsed to a single `track` field, single-track-per-student is final) — no new features, no UI behavior beyond removing the halqa/specialTrack duality, except two narrow confirmed mobile-specific adaptations (tab-bar slot promotion for the renamed tracks screen; a single track-only registration picker, mirroring how `AdminStudents`'s per-student track editor already works).

**Architecture:** Mechanical translation of the locked server contract onto the mobile layer: rename `lib/queries/specialTracks.ts` → `tracks.ts` and delete `lib/queries/halqat.ts`, collapse every context-carrying query file's `halqa?`/`specialTrack?` pair to a single required `track`, simplify `ContextCard` from a two-kind union to a single kind, rename every portal's `special_tracks.tsx` → `tracks.tsx`, delete the now-fully-superseded Halqa CRUD screens, and update every screen that read `.halqa`/`.specialTrack` fields to read `.track` instead. The three portal `_layout.tsx` files and `lib/constants/portals.ts` get a combined nav-cleanup pass at the end, mirroring how Phase 2's web plan sequenced its routing task last.

Server response shapes were independently re-verified against the live `quran-hifz-server` controller source during planning (not just the design/research docs), since the design doc's file list came from a summarizing research pass. Findings worth flagging because they pin down exact shapes used throughout this plan's code:
- `Student.track` (from both `GET /students` and `GET /students/:id`) is `{ _id, title, daysPerWeek?, timeSlot?, masjid: { _id, name, location, gender } } | string` — **no `teachers` field** (the research doc's draft speculated one; the controller's `.populate({ path: 'track', select: 'title masjid' / 'title daysPerWeek timeSlot masjid' })` confirms it is absent). `daysPerWeek`/`timeSlot` are present only from the single-student endpoint, not the list endpoint.
- `Masjid.tracks[]` (embedded in `GET /masajid` and `GET /masajid/:id`, per `masjid.controller.ts`'s `.select('title daysPerWeek timeSlot maxStudents status')` + `.populate('teachers', 'name')`) carries **no `studentCount`** — `MasjidAccordion`'s per-track row cannot show a live enrolled-count the way the old per-halqa row did.
- `GET /api/tracks/:id` (`track.controller.ts`'s `getTrack`) returns `{ ...track, students: [{ _id, name, status, progressPct, attendancePct }] }` — a `students` array, not a computed count. `useTrack(id)` (this phase's new hook) must type this response accordingly.
- `ParentChild.track` is **never actually populated** server-side (`parent.controller.ts`'s `getChildren` only does `.populate('student', 'name path juz track ...')` — one level, no nested track populate) — it is always a bare id string at runtime despite the defensive object-union type, exactly mirroring today's (also-never-populated) `ParentChild.halqa`. The rename keeps the same defensive shape web already settled on: `{ _id: string; title: string } | string` (web renamed the object's display field to `title` to match `Track.title`, not `Track.name` — there is no `Track.name`).
- `GET /quran-plans`'s track filter, `GET /evaluations`'s track filter, and `GET /students`'s track filter all accept a comma-separated list resolved via `$in` — confirmed in `quran-plan.controller.ts`, `evaluation.controller.ts`, and `student.controller.ts` respectively — so every place this plan currently joins several halqa ids with a comma (`teacher/students.tsx`, `teacher/reports.tsx`) continues to work unchanged with track ids.

**Tech Stack:** Expo/React Native (Expo Router file-based routing, Expo SDK per `quran-hifz-mobile/AGENTS.md`), TanStack Query v5, TypeScript strict mode, hand-rolled `StyleSheet.create` (no NativeWind/Tailwind), Zustand (`usePortalStore`).

**Spec:** `docs/superpowers/specs/2026-09-06-halqa-track-restructure-phase3-mobile-design.md` — read alongside this plan. Background research: `docs/superpowers/specs/2026-09-06-halqa-track-restructure-phase3-mobile-research.md`. Master design: `docs/superpowers/specs/2026-09-05-halqa-track-restructure-design.md`. Phase 2 (web) plan, used as this plan's template for granularity: `docs/superpowers/plans/2026-09-05-halqa-track-restructure-phase2-web.md`.

## Global Constraints

- No new features. Every change here exists to consume the already-shipped server contract or to remove now-dead halqa/specialTrack duality.
- Single-track-per-student: never build UI that lets a student appear on more than one track.
- `Track` hook names already correct where they exist (`useCreateTrack`/`useUpdateTrack`/`useDeleteTrack`) — do not rename them again.
- Grading logic and the same-day multi-segment scheduling internals are untouched by this phase.
- Where a mobile screen has a direct web equivalent whose Phase 2 resolution is known, mirror that resolution rather than re-deciding independently (see `student/tracks.tsx` below).

---

### Task 1: `lib/queries/tracks.ts` (rename from `specialTracks.ts`) + `lib/queries/quranPlan.ts` target-type update

**Files:**
- Delete: `quran-hifz-mobile/lib/queries/halqat.ts`
- Delete: `quran-hifz-mobile/lib/queries/specialTracks.ts`
- Create: `quran-hifz-mobile/lib/queries/tracks.ts`
- Modify: `quran-hifz-mobile/lib/queries/quranPlan.ts`

**Interfaces:**
- Produces: `Track` type, `TrackTeacher` type, `TrackMasjid` type, `useTracks(status?, teacherId?)`, `useTrack(id)`, `useCreateTrack()`, `useUpdateTrack()`, `useDeleteTrack()`, `useAssignStudent()` — all consumed by every later task in this plan.
- Produces (from `quranPlan.ts`): `QuranPlan.targetType: "track" | "students"`, `QuranPlan.track?: PlanTrack | string` (replaces `halqa`/`specialTrack`), `PlanTrack` type (replaces `PlanHalqa`/`PlanSpecialTrack`), `useQuranPlans(filters: { teacher?; track?; student? })`.

- [ ] **Step 1: Delete `lib/queries/halqat.ts`**

```bash
rm quran-hifz-mobile/lib/queries/halqat.ts
```

- [ ] **Step 2: Delete `lib/queries/specialTracks.ts`**

```bash
rm quran-hifz-mobile/lib/queries/specialTracks.ts
```

- [ ] **Step 3: Create `lib/queries/tracks.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

export type TrackTeacher = { _id: string; name: string };
export type TrackMasjid = { _id: string; name: string; location?: string; gender: 'male' | 'female' };

export type Track = {
  _id: string;
  masjid: TrackMasjid | string;
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
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

/** `GET /tracks/:id` additionally returns each enrolled student's roster row
 *  (name/status/progressPct/attendancePct) — no `studentCount` on this shape,
 *  unlike the list endpoint; count it via `students.length` if ever needed. */
export type TrackWithRoster = Track & {
  students: { _id: string; name: string; status: string; progressPct: number; attendancePct: number }[];
};

type ListResponse = { success: boolean; count: number; data: Track[] };
type SingleResponse = { success: boolean; data: Track };
type SingleWithRosterResponse = { success: boolean; data: TrackWithRoster };

export function useTracks(status?: string, teacherId?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (teacherId) params.set('teacher', teacherId);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['tracks', status ?? '', teacherId ?? ''],
    queryFn: () => get<ListResponse>(`/tracks${qs}`).then((r) => r.data),
  });
}

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: ['tracks', id],
    queryFn: () => get<SingleWithRosterResponse>(`/tracks/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => post<SingleResponse>('/tracks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks'] }),
  });
}

export function useUpdateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      put<SingleResponse>(`/tracks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks'] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/tracks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks'] }),
  });
}

/** Moves a student onto this track — a transfer, not an addition, since
 * `Student.track` is the student's sole membership (single-track-per-student
 * is intentional; there is no "add without removing from elsewhere"). Replaces
 * the old `useEnrollStudent`/`useUnenrollStudent` pair. */
export function useAssignStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
      post<SingleResponse>(`/tracks/${id}/assign`, { studentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracks'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
```

- [ ] **Step 4: Update `lib/queries/quranPlan.ts` — replace lines 10-13 (target types)**

Replace:

```ts
export type PlanTeacher = { _id: string; name: string };
export type PlanHalqa = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanSpecialTrack = { _id: string; title: string };
```

With:

```ts
export type PlanTeacher = { _id: string; name: string };
export type PlanStudent = { _id: string; name: string };
export type PlanTrack = { _id: string; title: string };
```

- [ ] **Step 5: Replace lines 50-53 (`targetType`/`halqa`/`students`/`specialTrack` fields)**

Replace:

```ts
  targetType: 'halqa' | 'students' | 'specialTrack';
  halqa?: PlanHalqa | string;
  students?: (PlanStudent | string)[];
  specialTrack?: PlanSpecialTrack | string;
```

With:

```ts
  targetType: 'track' | 'students';
  track?: PlanTrack | string;
  students?: (PlanStudent | string)[];
```

- [ ] **Step 6: Replace lines 107-122 (`useQuranPlans`)**

```ts
export function useQuranPlans(
  filters?: { teacher?: string; track?: string; student?: string },
  opts?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.teacher) params.set('teacher', filters.teacher);
  if (filters?.track) params.set('track', filters.track);
  if (filters?.student) params.set('student', filters.student);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return useQuery({
    queryKey: ['quran-plans', filters?.teacher ?? '', filters?.track ?? '', filters?.student ?? ''],
    queryFn: () => get<ListResponse>(`/quran-plans${qs}`).then((r) => r.data),
    enabled: opts?.enabled,
  });
}
```

Every other export in this file (`planSegment`, `segmentReversed`, `useQuranPlan`, `useCreateQuranPlan`, `useUpdateQuranPlan`, `useGenerateSchedule`, `useUpdateScheduleEntry`, `useDeleteQuranPlan`, the whole per-student individual-plan-overlay section from `StudentOccurrenceStatus` down to `useReflowStudentPlan`) is untouched — none of it references `halqa`/`specialTrack`.

- [ ] **Step 7: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: many errors from every file still importing `lib/queries/halqat`, `lib/queries/specialTracks`, or reading `plan.halqa`/`plan.specialTrack`/`plan.targetType === 'halqa'`/`'specialTrack'` — these are exactly the files later tasks in this plan fix. Confirm the errors are ONLY in files this plan's later tasks touch; anything else is a scope gap to flag in the final report.

- [ ] **Step 8: Commit**

```bash
git add quran-hifz-mobile/lib/queries/tracks.ts quran-hifz-mobile/lib/queries/quranPlan.ts
git rm quran-hifz-mobile/lib/queries/halqat.ts quran-hifz-mobile/lib/queries/specialTracks.ts
git commit -m "feat(mobile): replace halqat/specialTracks queries with tracks.ts"
```

---

### Task 2: Context-field collapse across `attendance.ts`, `evaluations.ts`, `groupHomework.ts`, `homework.ts`, `lessonRecordings.ts`

**Files:**
- Modify: `quran-hifz-mobile/lib/queries/attendance.ts`
- Modify: `quran-hifz-mobile/lib/queries/evaluations.ts`
- Modify: `quran-hifz-mobile/lib/queries/groupHomework.ts`
- Modify: `quran-hifz-mobile/lib/queries/homework.ts`
- Modify: `quran-hifz-mobile/lib/queries/lessonRecordings.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (these are siblings) — every later task consumes this task's `track`-shaped filters/types.
- Produces: `AttendanceRecord.track?`/`AttendanceFilters.track?`/`useRecordAttendance`+`useBulkAttendance` body `.track?`; `EvaluationRecord.track?`/`EvaluationFilters.track?`/`useRubric` ctx `{track?, plan?}`/`useBulkEvaluate` body `.track?`; `GroupHomework.track?`/`GroupHomeworkFilters.track?`; `Homework.track?`/`HomeworkFilters.track?`; `LessonRecording.track?`/`LessonRecordingFilters.track?`.

- [ ] **Step 1: `lib/queries/attendance.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-21 (`AttendanceRecord`/`AttendanceFilters`):

```ts
export type AttendanceRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
};

export type AttendanceFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};
```

Replace lines 25-35 (`buildQuery`):

```ts
function buildQuery(filters?: AttendanceFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.track) params.set('track', filters.track);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const q = params.toString();
  return q ? `?${q}` : '';
}
```

Replace line 41 (`useAttendance`'s `enabled` guard):

```ts
    enabled: !!(filters?.student || filters?.track),
```

Replace lines 48-54 (`useRecordAttendance`'s `mutationFn` body type):

```ts
    mutationFn: (body: {
      student: string;
      track?: string;
      date: string;
      status: string;
    }) => post('/attendance', body),
```

Replace lines 72-77 (`useBulkAttendance`'s `mutationFn` body type):

```ts
    mutationFn: (body: {
      track?: string;
      date: string;
      records: { student: string; status: string }[];
    }) => post<BulkAttendanceResponse>('/attendance/bulk', body),
```

- [ ] **Step 2: `lib/queries/evaluations.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 12-33 (`EvaluationRecord`/`EvaluationFilters`):

```ts
export type EvaluationRecord = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher?: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  date: string;
  attendanceStatus: 'حاضر' | 'غائب';
  criteria?: EvaluationCriterion[];
  scores?: EvaluationScores;
  totalMax?: number;
  total: number;
  note?: string;
};

export type EvaluationFilters = {
  student?: string;
  track?: string;
  from?: string;
  to?: string;
};
```

Replace lines 37-47 (`buildQuery`):

```ts
function buildQuery(f?: EvaluationFilters) {
  if (!f) return '';
  const p = new URLSearchParams();
  if (f.student) p.set('student', f.student);
  if (f.track) p.set('track', f.track);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  const q = p.toString();
  return q ? `?${q}` : '';
}
```

Replace lines 85-96 (`useRubric`):

```ts
/** The rubric the evaluation screen should render for a track session. */
export function useRubric(ctx: { track?: string; plan?: string } | undefined) {
  const p = new URLSearchParams();
  if (ctx?.track) p.set('track', ctx.track);
  if (ctx?.plan) p.set('plan', ctx.plan);
  const q = p.toString();
  return useQuery({
    queryKey: ['evaluation-rubric', ctx],
    queryFn: () => get<RubricResponse>(`/evaluations/rubric${q ? `?${q}` : ''}`).then((r) => r.data),
    enabled: ctx !== undefined,
  });
}
```

Replace line 102 (`useBulkEvaluate`'s `mutationFn` body type):

```ts
    mutationFn: (body: { teacher: string; track?: string; plan?: string; date: string; records: BulkEvaluateRecord[] }) =>
```

- [ ] **Step 3: `lib/queries/groupHomework.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-18 (`GroupHomework`/`GroupHomeworkFilters`):

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

Replace lines 23-30 (`buildQuery`):

```ts
function buildQuery(filters?: GroupHomeworkFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.track) params.set('track', filters.track);
  const q = params.toString();
  return q ? `?${q}` : '';
}
```

- [ ] **Step 4: `lib/queries/homework.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-25 (`Homework`/`HomeworkFilters`):

```ts
export type Homework = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
  type: string;
  segment: string;
  dueDate: string;
  submittedAt?: string;
  status: 'مراجع' | 'معلق' | 'متأخر';
  rating?: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول';
  notes?: string;
};

export type HomeworkFilters = {
  student?: string;
  teacher?: string;
  track?: string;
  status?: string;
};
```

Replace lines 30-40 (`buildQuery`):

```ts
function buildQuery(filters?: HomeworkFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.track) params.set('track', filters.track);
  if (filters.status) params.set('status', filters.status);
  const q = params.toString();
  return q ? `?${q}` : '';
}
```

- [ ] **Step 5: `lib/queries/lessonRecordings.ts` — collapse `halqa`+`specialTrack` to `track`**

Replace lines 4-23 (`LessonRecording`/`LessonRecordingFilters`):

```ts
export type LessonRecording = {
  _id: string;
  student: { _id: string; name: string } | string;
  teacher: { _id: string; name: string } | string;
  track?: { _id: string; title: string } | string;
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
  track?: string;
};
```

Replace lines 28-36 (`buildQuery`):

```ts
function buildQuery(filters: LessonRecordingFilters) {
  const params = new URLSearchParams();
  if (filters.student) params.set('student', filters.student);
  if (filters.teacher) params.set('teacher', filters.teacher);
  if (filters.track) params.set('track', filters.track);
  const q = params.toString();
  return q ? `?${q}` : '';
}
```

- [ ] **Step 6: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: errors remain in every consumer file (fixed by later tasks). Confirm no NEW error categories appear beyond `halqa`/`specialTrack` references on these five files' types.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-mobile/lib/queries/attendance.ts quran-hifz-mobile/lib/queries/evaluations.ts quran-hifz-mobile/lib/queries/groupHomework.ts quran-hifz-mobile/lib/queries/homework.ts quran-hifz-mobile/lib/queries/lessonRecordings.ts
git commit -m "feat(mobile): collapse halqa/specialTrack fields to track across context queries"
```

---

### Task 3: `students.ts`, `teachers.ts`, `stats.ts`, `parent.ts`, `masajid.ts` — remaining query-layer field renames

**Files:**
- Modify: `quran-hifz-mobile/lib/queries/students.ts`
- Modify: `quran-hifz-mobile/lib/queries/teachers.ts`
- Modify: `quran-hifz-mobile/lib/queries/stats.ts`
- Modify: `quran-hifz-mobile/lib/queries/parent.ts`
- Modify: `quran-hifz-mobile/lib/queries/masajid.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Student.track` (replaces `Student.halqa`+`Student.masjid`), `StudentFilters.track` (replaces `.halqa`+`.specialTrack`; `.masjid` param is **kept** — server's `getStudents` still accepts `?masjid=` and resolves it via `Track.find({masjid})`), `Teacher.tracksCount?` (replaces `.halqatCount?`), `DashboardStats.totalTracks` (replaces `.totalHalqat`), `ParentChild.track` (replaces `.halqa`), `Masjid.gender` + `Masjid.tracks?` (new fields).

- [ ] **Step 1: `lib/queries/students.ts` — collapse `halqa`+`masjid` to `track`**

Replace lines 4-37 (the `Student` type and `StudentFilters` type):

```ts
export type Student = {
  _id: string;
  name: string;
  path: string;
  level?: number;
  /** Populated as `{title, daysPerWeek?, timeSlot?, masjid}` by the server —
   * `daysPerWeek`/`timeSlot` are present only from the single-student fetch,
   * not the list endpoint. No `teachers` field is ever populated here. */
  track:
    | { _id: string; title: string; daysPerWeek?: string; timeSlot?: string; masjid: { _id: string; name: string; location: string; gender: 'male' | 'female' } | string }
    | string;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  /** Legacy fields — real guardian identity comes from parentName/parentEmail below. */
  guardian: string;
  guardianPhone: string;
  /** Saudi national ID — 10 digits, leading 1 (مواطن) or 2 (مقيم). */
  nationalId?: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
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

Replace lines 43-53 (`buildQuery`):

```ts
function buildQuery(filters?: StudentFilters) {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.track) params.set('track', filters.track);
  if (filters.masjid) params.set('masjid', filters.masjid);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const q = params.toString();
  return q ? `?${q}` : '';
}
```

- [ ] **Step 2: `lib/queries/teachers.ts` — rename `halqatCount` → `tracksCount`**

Replace line 11:

```ts
  tracksCount?: number;
```

- [ ] **Step 3: `lib/queries/stats.ts` — rename `totalHalqat` → `totalTracks`**

Replace line 8:

```ts
  totalTracks: number;
```

- [ ] **Step 4: `lib/queries/parent.ts` — rename `halqa` → `track` on `ParentChild`**

Replace line 8:

```ts
  track: { _id: string; title: string } | string;
```

(This field is never actually populated server-side — see this plan's Architecture note — so it is always a bare id string at runtime; the object union is kept only for defensive typing parity with every other populated ref in this file, and to match web's `api/parent.ts` shape exactly.)

- [ ] **Step 5: `lib/queries/masajid.ts` — add `gender` + `tracks`**

Replace lines 4-8 (the `Masjid` type):

```ts
export type Masjid = {
  _id: string;
  name: string;
  location: string;
  gender: 'male' | 'female';
  /** The server's `getMasajid`/`getMasjid` select this exact field set — no
   * `studentCount` here (unlike `Track` from `lib/queries/tracks.ts`, whose
   * list endpoint computes it separately) — don't assume it's present. */
  tracks?: {
    _id: string;
    title: string;
    daysPerWeek: string;
    timeSlot: string;
    maxStudents: number;
    status: 'active' | 'upcoming' | 'ended';
    teachers: ({ _id: string; name: string } | string)[];
  }[];
};
```

Replace lines 28-34 (`useCreateMasjid`) to require `gender`:

```ts
export function useCreateMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; location: string; gender: 'male' | 'female' }) =>
      post<SingleResponse>('/masajid', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['masajid'] }),
  });
}
```

Replace lines 36-43 (`useUpdateMasjid`) to accept optional `gender`:

```ts
export function useUpdateMasjid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; location?: string; gender?: 'male' | 'female' }) =>
      put<SingleResponse>(`/masajid/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['masajid'] }),
  });
}
```

- [ ] **Step 6: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: errors remain in every consumer file (fixed by later tasks). Confirm no NEW error categories appear beyond `halqa`/`specialTrack`/`halqatCount`/`totalHalqat`-on-Student/Teacher/DashboardStats/ParentChild/Masjid references.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-mobile/lib/queries/students.ts quran-hifz-mobile/lib/queries/teachers.ts quran-hifz-mobile/lib/queries/stats.ts quran-hifz-mobile/lib/queries/parent.ts quran-hifz-mobile/lib/queries/masajid.ts
git commit -m "feat(mobile): rename remaining halqa-shaped fields to track across queries"
```

---

### Task 4: Delete dead code — `lib/types/*`, `lib/data/students.ts`

**Files:**
- Delete: `quran-hifz-mobile/lib/types/halqa.ts`
- Delete: `quran-hifz-mobile/lib/types/student.ts`
- Delete: `quran-hifz-mobile/lib/types/teacher.ts`
- Delete: `quran-hifz-mobile/lib/data/students.ts`

**Interfaces:** None — verified zero importers anywhere in the app except each other (`lib/types/halqa.ts`'s `Masjid.halqat: Halqa[]` references `lib/types/halqa.ts`'s own `Halqa`; `lib/data/students.ts` imports from `lib/types/student.ts`). This is an unreachable legacy parallel type system, entirely separate from the real `lib/queries/*` types every screen actually uses.

- [ ] **Step 1: Verify zero live importers (belt-and-suspenders check before deleting)**

```bash
cd quran-hifz-mobile && grep -rln "from '@/lib/types/halqa'\|from '@/lib/types/student'\|from '@/lib/types/teacher'\|from '@/lib/data/students'" app components lib
```

Expected: no output (the four doomed files may reference each other, which grep will show if you don't exclude them — confirm any hits are only from within these four files themselves).

- [ ] **Step 2: Delete the four files**

```bash
git rm quran-hifz-mobile/lib/types/halqa.ts quran-hifz-mobile/lib/types/student.ts quran-hifz-mobile/lib/types/teacher.ts quran-hifz-mobile/lib/data/students.ts
```

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: no new errors (confirms the zero-importer check was right).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(mobile): delete dead legacy halqa/student/teacher type system"
```

---

### Task 5: `components/domain/ContextCard.tsx` — single-kind rewrite

**Files:**
- Modify: `quran-hifz-mobile/components/domain/ContextCard.tsx`

**Interfaces:**
- Consumes: `Track` from Task 1's `lib/queries/tracks.ts`.
- Produces: `TeachingContext` (no `kind` field), `trackToContext(t)` (replaces `halqaToContext`+`trackToContext`) — consumed by Tasks 19-20 (`teacher/attendance.tsx`, `evaluate.tsx`, `grouphomework.tsx`, `recordlesson.tsx`).

This is a full rewrite of the 198-line file: drop `kind` from `TeachingContext`, delete `halqaToContext`, keep one `trackToContext` mapper (subtitle now sourced from `masjid`'s name instead of the dropped `location` field; `studentCount`/`capacity` from `studentCount`/`maxStudents` instead of `enrolledStudents.length`/`maxStudents`), and remove every `context.kind === ...` branch in the component body — including the header background color swap, which settles on one fixed color now that there is only one kind (confirmed decision, design doc §3/§6).

- [ ] **Step 1: Full replacement**

```tsx
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import type { Track } from '@/lib/queries/tracks';

type AppTheme = ReturnType<typeof useAppTheme>;

/**
 * Normalized shape for anything a teacher/student/admin can act on — always a
 * Track now that Halqa is gone. Mirrors web's `TeachingContext` type (see
 * quran-hifz/src/quran/components/common/ContextPicker.tsx).
 */
export type TeachingContext = {
  id: string;
  title: string;
  subtitle?: string;
  scheduleLabel?: string;
  studentCount?: number;
  capacity?: number;
  status?: 'active' | 'upcoming' | 'ended';
};

function getName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '';
}

export function trackToContext(t: Track): TeachingContext {
  return {
    id: t._id,
    title: t.title,
    subtitle: t.isOnline ? 'أونلاين' : getName(t.masjid),
    scheduleLabel: [t.daysPerWeek, t.timeSlot].filter(Boolean).join(' | '),
    studentCount: t.studentCount,
    capacity: t.maxStudents,
    status: t.status,
  };
}

const STATUS_LABEL: Record<NonNullable<TeachingContext['status']>, string> = {
  active: 'نشط',
  upcoming: 'قادم',
  ended: 'منتهي',
};
const STATUS_VARIANT: Record<NonNullable<TeachingContext['status']>, 'green' | 'gold' | 'gray'> = {
  active: 'green',
  upcoming: 'gold',
  ended: 'gray',
};

interface Props {
  context: TeachingContext;
  actions?: React.ReactNode;
  onPress?: () => void;
}

export default function ContextCard({ context, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasCapacity = typeof context.studentCount === 'number' && typeof context.capacity === 'number' && context.capacity > 0;
  const capacityPct = hasCapacity ? Math.round((context.studentCount! / context.capacity!) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerName} numberOfLines={1}>{context.title}</Text>
        {context.status ? (
          <Badge label={STATUS_LABEL[context.status]} variant={STATUS_VARIANT[context.status]} />
        ) : (
          <Badge label="مسار" variant="gold" />
        )}
      </View>

      <View style={styles.body}>
        {!!context.subtitle && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المكان</Text>
            <Text style={styles.rowValue}>{context.subtitle}</Text>
          </View>
        )}
        {!!context.scheduleLabel && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>المواعيد</Text>
            <Text style={styles.rowValue}>{context.scheduleLabel}</Text>
          </View>
        )}
        {typeof context.studentCount === 'number' && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>الطلاب</Text>
            <Text style={styles.rowValue}>
              {context.studentCount}{typeof context.capacity === 'number' ? ` / ${context.capacity}` : ''}
            </Text>
          </View>
        )}

        {hasCapacity && (
          <>
            <Text style={styles.capacityLabel}>الطاقة الاستيعابية</Text>
            <ProgressBar value={capacityPct} showPercent={false} />
          </>
        )}

        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: theme.radius,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: theme.greenAccent,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    headerName: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.white,
      flex: 1,
    },
    body: {
      padding: 14,
      gap: 7,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowLabel: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    rowValue: {
      fontSize: 12,
      fontFamily: theme.fontCairoBold,
      color: theme.text,
    },
    capacityLabel: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
      marginTop: 4,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
  });
}
```

Note for later tasks: every consumer currently imports `{ halqaToContext, trackToContext, type TeachingContext }` (or just `{ trackToContext }` for `TrackDetail.tsx`) — the import line becomes `{ trackToContext, type TeachingContext }` (drop `halqaToContext`) at each call site, handled per-consumer in Tasks 19-20.

- [ ] **Step 2: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `ContextCard.tsx` itself has no errors; every importer still errors on the now-missing `halqaToContext` export and `context.kind` reads (fixed in Tasks 19-20).

- [ ] **Step 3: Commit**

```bash
git add quran-hifz-mobile/components/domain/ContextCard.tsx
git commit -m "feat(mobile): simplify ContextCard to single-kind track card"
```

---

### Task 6: `components/domain/EvaluationRoster.tsx` — drop `kind`

**Files:**
- Modify: `quran-hifz-mobile/components/domain/EvaluationRoster.tsx`

**Interfaces:**
- Consumes: `useRubric`, `useEvaluations`, `useBulkEvaluate` from Task 2's `evaluations.ts` (now `track`-only filters).
- Produces: `RosterContext = { id: string }` (drops `kind`) — consumed by Task 7 (`TrackDetail.tsx`) and Task 19 (`teacher/attendance.tsx`).

- [ ] **Step 1: Replace lines 48-51 (`RosterContext`)**

```ts
export interface RosterContext {
  id: string;
}
```

- [ ] **Step 2: Update the doc comment on line 55 (`context` prop)**

Replace:

```ts
  /** The halqa or track the evaluation is filed under. */
  context: RosterContext;
```

With:

```ts
  /** The track the evaluation is filed under. */
  context: RosterContext;
```

- [ ] **Step 3: Replace line 161 (`contextFilter`)**

```ts
  const contextFilter = { track: context.id };
```

- [ ] **Step 4: Update line 108's comment (`planCoversStudent`)**

Replace:

```ts
    return true; // a halqa/track plan covers every student fetched under that context
```

With:

```ts
    return true; // a track plan covers every student fetched under that context
```

- [ ] **Step 5: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `EvaluationRoster.tsx` no longer errors on its own type; consumers (`TrackDetail.tsx`, `teacher/attendance.tsx`) still error until Tasks 7/19 update their `context={{ kind: ..., id: ... }}` call sites to `context={{ id: ... }}`.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz-mobile/components/domain/EvaluationRoster.tsx
git commit -m "feat(mobile): drop kind from EvaluationRoster's RosterContext"
```

---

### Task 7: `components/domain/TrackDetail.tsx` — drop `useHalqat`, direct `useStudents({track})`

**Files:**
- Modify: `quran-hifz-mobile/components/domain/TrackDetail.tsx`

**Interfaces:**
- Consumes: `useTracks`, `Track`, `TrackTeacher` from Task 1's `tracks.ts`; `useStudents` (Task 3's `track`-shaped `StudentFilters`); `useQuranPlans`/`useUpdateQuranPlan`/`QuranPlan.track` from Task 1's `quranPlan.ts`; `RosterContext = {id}` from Task 6.
- Produces: unchanged exported `TrackDetail({ trackId, role })` component — consumed by `admin/track-detail.tsx` and `teacher/track-detail.tsx` (thin wrappers, no change needed to either).

This is the second-largest single-file change in this plan (479 lines). The core simplification: the roster no longer needs deriving through `Halqa` — `Student.track` is now the sole membership mechanism, so `useStudents({track: track._id})` replaces the whole `useHalqat`+`halqaIdsInTrack`+`{halqa: ...}` chain, and `track.enrolledStudents` (dropped by the server) is replaced everywhere it was read for the roster/capacity count.

- [ ] **Step 1: Replace imports (lines 19-27)**

Replace:

```tsx
import {
  useSpecialTracks, type SpecialTrack, type EnrolledStudent, type TrackTeacher,
} from '@/lib/queries/specialTracks';
import { useHalqat } from '@/lib/queries/halqat';
import { useStudents } from '@/lib/queries/students';
import {
  useQuranPlans, useUpdateQuranPlan, segmentReversed, type QuranPlan,
} from '@/lib/queries/quranPlan';
```

With:

```tsx
import {
  useTracks, type Track, type TrackTeacher,
} from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import {
  useQuranPlans, useUpdateQuranPlan, segmentReversed, type QuranPlan,
} from '@/lib/queries/quranPlan';
```

- [ ] **Step 2: Replace lines 36-38 (helper functions) — drop `getEnrolledId`/`getEnrolledName`**

```tsx
function getTeacherName(v: TrackTeacher | string) { return typeof v === 'object' ? v.name : v; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' }); }
```

- [ ] **Step 3: Replace lines 51-58 (`STATUS_LABEL`/`STATUS_VARIANT`/`planTargetsTrack`) — type + field renames**

```tsx
const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function planTargetsTrack(plan: QuranPlan, trackId: string): boolean {
  const ref = plan.track;
  const id = typeof ref === 'object' ? ref?._id : ref;
  return id === trackId;
}
```

- [ ] **Step 4: Replace lines 91-92 (track fetch) — rename hook**

```tsx
  const { data: tracks = [], isLoading: loadingTrack } = useTracks(undefined, teacherScope);
  const track = tracks.find((t) => t._id === trackId);
```

- [ ] **Step 5: Delete lines 94-112 (the `useHalqat`/`halqaIdsInTrack`/`useStudents({halqa})` block) — replace with a direct roster query**

Remove entirely:

```tsx
  // This track's real roster lives on its halaqat, not on `enrolledStudents`
  // (that field is only for tracks with no halqa layer — direct enrollment).
  // Scope the halaqat to just the ones *this* teacher teaches within the
  // track, so a teacher sees their own students and not every halqa's; an
  // admin gets every halqa in the track.
  const { data: halqat = [] } = useHalqat(role === 'teacher' ? { teacher: profileId } : undefined);
  const halqaIdsInTrack = useMemo(
    () => halqat
      .filter((h) => {
        const ref = h.specialTrack;
        return (typeof ref === 'object' ? ref?._id : ref) === trackId;
      })
      .map((h) => h._id),
    [halqat, trackId],
  );
  const { data: halqaStudents = [] } = useStudents(
    { halqa: halqaIdsInTrack.join(',') },
    { enabled: halqaIdsInTrack.length > 0 },
  );
```

Replace with:

```tsx
  // `Student.track` is now the sole membership mechanism — the roster is a
  // direct query, no more halqa-mediated derivation.
  const { data: trackStudents = [] } = useStudents(
    { track: trackId },
    { enabled: !!track },
  );
```

- [ ] **Step 6: Replace lines 114-119 (linked-plan query) — rename filter + targetType**

```tsx
  const { data: linkedPlans = [] } = useQuranPlans({ track: trackId });
  // A plan can carry a stale `track` field left over from before its
  // targetType was switched to "students" (see planCoversStudent above), so
  // useQuranPlans({track}) can return several plans for this track — prefer
  // the one actually targeting the whole track over a narrower students-only
  // plan that merely still points at it.
  const linkedPlan = linkedPlans.find((p) => p.targetType === 'track') ?? linkedPlans[0];
```

- [ ] **Step 7: Replace the roster derivation (lines 161-172) — drop the `enrolledStudents` merge**

```tsx
  const roster = useMemo(
    () => trackStudents.map((st) => ({ _id: st._id, name: st.name })),
    [trackStudents],
  );
```

- [ ] **Step 8: Replace lines 189-190 (`enrolledCount`/`capacityPct`) — `enrolledStudents.length` → `roster.length`**

```tsx
  const enrolledCount = roster.length;
  const capacityPct = track.maxStudents > 0 ? Math.min(100, Math.round((enrolledCount / track.maxStudents) * 100)) : 0;
```

- [ ] **Step 9: Replace line 211 (`المكان` value) — `track.location` no longer exists**

```tsx
        <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.isOnline ? 'أونلاين' : (typeof track.masjid === 'object' ? track.masjid.name : track.masjid)}</Text>
```

- [ ] **Step 10: Replace line 301 (`EvaluationRoster`'s `context` prop) — drop `kind`**

```tsx
                context={{ id: trackId }}
```

- [ ] **Step 11: Replace lines 409-414 (`LinkPlanPanel`'s "ربط" mutation) — rename `specialTrack`→`track`**

```tsx
                      onPress={() => updatePlan.mutate(
                        { id: p._id, targetType: 'track', track: trackId },
                        { onSuccess: () => setShowLinkPanel(false) },
                      )}
```

- [ ] **Step 12: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `TrackDetail.tsx` no longer errors.

- [ ] **Step 13: Manual verification against the real dev server**

Start the mobile dev server and, logged in as a teacher, open a track's detail page: confirm the "الطلاب" tab shows the track's real students (via `Student.track`, not a halqa chain), confirm the "الخطة" tab still shows/links/creates a plan correctly, and confirm attendance/evaluation saving still works. This mirrors Phase 2's `TeacherTrackDetail.tsx` verification note — this file has the deepest behavioral surface of any shared component in this plan.

- [ ] **Step 14: Commit**

```bash
git add quran-hifz-mobile/components/domain/TrackDetail.tsx
git commit -m "feat(mobile): rewrite TrackDetail roster derivation via Student.track"
```

---

### Task 8: `components/domain/MasjidAccordion.tsx` + `admin/masajid.tsx` + `admin/masjid-form.tsx`

**Files:**
- Modify: `quran-hifz-mobile/components/domain/MasjidAccordion.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/admin/masajid.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/admin/masjid-form.tsx`

**Interfaces:**
- Consumes: `Masjid.tracks`/`Masjid.gender` from Task 3's `masajid.ts`.
- Produces: `MasjidAccordion({ masjid, actions })` (drops the `halqat` prop entirely — reads `masjid.tracks` directly).

- [ ] **Step 1: `MasjidAccordion.tsx` — accept `masjid.tracks` directly, rename fields**

Replace line 4-27 (imports + `nameOf` + `Props`):

```tsx
import { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutAnimation } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import {
  IconBuildingArch, IconChevronDown, IconChevronUp, IconUsers,
} from '@tabler/icons-react-native';
import type { Masjid } from '@/lib/queries/masajid';
import Badge from '@/components/ui/Badge';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

function nameOf(v: { name: string } | string | undefined): string {
  if (v && typeof v === 'object') return v.name;
  if (typeof v === 'string') return v;
  return '—';
}

interface Props {
  masjid: Masjid;
  /** Admin edit/delete buttons — rendered in the header, beside the count badge. */
  actions?: React.ReactNode;
}
```

Replace lines 30-83 (component body — drop the `halqat` prop, read `masjid.tracks` directly, rename fields; no `studentCount`/`capacity` numerator is available on this embedded shape per this plan's Architecture note, so the row shows `maxStudents` as capacity only, dropping the enrolled-count numerator that existed for halqat):

```tsx
export default function MasjidAccordion({ masjid, actions }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const tracks = masjid.tracks ?? [];

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.card}>
      {/* Plain style — NativeWind's interop drops the ({ pressed }) => … form. */}
      <Pressable onPress={toggle} style={styles.trigger}>
        <IconBuildingArch size={16} color={theme.gold} style={styles.triggerIcon} />
        {/* Name and location stack and wrap: a masjid name like "جامع الأمير متعب
            بن عبد العزيز" needs two lines, and on one row it used to run under
            the badge and the action buttons. */}
        <View style={styles.titles}>
          <Text style={styles.name} numberOfLines={2}>{masjid.name}</Text>
          <Text style={styles.location} numberOfLines={1}>{masjid.location}</Text>
        </View>
        {open
          ? <IconChevronUp size={16} color={theme.textMuted} />
          : <IconChevronDown size={16} color={theme.textMuted} />}
      </Pressable>

      {/* Count + admin actions on their own row, so nothing competes with the
          title for width and the buttons keep a full-size touch target. */}
      <View style={styles.metaRow}>
        <Badge label={`${tracks.length} مسارات`} variant="green" />
        {!!actions && <View style={styles.actions}>{actions}</View>}
      </View>

      {open && (
        <View style={styles.content}>
          {tracks.length === 0 && <Text style={styles.trackMeta}>لا توجد مسارات في هذا المسجد</Text>}
          {tracks.map((track) => (
            <View key={track._id} style={styles.trackRow}>
              <Text style={styles.trackName}>{track.title}</Text>
              <Text style={styles.trackMeta}>
                {track.teachers.map(nameOf).join('، ') || '—'} • {track.timeSlot}
              </Text>
              <View style={styles.trackBottom}>
                <View style={styles.countRow}>
                  <IconUsers size={12} color={theme.textMuted} />
                  <Text style={styles.countText}>حتى {track.maxStudents} طالب</Text>
                </View>
                <Badge label={track.status === 'active' ? 'نشط' : track.status === 'upcoming' ? 'قادم' : 'منتهي'} variant={track.status === 'active' ? 'green' : track.status === 'upcoming' ? 'gold' : 'gray'} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
```

Rename the style keys `halqaRow`/`halqaName`/`halqaMeta`/`halqaBottom` (lines 143-163) to `trackRow`/`trackName`/`trackMeta`/`trackBottom` — same property values, just renamed to match the new field's vocabulary:

```tsx
    trackRow: {
      backgroundColor: theme.cardAlt,
      borderRadius: theme.radiusSm,
      padding: 10,
      gap: 4,
    },
    trackName: {
      fontSize: 13,
      fontFamily: theme.fontCairoBold,
      color: theme.green,
    },
    trackMeta: {
      fontSize: 11,
      fontFamily: theme.fontCairo,
      color: theme.textMuted,
    },
    trackBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
```

- [ ] **Step 2: `admin/masajid.tsx` — drop the separate `useHalqat()` fetch**

Replace lines 14-16 (imports):

```tsx
import { useMasajid, useDeleteMasjid } from '@/lib/queries/masajid';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
```

Replace lines 29-39 (drop `halqatQuery`, `isLoading`/`isRefreshing`/`onRefresh` simplify to masjid-only):

```tsx
  const { data: masajid = [], isLoading, isError, isRefetching: isRefreshing, refetch: onRefresh } = useMasajid();

  const deleteMasjid = useDeleteMasjid();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);
```

Replace lines 61-64 (drop the now-unused `masjidIdOf` helper's only call site — the accordion no longer needs it since it reads `masjid.tracks` directly, so delete the `masjidIdOf` function entirely, lines 20-24) and replace the `<MasjidAccordion>` render (lines 73-89):

```tsx
          {masajid.map((masjid) => (
            <MasjidAccordion
              key={masjid._id}
              masjid={masjid}
              actions={
                <>
                  <IconButton accessibilityLabel="تعديل" onPress={() => router.push({ pathname: '/(portal)/admin/masjid-form', params: { id: masjid._id } } as any)}>
                    <IconPencil size={15} color={theme.textMuted} />
                  </IconButton>
                  <IconButton accessibilityLabel="حذف" tone="danger" onPress={() => setDeleteId(masjid._id)}>
                    <IconTrash size={15} color={theme.red} />
                  </IconButton>
                </>
              }
            />
          ))}
```

(Also delete the now-dead `masjidIdOf` function at lines 20-24 in the same pass — its only call site was the removed `halqat.filter(...)` line.)

- [ ] **Step 3: `admin/masjid-form.tsx` — add the required `gender` field**

Replace lines 4-6 (imports):

```tsx
import Text from '@/components/ui/Text';
import FormPage, { useFormPageStyles } from '@/components/ui/FormPage';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import { useMasajid, useCreateMasjid, useUpdateMasjid } from '@/lib/queries/masajid';
```

Replace lines 17-19 (state):

```tsx
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [error, setError] = useState('');
```

Replace lines 24-28 (prefill effect):

```tsx
  const existing = id ? masajid.find((m) => m._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setLocation(existing.location);
    setGender(existing.gender);
  }, [existing?._id]);
```

Replace lines 30-44 (`handleSubmit`):

```tsx
  async function handleSubmit() {
    if (!name.trim() || !location.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    try {
      setError('');
      const body = { name: name.trim(), location: location.trim(), gender };
      if (id) await updateMasjid.mutateAsync({ id, ...body });
      else await createMasjid.mutateAsync(body);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  }
```

Replace lines 53-57 (add the gender select after the location field):

```tsx
      <Text style={s.label}>اسم المسجد *</Text>
      <FormInput placeholder="مسجد النور" value={name} onChangeText={setName} />

      <Text style={s.label}>الموقع *</Text>
      <FormInput placeholder="حي السلام، الرياض" value={location} onChangeText={setLocation} />

      <Text style={s.label}>الجنس *</Text>
      <FormSelect
        value={gender}
        onChange={(v) => setGender(v as 'male' | 'female')}
        options={[
          { value: 'male', label: 'رجال (جامع)' },
          { value: 'female', label: 'نساء (دار)' },
        ]}
        title="الجنس"
      />
```

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `MasjidAccordion.tsx`, `admin/masajid.tsx`, `admin/masjid-form.tsx` no longer error.

- [ ] **Step 5: Manual verification against the real dev server**

Log in as admin, open "المساجد": confirm each masjid's accordion opens to show its tracks (title/teachers/timeSlot/capacity/status) instead of halqat; create/edit a masjid and confirm the gender select persists and round-trips.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz-mobile/components/domain/MasjidAccordion.tsx quran-hifz-mobile/app/\(portal\)/admin/masajid.tsx quran-hifz-mobile/app/\(portal\)/admin/masjid-form.tsx
git commit -m "feat(mobile): MasjidAccordion reads masjid.tracks directly, add gender field"
```

---

### Task 9: `components/domain/ReportsScreen.tsx` + `StudentReportPanel.tsx` + `IndividualPlanPanel.tsx`

**Files:**
- Modify: `quran-hifz-mobile/components/domain/ReportsScreen.tsx`
- Modify: `quran-hifz-mobile/components/domain/StudentReportPanel.tsx`
- Modify: `quran-hifz-mobile/components/domain/IndividualPlanPanel.tsx`

**Interfaces:**
- Consumes: `Track` from Task 1, `StudentFilters`/`EvaluationFilters` (`track`-only) from Tasks 2-3.
- Produces: `ReportsScreen({ baseFilter, tracks, scopeAllLabel, showAdmin?, kpis?, teachers? })` (drops the `halqat` prop entirely) — consumed by Task 16 (`admin/reports.tsx`) and Task 23 (`teacher/reports.tsx`).

- [ ] **Step 1: `ReportsScreen.tsx` — drop `halqat` prop, track-comparison leaderboard**

Replace lines 22-24 (imports — drop `Halqa`, rename `SpecialTrack`→`Track`):

```tsx
import type { Track } from '@/lib/queries/tracks';
import type { KPI } from '@/lib/queries/kpis';
import type { Teacher } from '@/lib/queries/teachers';
```

Replace lines 30-42 (helper functions — rename `evalHalqaId`/`evalHalqaName`):

```tsx
function studentIdOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student._id;
}
function studentNameOf(e: EvaluationRecord): string {
  return typeof e.student === 'string' ? e.student : e.student.name;
}
function evalTrackId(e: EvaluationRecord): string {
  return typeof e.track === 'object' ? (e.track?._id ?? '') : (e.track ?? '');
}
function evalTrackTitle(e: EvaluationRecord): string {
  return typeof e.track === 'object' ? (e.track?.title ?? '') : '';
}
```

Replace lines 97-107 (`Props`):

```tsx
interface Props {
  /** Scopes every widget to this cohort by default (admin: {} for school-wide; teacher: {track: '<id1>,<id2>,...'}). */
  baseFilter: StudentFilters;
  tracks: Track[];
  /** Label for the "no scope selected" tab, e.g. "كل المدرسة" / "كل مساراتي". */
  scopeAllLabel: string;
  showAdmin?: boolean;
  kpis?: KPI[];
  teachers?: Teacher[];
}
```

Replace line 111 (component signature):

```tsx
export default function ReportsScreen({ baseFilter, tracks, scopeAllLabel, showAdmin = false, kpis = [], teachers = [] }: Props) {
```

Replace lines 147-159 (`scopedFilter`/`scopeOptions`):

```tsx
  const scopedFilter: StudentFilters = useMemo(() => {
    if (scope === '') return baseFilter;
    if (scope.startsWith('track:')) return { track: scope.slice(6) };
    return baseFilter;
  }, [scope, baseFilter]);

  const scopeOptions: ScopeOption[] = useMemo(() => {
    const opts: ScopeOption[] = [{ value: '', label: scopeAllLabel, kind: 'all' }];
    tracks.forEach((t) => opts.push({ value: `track:${t._id}`, label: t.title, kind: 'track' }));
    return opts;
  }, [tracks, scopeAllLabel]);
```

Replace lines 232-259 (`halqaEvalStats` → `trackEvalStats`):

```tsx
  /* ── track comparison (only meaningful with >1 track in scope) ───────── */
  const trackEvalStats = useMemo(() => {
    const map = new Map<string, { name: string; sums: EvaluationScores & { total: number }; count: number }>();
    for (const e of evaluations) {
      const id = evalTrackId(e);
      if (!id) continue;
      const name = evalTrackTitle(e) || tracks.find((t) => t._id === id)?.title || '—';
      const entry = map.get(id) ?? { name, sums: { attendance: 0, hifz: 0, tajweed: 0, talawah: 0, total: 0 }, count: 0 };
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

Replace lines 326-334 (the CSV export's "مقارنة الحلقات" item — rename to tracks, `halqaEvalStats`→`trackEvalStats`, CSV column "الحلقة"→"المسار"):

```tsx
    {
      label: 'مقارنة المسارات (تقييم)',
      disabled: trackEvalStats.length === 0,
      run: () => shareCsv(
        'تقرير المسارات - تقييم',
        ['المسار', 'متوسط الحضور', 'متوسط الحفظ', 'متوسط التجويد', 'متوسط التلاوة', 'المتوسط الكلي', 'عدد الجلسات'],
        trackEvalStats.map((t) => [
          t.name, `${t.avgAttendance}%`, `${t.avgHifz}%`, `${t.avgTajweed}%`, `${t.avgTalawah}%`, t.avgTotal, t.count,
        ]),
      ),
    },
```

Replace lines 341-347 (the "ذوي المتابعة" export's per-row `st.halqa` read — `Student.track` now, one hop, field is `title` not `name`):

```tsx
      run: () => shareCsv(
        'تقرير الطلاب ذوي المتابعة',
        ['الطالب', 'المسار', 'نسبة الحضور', 'نسبة الإنجاز'],
        m.atRisk.map((st) => [
          st.name,
          typeof st.track === 'object' && st.track ? st.track.title : '—',
          `${st.attendancePct}%`,
          `${st.progressPct}%`,
        ]),
      ),
```

Replace lines 352-360 (`aggregateTitle`'s halqa/track branch — track-only now):

```tsx
  const selectedTrackForTitle = tracks.find((t) => `track:${t._id}` === scope);
  const aggregateTitle = selectedTrackForTitle
    ? `مقارنة طلاب ${selectedTrackForTitle.title}`
    : showAdmin
      ? 'متوسط الدرجات لكل طلاب المدرسة'
      : 'متوسط الدرجات لطلابك';
```

Replace lines 462-481 (the "مقارنة الحلقات" `Card` block — rename to tracks, `halqaEvalStats`→`trackEvalStats`, `h.name`→`h.name` unchanged since the local var is still named `h` in the `.map` — rename to `t` for clarity):

```tsx
              {/* Track comparison — only when more than one track has eval data in scope */}
              {trackEvalStats.length > 1 && (
                <Card>
                  <CardHeader title="مقارنة المسارات في التقييم" subtitle={`${trackEvalStats.length} مسار`} />
                  <View style={styles.section}>
                    {trackEvalStats.map((t) => (
                      <View key={t.name} style={styles.halqaRow}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.bold} numberOfLines={1}>{t.name}</Text>
                          <Text style={[styles.bold, { color: theme.green }]}>{t.avgTotal}/{TOTAL_MAX}</Text>
                        </View>
                        <ProgressBar value={t.avgTotal} max={TOTAL_MAX} color={theme.green} showPercent={false} />
                        <Text style={styles.mutedSmall}>
                          حضور {t.avgAttendance}٪ · حفظ {t.avgHifz}٪ · تجويد {t.avgTajweed}٪ · تلاوة {t.avgTalawah}٪ · {t.count} جلسة
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}
```

(The `halqaRow` style key at line 133 is left as-is — a style name, not a data field, out of scope for this rename per the "no other redesign" constraint; only reader-facing labels and data fields change.)

- [ ] **Step 2: `StudentReportPanel.tsx` — narrow `aggregateFilter`**

Replace line 64:

```ts
  aggregateFilter: { track?: string };
```

No other change — every internal read of `aggregateFilter` is a pass-through spread into `useEvaluations(aggregateFilter)` (line 85), which already works once the type narrows.

- [ ] **Step 3: `IndividualPlanPanel.tsx` — comment-only fix**

Replace line 32:

```tsx
  /** The shared track plan this student's overlay hangs off — used as the
```

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: all three files no longer error on their own types; `admin/reports.tsx`/`teacher/reports.tsx` (Tasks 16/23) still error on their `halqat` prop until fixed there.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/components/domain/ReportsScreen.tsx quran-hifz-mobile/components/domain/StudentReportPanel.tsx quran-hifz-mobile/components/domain/IndividualPlanPanel.tsx
git commit -m "feat(mobile): ReportsScreen track-comparison leaderboard, drop halqat prop"
```

---

### Task 10: `components/ui/ScopeTabs.tsx` — drop `'halqa'` from the kind union

**Files:**
- Modify: `quran-hifz-mobile/components/ui/ScopeTabs.tsx`

**Interfaces:**
- Produces: `ScopeOption.kind?: 'all' | 'track'` (drops `'halqa'`) — consumed by Task 9 (`ReportsScreen.tsx`, already updated to only ever pass `'all'`/`'track'`) and `teacher/students.tsx` (Task 18, updated to drop its `halqa:<id>` filter variant).

- [ ] **Step 1: Replace lines 1-15 (imports + `ScopeOption`) — drop `IconSchool`**

```tsx
import { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { IconRoute, IconUsers } from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

export interface ScopeOption {
  value: string;
  label: string;
  /** Drives the chip's icon: the "all" tab or a track. */
  kind?: 'all' | 'track';
}
```

- [ ] **Step 2: Replace lines 33-39 (`iconFor`) — drop the `'halqa'` branch**

```tsx
  function iconFor(opt: ScopeOption, active: boolean) {
    const color = active ? theme.white : theme.textMuted;
    if (opt.kind === 'track') return <IconRoute size={14} color={color} />;
    if (opt.kind === 'all') return <IconUsers size={14} color={color} />;
    return null;
  }
```

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `ScopeTabs.tsx` no longer errors.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-mobile/components/ui/ScopeTabs.tsx
git commit -m "feat(mobile): drop halqa kind from ScopeTabs"
```

---

### Task 11: Delete dead screens — `admin/halqat.tsx`, `admin/halqa-form.tsx`, `teacher/myhalqa.tsx`, `HalqaCard.tsx`

**Files:**
- Delete: `quran-hifz-mobile/app/(portal)/admin/halqat.tsx`
- Delete: `quran-hifz-mobile/app/(portal)/admin/halqa-form.tsx`
- Delete: `quran-hifz-mobile/app/(portal)/teacher/myhalqa.tsx`
- Delete: `quran-hifz-mobile/components/domain/HalqaCard.tsx`

**Interfaces:** None produced. `HalqaCard.tsx`'s two importers are `admin/halqat.tsx` (deleted in this same task) and `admin/dashboard.tsx` (edited in Task 15 — until Task 15 runs, `admin/dashboard.tsx`'s `import HalqaCard from '@/components/domain/HalqaCard'` will dangle; this is expected and matches this plan's typecheck-progression pattern, same as Phase 2's web plan deferred a handful of fixes to its final routing task).

- [ ] **Step 1: Delete the two admin Halqa CRUD screens**

```bash
git rm quran-hifz-mobile/app/\(portal\)/admin/halqat.tsx quran-hifz-mobile/app/\(portal\)/admin/halqa-form.tsx
```

- [ ] **Step 2: Delete the teacher myhalqa screen**

```bash
git rm quran-hifz-mobile/app/\(portal\)/teacher/myhalqa.tsx
```

- [ ] **Step 3: Delete `HalqaCard.tsx`**

```bash
git rm quran-hifz-mobile/components/domain/HalqaCard.tsx
```

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: new errors in `admin/dashboard.tsx` (missing `HalqaCard` import — fixed in Task 15) and in `lib/constants/portals.ts`/the three `_layout.tsx` files (dangling `halqat`/`halqa-form`/`myhalqa` route references — fixed in Task 28). No other new errors.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(mobile): delete superseded halqa CRUD screens and HalqaCard"
```

---

### Task 12: `admin/special_tracks.tsx` → `admin/tracks.tsx` (903 lines, largest file in this phase)

**Files:**
- Delete: `quran-hifz-mobile/app/(portal)/admin/special_tracks.tsx`
- Create: `quran-hifz-mobile/app/(portal)/admin/tracks.tsx`

**Interfaces:**
- Consumes: `useTracks`, `useCreateTrack`, `useUpdateTrack`, `useDeleteTrack`, `useAssignStudent`, `Track`, `TrackTeacher` from Task 1's `tracks.ts`; `useStudents`, `Student` from Task 3's `students.ts` (its `track` field, one-hop); `useMasajid` (Task 3's `gender`-bearing `Masjid`); `useQuranPlans`/`segmentReversed` from Task 1's `quranPlan.ts` (`targetType: 'track'`, `track` filter).
- Produces: exported `AdminTracks` component — consumed by Task 28's `admin/_layout.tsx` (registered under the route name `tracks`, promoted into the now-vacant visible-tab slot that `halqat` occupied).

This is a full rewrite of the 903-line `admin/special_tracks.tsx`, changing: the import (`specialTracks`→`tracks`, `SpecialTrack`→`Track`, drop `EnrolledStudent`), dropping the `location` field (replaced by a required `masjid` FK select sourced from `useMasajid()`) and the `enrolledStudents` field (replaced by the server-computed `Track.studentCount`), and replacing the whole enroll/unenroll student-management panel with a single "نقل طالب" (transfer) action calling `useAssignStudent` — every assignment is a transfer, never an add, since a student can only ever be on one track (there is no "enrolled list" to manage independently; the roster is `allStudents.filter(s => s.track matches this track)`, a live derived view, not a stored array).

- [ ] **Step 1: Delete the old file**

```bash
git rm quran-hifz-mobile/app/\(portal\)/admin/special_tracks.tsx
```

- [ ] **Step 2: Create `admin/tracks.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView, View, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform, Modal, Linking,
} from 'react-native';
import {
  IconAlertCircle, IconBuildingArch, IconCalendar, IconCalendarEvent, IconCalendarOff,
  IconCalendarRepeat, IconChevronDown, IconChevronUp, IconClock, IconMapPin, IconPencil,
  IconTarget, IconTrash, IconUserCheck, IconUserOff, IconUsers, IconVideo, IconWifi,
} from '@tabler/icons-react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormInput from '@/components/forms/FormInput';
import FormSelect from '@/components/forms/FormSelect';
import FormDatePicker from '@/components/forms/FormDatePicker';
import {
  useTracks,
  useCreateTrack,
  useUpdateTrack,
  useDeleteTrack,
  useAssignStudent,
  type Track,
  type TrackTeacher,
} from '@/lib/queries/tracks';
import { useTeachers } from '@/lib/queries/teachers';
import { useStudents } from '@/lib/queries/students';
import { useMasajid } from '@/lib/queries/masajid';
import { useQuranPlans, segmentReversed } from '@/lib/queries/quranPlan';
import { SURAHS } from '@/lib/data/surahs';
import { orientSlice } from '@/lib/quranRange';
import { fmtDateShort } from '@/lib/date';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;
type Styles = ReturnType<typeof createS>;

function getTeacherId(v: TrackTeacher | string) {
  return typeof v === 'object' ? v._id : v;
}
function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function surahName(n: number) {
  return SURAHS.find((s) => s.number === n)?.name ?? '';
}
/** First letter of the first two words — the same initials the web cards show. */
function avatarInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
}

const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

const TYPE_OPTS = ['مراجعة مكثّفة', 'تجويد', 'إجازة', 'ختمة مسرّعة', 'برنامج رمضاني', 'تحضير مسابقة', 'أخرى'];
const DAYS_OPTS = [
  'يومياً',
  'السبت والثلاثاء',
  'السبت والاثنين والأربعاء',
  'عطلة نهاية الأسبوع',
  'ثلاث مرات أسبوعياً',
  'مرتين أسبوعياً',
];
/** Sentinel for the "أخرى (أدخل يدوياً)" option, mirroring the web selects. */
const CUSTOM = '__custom__';

/** Rotating chip tones for teacher/student avatars — theme.tone so dark mode holds. */
function avatarTone(theme: AppTheme, i: number) {
  const order = ['green', 'gold', 'blue', 'red'] as const;
  return theme.tone[order[i % order.length]];
}

/** Capacity ink: red once nearly full, amber when filling, green otherwise. */
function capacityColor(theme: AppTheme, pct: number) {
  if (pct >= 90) return theme.red;
  if (pct >= 70) return theme.amber;
  return theme.mode === 'dark' ? theme.greenLight : theme.green;
}

type FormFields = {
  title: string;
  type: string;
  timeSlot: string;
  masjid: string;
  isOnline: boolean;
  meetLink: string;
  teachers: string[];
  maxStudents: string;
  startDate: string;
  endDate: string;
  daysPerWeek: string;
  status: Track['status'];
  notes: string;
};
const EMPTY: FormFields = {
  title: '', type: '', timeSlot: '', masjid: '', isOnline: false, meetLink: '',
  teachers: [], maxStudents: '30', startDate: '', endDate: '', daysPerWeek: '',
  status: 'upcoming', notes: '',
};

export default function AdminTracks() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const { data: tracks = [], isLoading, isRefetching, refetch } = useTracks();
  const { data: teachers = [], isRefetching: teachersRefetching, refetch: refetchTeachers } = useTeachers();
  const { data: allStudents = [], isRefetching: studentsRefetching, refetch: refetchStudents } = useStudents();
  const { data: masajid = [] } = useMasajid();

  const refreshing = isRefetching || teachersRefetching || studentsRefetching;
  const onRefresh = () => {
    refetch();
    refetchTeachers();
    refetchStudents();
  };

  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack();
  const deleteTrack = useDeleteTrack();
  const assignStudent = useAssignStudent();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [studentsPanelId, setStudentsPanelId] = useState<string | null>(null);
  const [addStudentId, setAddStudentId] = useState('');
  const [studentsSearch, setStudentsSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Free-text fallback: the days picker lists preset patterns and can drop to
  // a manual entry the way the web select does.
  const [customDays, setCustomDays] = useState(false);

  function sf<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleTeacher(id: string) {
    setForm((f) => ({
      ...f,
      teachers: f.teachers.includes(id) ? f.teachers.filter((x) => x !== id) : [...f.teachers, id],
    }));
  }

  function openAdd() {
    setForm(EMPTY);
    setFormError('');
    setEditId(null);
    setCustomDays(false);
    setShowForm(true);
  }

  function openEdit(t: Track) {
    const d = (v: string) => (v ? new Date(v).toISOString().split('T')[0] : '');
    setForm({
      title: t.title,
      type: t.type,
      timeSlot: t.timeSlot,
      masjid: typeof t.masjid === 'object' ? t.masjid._id : t.masjid,
      isOnline: t.isOnline,
      meetLink: t.meetLink ?? '',
      teachers: t.teachers.map(getTeacherId),
      maxStudents: String(t.maxStudents),
      startDate: d(t.startDate),
      endDate: d(t.endDate),
      daysPerWeek: t.daysPerWeek,
      status: t.status,
      notes: t.notes ?? '',
    });
    setCustomDays(!!t.daysPerWeek && !DAYS_OPTS.includes(t.daysPerWeek));
    setFormError('');
    setEditId(t._id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setFormError('اسم المسار مطلوب'); return; }
    if (!form.type.trim()) { setFormError('نوع المسار مطلوب'); return; }
    if (form.teachers.length === 0) { setFormError('يرجى اختيار معلم واحد على الأقل'); return; }
    if (!form.timeSlot.trim()) { setFormError('وقت الجلسة مطلوب'); return; }
    if (!form.daysPerWeek.trim()) { setFormError('الأيام مطلوبة'); return; }
    if (!form.startDate || !form.endDate) { setFormError('التواريخ مطلوبة'); return; }
    if (form.isOnline && !form.meetLink.trim()) { setFormError('رابط الجلسة مطلوب'); return; }
    if (!form.masjid) { setFormError('يرجى اختيار المسجد'); return; }

    const body = {
      title: form.title.trim(),
      type: form.type.trim(),
      status: form.status,
      timeSlot: form.timeSlot.trim(),
      masjid: form.masjid,
      isOnline: form.isOnline,
      meetLink: form.isOnline ? form.meetLink.trim() : '',
      teachers: form.teachers,
      maxStudents: Number(form.maxStudents) || 30,
      startDate: form.startDate,
      endDate: form.endDate,
      daysPerWeek: form.daysPerWeek.trim(),
      notes: form.notes.trim(),
    };

    try {
      setFormError('');
      if (editId) await updateTrack.mutateAsync({ id: editId, ...body });
      else await createTrack.mutateAsync(body);
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }

  const isPending = createTrack.isPending || updateTrack.isPending;

  // Same three buckets the web page renders, in the same order.
  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  function trackIdOf(v: Student['track']): string {
    return typeof v === 'object' ? v._id : v;
  }

  /** Read-mostly panel: shows who is currently on the track (a live query, not
   * a stored array) and offers "نقل طالب" (moves a student's `track` field
   * here), never "add" alongside an existing track — a student always
   * belongs to exactly one track, so there is no per-track enroll list to
   * manage independently, and no unassign without moving elsewhere. */
  function renderTransferPanel(t: Track) {
    if (studentsPanelId !== t._id) return null;

    const enrolled = allStudents.filter((st) => trackIdOf(st.track) === t._id);
    const enrolledCnt = enrolled.length;
    const capPct = Math.min(100, Math.round((enrolledCnt / t.maxStudents) * 100));
    const barClr = capacityColor(theme, capPct);
    const isFull = enrolledCnt >= t.maxStudents;
    const q = studentsSearch.trim();
    const available = allStudents.filter((st) => trackIdOf(st.track) !== t._id && (!q || st.name.includes(q)));
    const shown = enrolled.filter((st) => !q || st.name.includes(q));

    return (
      <View style={s.studentsPanel}>
        <Text style={s.panelTitle}>إدارة طلاب المسار</Text>

        <View style={s.capacityBox}>
          <View style={s.capacityHead}>
            <View style={s.iconLabel}>
              <IconUserCheck size={14} color={theme.textMuted} />
              <Text style={s.capacityLabel}>طاقة المسار</Text>
            </View>
            <Text style={[s.capacityValue, { color: barClr }]}>{enrolledCnt} / {t.maxStudents}</Text>
          </View>
          <View style={s.capacityTrack}>
            <View style={[s.capacityFill, { width: `${capPct}%`, backgroundColor: barClr }]} />
          </View>
          {isFull && (
            <View style={[s.iconLabel, { marginTop: 8 }]}>
              <IconAlertCircle size={13} color={theme.red} />
              <Text style={s.fullWarning}>وصل المسار للحد الأقصى</Text>
            </View>
          )}
        </View>

        {!isFull && (
          <View style={s.addStudentBox}>
            <Text style={s.addStudentLabel}>نقل طالب إلى هذا المسار</Text>
            <View style={s.row}>
              <View style={s.flex1}>
                <FormSelect
                  value={addStudentId}
                  onChange={setAddStudentId}
                  options={available.map((st) => ({ value: st._id, label: st.name }))}
                  placeholder="اختر طالباً"
                />
              </View>
              <Button
                label="نقل"
                onPress={() => {
                  if (!addStudentId) return;
                  assignStudent.mutate({ id: t._id, studentId: addStudentId });
                  setAddStudentId('');
                }}
                disabled={!addStudentId || assignStudent.isPending}
              />
            </View>
          </View>
        )}

        <View style={s.enrolledHead}>
          <Text style={s.enrolledTitle}>الطلاب المسجّلون</Text>
          {enrolledCnt > 0 && (
            <View style={s.searchBox}>
              <FormInput placeholder="بحث..." value={studentsSearch} onChangeText={setStudentsSearch} />
            </View>
          )}
        </View>

        {enrolledCnt === 0 ? (
          <View style={s.emptyBox}>
            <IconUserOff size={26} color={theme.textMuted} />
            <Text style={s.muted}>لا يوجد طلاب مسجّلون بعد</Text>
          </View>
        ) : (
          shown.map((st, idx) => {
            const tone = avatarTone(theme, idx);
            return (
              <View key={st._id} style={s.studentRow}>
                <View style={s.studentIdentity}>
                  <View style={[s.avatar, { backgroundColor: tone.bg }]}>
                    <Text style={[s.avatarText, { color: tone.text }]}>{avatarInitials(st.name)}</Text>
                  </View>
                  <View style={s.flex1}>
                    <Text style={s.studentName} numberOfLines={1}>{st.name}</Text>
                    <Text style={s.studentIndex}>#{idx + 1}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Pressable onPress={() => { setStudentsPanelId(null); setStudentsSearch(''); }}>
          <Text style={s.closeText}>إغلاق</Text>
        </Pressable>
      </View>
    );
  }

  function renderSection(label: string, color: string, list: Track[], dimmed?: boolean) {
    if (list.length === 0) return null;
    return (
      <View style={s.section}>
        <View style={s.sectionHead}>
          <View style={[s.sectionBar, { backgroundColor: color }]} />
          <Text style={s.sectionLabel}>{label}</Text>
          <View style={[s.sectionCount, { backgroundColor: theme.cardAlt }]}>
            <Text style={[s.sectionCountText, { color }]}>{list.length}</Text>
          </View>
        </View>
        <View style={[s.sectionList, dimmed && s.dimmed]}>
          {list.map((t) => (
            <TrackCard
              key={t._id}
              t={t}
              theme={theme}
              s={s}
              onOpen={() => router.push({ pathname: '/(portal)/admin/track-detail', params: { id: t._id } } as any)}
              onManageStudents={() => {
                setStudentsPanelId((cur) => (cur === t._id ? null : t._id));
                setAddStudentId('');
                setStudentsSearch('');
              }}
              onEdit={() => openEdit(t)}
              onDelete={() => setDeleteId(t._id)}
            >
              {renderTransferPanel(t)}
            </TrackCard>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {saved && <Text style={s.successBanner}>تم حفظ المسار ✓</Text>}

        <Pressable style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ مسار جديد</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title={editId ? 'تعديل المسار' : 'إضافة مسار جديد'} />
            {!!formError && <Text style={s.errorText}>{formError}</Text>}

            <Text style={s.label}>اسم المسار</Text>
            <FormInput placeholder="مثال: حلقات الصيف" value={form.title} onChangeText={(v) => sf('title', v)} />

            <Text style={s.label}>النوع</Text>
            <FormSelect
              value={form.type}
              onChange={(v) => sf('type', v)}
              options={TYPE_OPTS.map((o) => ({ value: o, label: o }))}
              placeholder="اختر النوع"
            />

            <Text style={s.label}>الحالة</Text>
            <FormSelect
              value={form.status}
              onChange={(v) => sf('status', v as Track['status'])}
              options={[
                { value: 'upcoming', label: 'قادم' },
                { value: 'active', label: 'نشط' },
                { value: 'ended', label: 'منتهي' },
              ]}
            />

            <Text style={s.label}>المسجد</Text>
            <FormSelect
              value={form.masjid}
              onChange={(v) => sf('masjid', v)}
              options={masajid.map((m) => ({ value: m._id, label: m.name }))}
              placeholder="اختر المسجد"
            />

            <Text style={s.label}>المعلمون المسؤولون</Text>
            <View style={s.teacherList}>
              {teachers.length === 0 && <Text style={s.muted}>لا يوجد معلمون مسجّلون</Text>}
              {teachers.map((t) => {
                const selected = form.teachers.includes(t._id);
                return (
                  <Pressable haptic="select" key={t._id} style={[s.teacherChip, selected && s.teacherChipActive]} onPress={() => toggleTeacher(t._id)}>
                    <Text style={[s.teacherChipText, selected && s.teacherChipTextActive]}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.rowGroup}>
              <Pressable
                haptic="select"
                style={[s.onlineToggle, !form.isOnline && s.onlineToggleActive]}
                onPress={() => sf('isOnline', false)}
              >
                <Text style={[s.onlineToggleText, !form.isOnline && s.onlineToggleTextActive]}>حضوري</Text>
              </Pressable>
              <Pressable
                haptic="select"
                style={[s.onlineToggle, form.isOnline && s.onlineToggleActive]}
                onPress={() => sf('isOnline', true)}
              >
                <Text style={[s.onlineToggleText, form.isOnline && s.onlineToggleTextActive]}>أونلاين</Text>
              </Pressable>
            </View>

            {form.isOnline && (
              <>
                <Text style={s.label}>رابط الجلسة</Text>
                <FormInput placeholder="https://meet.google.com/xxx" value={form.meetLink} onChangeText={(v) => sf('meetLink', v)} />
              </>
            )}

            <Text style={s.label}>الوقت</Text>
            <FormInput placeholder="بعد الفجر | ٦:١٠ – ٧:٣٠" value={form.timeSlot} onChangeText={(v) => sf('timeSlot', v)} />

            <Text style={s.label}>الأيام</Text>
            <FormSelect
              value={customDays ? CUSTOM : form.daysPerWeek}
              onChange={(v) => {
                if (v === CUSTOM) { setCustomDays(true); sf('daysPerWeek', ''); }
                else { setCustomDays(false); sf('daysPerWeek', v); }
              }}
              options={[
                ...DAYS_OPTS.map((o) => ({ value: o, label: o })),
                { value: CUSTOM, label: 'أخرى (أدخل يدوياً)' },
              ]}
              placeholder="اختر الأيام"
            />
            {customDays && (
              <View style={{ marginTop: 6 }}>
                <FormInput placeholder="مثال: السبت والثلاثاء والخميس" value={form.daysPerWeek} onChangeText={(v) => sf('daysPerWeek', v)} />
              </View>
            )}

            <Text style={s.label}>تاريخ البداية</Text>
            <FormDatePicker value={form.startDate} onChange={(v) => sf('startDate', v)} />

            <Text style={s.label}>تاريخ النهاية</Text>
            <FormDatePicker value={form.endDate} onChange={(v) => sf('endDate', v)} minimumDate={form.startDate ? new Date(form.startDate) : undefined} />

            <Text style={s.label}>الحد الأقصى للطلاب</Text>
            <FormInput placeholder="30" keyboardType="number-pad" value={form.maxStudents} onChangeText={(v) => sf('maxStudents', v)} />

            <Text style={s.label}>ملاحظات</Text>
            <FormInput placeholder="أي معلومات إضافية..." value={form.notes} onChangeText={(v) => sf('notes', v)} />

            <View style={s.row}>
              <Button label={isPending ? 'جارٍ الحفظ...' : 'حفظ'} onPress={handleSubmit} disabled={isPending} style={s.flex1} />
              <Button label="إلغاء" variant="ghost" onPress={() => setShowForm(false)} style={s.flex1} />
            </View>
          </Card>
        )}

        {isLoading && <SkeletonRows count={4} />}

        {!isLoading && tracks.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <IconCalendarEvent size={30} color={theme.mode === 'dark' ? theme.greenLight : theme.green} />
            </View>
            <Text style={s.emptyTitle}>لا توجد مسارات بعد</Text>
            <Text style={s.emptySub}>أضف أول مسار</Text>
            <Button label="+ مسار جديد" onPress={openAdd} />
          </View>
        )}

        {!isLoading && renderSection('المسارات النشطة', theme.mode === 'dark' ? theme.greenLight : theme.green, active)}
        {!isLoading && renderSection('المسارات القادمة', theme.amber, upcoming)}
        {!isLoading && renderSection('المسارات المنتهية', theme.textMuted, ended, true)}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!deleteId} transparent animationType="fade" onRequestClose={() => setDeleteId(null)}>
        <Pressable haptic="none" style={s.overlay} onPress={() => setDeleteId(null)}>
          <Pressable haptic="none" style={s.dialog} onPress={() => {}}>
            <View style={s.dialogIcon}>
              <IconTrash size={26} color={theme.red} />
            </View>
            <Text style={s.dialogTitle}>حذف المسار</Text>
            <Text style={s.dialogBody}>سيُحذف المسار نهائياً ولا يمكن التراجع.</Text>
            <View style={s.dialogActions}>
              <View style={s.flex1}>
                <Button
                  label={deleteTrack.isPending ? 'جارٍ الحذف...' : 'حذف'}
                  variant="danger"
                  fullWidth
                  onPress={async () => {
                    if (!deleteId) return;
                    await deleteTrack.mutateAsync(deleteId);
                    setDeleteId(null);
                  }}
                  disabled={deleteTrack.isPending}
                />
              </View>
              <View style={s.flex1}>
                <Button label="إلغاء" variant="ghost" fullWidth onPress={() => setDeleteId(null)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Track card ──────────────────────────────────────────────
 * Its own component so each card can run the `useQuranPlans` lookup for the
 * plan linked to that track — the same per-card query the web page makes.  */
function TrackCard({
  t, theme, s, onOpen, onManageStudents, onEdit, onDelete, children,
}: {
  t: Track;
  theme: AppTheme;
  s: Styles;
  onOpen: () => void;
  onManageStudents: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const { data: linkedPlans = [] } = useQuranPlans({ track: t._id });
  // A plan keeps its `track` ref after its targetType is switched to
  // "students", so this filter can return several plans for one track. Prefer
  // the one actually targeting the whole track, or this card's "مقرَّر اليوم"
  // disagrees with the track-detail screen for the same track.
  const linkedPlan = linkedPlans.find((p) => p.targetType === 'track') ?? linkedPlans[0];

  const enrolled = t.studentCount ?? 0;
  const pct = Math.min(100, Math.round((enrolled / t.maxStudents) * 100));
  const barClr = capacityColor(theme, pct);
  const statusTone = theme.tone[STATUS_VARIANT[t.status]];
  const stripColor = t.status === 'active'
    ? (theme.mode === 'dark' ? theme.greenLight : theme.green)
    : t.status === 'upcoming' ? theme.amber : theme.border;

  const todayText = (() => {
    const list = linkedPlan?.todayAssignments ?? [];
    if (list.length === 0) return 'لا يوجد جزء مخصص لليوم';
    const multi = list.length > 1;
    // Direction is per segment — read it from the type that is actually due.
    return list.map((entry) => {
      const a = orientSlice(entry, segmentReversed(linkedPlan!, entry.type));
      const pages = a.pageEnd !== a.pageStart ? `${a.pageStart} - ${a.pageEnd}` : `${a.pageStart}`;
      const label = multi ? `مقرَّر اليوم (${entry.type})` : 'مقرَّر اليوم';
      return `${label}: ${surahName(a.surahStart)} : ${a.ayahStart} — ${surahName(a.surahEnd)} : ${a.ayahEnd} (صفحة ${pages})`;
    }).join('\n');
  })();

  return (
    <Card noPadding>
      <View style={[s.strip, { backgroundColor: stripColor }]} />
      <View style={s.cardBody}>
      {/* Tapping the card opens the track detail — the students panel sits
          OUTSIDE this Pressable so a stray tap in it doesn't navigate away. */}
      <Pressable haptic="none" style={s.cardMain} onPress={onOpen}>
        {/* chips */}
        <View style={s.chipsRow}>
          <Badge label={STATUS_LABEL[t.status]} variant={STATUS_VARIANT[t.status]} />
          <View style={[s.chip, { backgroundColor: statusTone.bg }]}>
            <Text style={[s.chipText, { color: statusTone.text }]} numberOfLines={1}>{t.type}</Text>
          </View>
          <View style={[s.chip, s.chipIcon, { backgroundColor: t.isOnline ? theme.tone.blue.bg : theme.cardAlt }]}>
            {t.isOnline
              ? <IconWifi size={12} color={theme.tone.blue.text} />
              : <IconBuildingArch size={12} color={theme.textMuted} />}
            <Text style={[s.chipText, { color: t.isOnline ? theme.tone.blue.text : theme.textMuted }]}>
              {t.isOnline ? 'أونلاين' : 'حضوري'}
            </Text>
          </View>
        </View>

        <Text style={s.trackTitle}>{t.title}</Text>

        {/* info grid — two columns that collapse to one on a narrow screen */}
        <View style={s.infoGrid}>
          <InfoItem s={s} icon={<IconClock size={15} color={theme.green} />} label="الوقت" val={t.timeSlot} />
          <InfoItem s={s} icon={<IconCalendarRepeat size={15} color={theme.green} />} label="الأيام" val={t.daysPerWeek} />
          <InfoItem s={s} icon={<IconCalendar size={15} color={theme.green} />} label="البداية" val={fmtDateShort(t.startDate)} />
          <InfoItem s={s} icon={<IconCalendarOff size={15} color={theme.green} />} label="النهاية" val={fmtDateShort(t.endDate)} />
          <InfoItem
            s={s}
            icon={t.isOnline ? <IconVideo size={15} color={theme.green} /> : <IconMapPin size={15} color={theme.green} />}
            label="المكان"
            val={t.isOnline ? 'أونلاين' : (typeof t.masjid === 'object' ? t.masjid.name : t.masjid)}
            span
          />
        </View>

        {/* teachers */}
        <Text style={s.blockLabel}>المعلمون</Text>
        <View style={s.teacherAvatars}>
          {t.teachers.length === 0 && <Text style={s.mutedInline}>— لا يوجد معلم —</Text>}
          {t.teachers.map((tc, i) => {
            const tone = avatarTone(theme, i);
            const name = getTeacherName(tc);
            return (
              <View key={getTeacherId(tc)} style={[s.teacherAvatarChip, { backgroundColor: tone.bg }]}>
                <View style={[s.avatarSm, { backgroundColor: tone.text }]}>
                  <Text style={[s.avatarSmText, { color: tone.bg }]}>{avatarInitials(name)}</Text>
                </View>
                <Text style={[s.teacherAvatarText, { color: tone.text }]} numberOfLines={1}>{name}</Text>
              </View>
            );
          })}
        </View>

        {/* capacity */}
        <View style={s.capacityBox}>
          <View style={s.capacityHead}>
            <View style={s.iconLabel}>
              <IconUserCheck size={14} color={theme.textMuted} />
              <Text style={s.capacityLabel}>الطاقة الاستيعابية</Text>
            </View>
            <Text style={[s.capacityValue, { color: barClr }]}>{enrolled} / {t.maxStudents}</Text>
          </View>
          <View style={s.capacityTrack}>
            <View style={[s.capacityFill, { width: `${pct}%`, backgroundColor: barClr }]} />
          </View>
        </View>

        {/* linked Quran plan */}
        <View style={[s.planBox, !!linkedPlan?.todayAssignments.length && { backgroundColor: theme.greenPale }]}>
          <Pressable
            haptic="select"
            disabled={!linkedPlan}
            onPress={() => setPlanOpen((o) => !o)}
            style={s.planHead}
          >
            <View style={s.iconLabel}>
              <IconTarget size={14} color={linkedPlan?.todayAssignments.length ? theme.green : theme.textMuted} />
              <Text style={[s.planTitle, !!linkedPlan?.todayAssignments.length && { color: theme.green }]}>الخطة القرآنية</Text>
              {linkedPlan?.progress && (
                <View style={s.planPct}>
                  <Text style={s.planPctText}>{linkedPlan.progress.percent}%</Text>
                </View>
              )}
            </View>
            {linkedPlan && (planOpen
              ? <IconChevronUp size={14} color={theme.textMuted} />
              : <IconChevronDown size={14} color={theme.textMuted} />)}
          </Pressable>

          {!linkedPlan && <Text style={s.planEmpty}>لا توجد خطة حفظ مرتبطة بهذا المسار</Text>}

          {linkedPlan && planOpen && (
            <View style={s.planDetail}>
              <Text style={s.planName}>{linkedPlan.name}</Text>
              {linkedPlan.progress && (
                <>
                  <View style={s.planTrack}>
                    <View style={[s.planFill, { width: `${linkedPlan.progress.percent}%` }]} />
                  </View>
                  <Text style={s.planMeta}>
                    {linkedPlan.juzProgress ? `${linkedPlan.juzProgress.completed} / ${linkedPlan.juzProgress.total} جزء · ` : ''}
                    {linkedPlan.progress.completed} / {linkedPlan.progress.total} يوم
                  </Text>
                </>
              )}
              <Text style={s.planToday}>{todayText}</Text>
            </View>
          )}
        </View>

        {t.isOnline && !!t.meetLink && (
          <Pressable style={s.joinBtn} onPress={() => Linking.openURL(t.meetLink!)}>
            <IconVideo size={14} color={theme.tone.blue.text} />
            <Text style={s.joinText}>انضم للجلسة</Text>
          </Pressable>
        )}

        {/* actions */}
        <View style={s.actionsRow}>
          <Pressable style={s.actionBtn} onPress={onManageStudents}>
            <IconUsers size={15} color={theme.green} />
            <Text style={s.actionText}>الطلاب</Text>
            {enrolled > 0 && (
              <View style={s.countPill}><Text style={s.countPillText}>{enrolled}</Text></View>
            )}
          </Pressable>
          <Pressable style={s.actionBtn} onPress={onEdit}>
            <IconPencil size={15} color={theme.textMuted} />
            <Text style={[s.actionText, { color: theme.textMuted }]}>تعديل</Text>
          </Pressable>
          <Pressable haptic="medium" style={[s.actionBtn, s.actionBtnDanger]} onPress={onDelete}>
            <IconTrash size={15} color={theme.red} />
            <Text style={[s.actionText, { color: theme.red }]}>حذف</Text>
          </Pressable>
        </View>

      </Pressable>
      {children}
      </View>
    </Card>
  );
}

function InfoItem({ s, icon, label, val, span }: { s: Styles; icon: React.ReactNode; label: string; val: string; span?: boolean }) {
  return (
    <View style={[s.infoItem, span && s.infoItemSpan]}>
      {icon}
      <View style={s.flex1}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{val || '—'}</Text>
      </View>
    </View>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    successBanner: { backgroundColor: theme.tone.green.bg, color: theme.tone.green.text, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    errorText: { color: theme.red, fontFamily: theme.fontCairo, fontSize: 12, marginBottom: 8 },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 12 },
    mutedInline: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo },
    row: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
    rowGroup: { flexDirection: 'row', gap: 8, marginTop: 12 },
    flex1: { flex: 1 },

    onlineToggle: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    onlineToggleActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    onlineToggleText: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted },
    onlineToggleTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    teacherList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    teacherChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    teacherChipActive: { backgroundColor: theme.tone.green.bg, borderColor: theme.tone.green.border },
    teacherChipText: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    teacherChipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },

    // ── sections ──
    section: { gap: 12 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBar: { width: 4, height: 18, borderRadius: 2 },
    sectionLabel: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    sectionCount: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    sectionCountText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    sectionList: { gap: 14 },
    dimmed: { opacity: 0.75 },

    // ── empty state ──
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },
    emptySub: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, marginBottom: 10 },

    // ── track card ──
    strip: { height: 4, borderTopLeftRadius: theme.radius, borderTopRightRadius: theme.radius },
    cardBody: { padding: 16, gap: 10 },
    cardMain: { gap: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    chip: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3, flexShrink: 1, maxWidth: '100%' },
    chipIcon: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    chipText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    trackTitle: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexBasis: '46%', flexGrow: 1 },
    infoItemSpan: { flexBasis: '100%' },
    infoLabel: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },

    blockLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    teacherAvatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    teacherAvatarChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, maxWidth: '100%', flexShrink: 1 },
    avatarSm: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    avatarSmText: { fontSize: 9, fontFamily: theme.fontCairoBold },
    teacherAvatarText: { fontSize: 12, fontFamily: theme.fontCairoBold, flexShrink: 1 },

    capacityBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, gap: 6 },
    capacityHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    capacityLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold },
    capacityTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    capacityFill: { height: '100%', borderRadius: 999 },
    fullWarning: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.red },

    planBox: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12 },
    planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    planTitle: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    planPct: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
    planPctText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },
    planEmpty: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted, marginTop: 6 },
    planDetail: { marginTop: 8, gap: 4 },
    planName: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    planTrack: { height: 6, backgroundColor: theme.border, borderRadius: 999, overflow: 'hidden' },
    planFill: { height: '100%', borderRadius: 999, backgroundColor: theme.mode === 'dark' ? theme.greenLight : theme.green },
    planMeta: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    planToday: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.text },

    joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.tone.blue.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    joinText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.tone.blue.text },

    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 9 },
    actionBtnDanger: { borderColor: theme.tone.red.border },
    actionText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.green },
    countPill: { backgroundColor: theme.greenAccent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
    countPillText: { fontSize: 10, fontFamily: theme.fontCairoBold, color: theme.white },

    // ── students panel ──
    studentsPanel: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 },
    panelTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    addStudentBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 10, padding: 12 },
    addStudentLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    enrolledHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    enrolledTitle: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    searchBox: { width: 150 },
    emptyBox: { alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 10, paddingVertical: 16 },
    studentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: theme.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9 },
    studentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 11, fontFamily: theme.fontCairoBold },
    studentName: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    studentIndex: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    closeText: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', marginTop: 4 },

    // ── delete dialog ──
    overlay: { flex: 1, backgroundColor: theme.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 360, backgroundColor: theme.card, borderRadius: 16, padding: 24, alignItems: 'center' },
    dialogIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.tone.red.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    dialogTitle: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 8 },
    dialogBody: { fontSize: 13, fontFamily: theme.fontCairo, color: theme.textMuted, textAlign: 'center' },
    dialogActions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
  });
}
```

Note: `Student` is used as a bare type reference in `trackIdOf(v: Student['track'])` — add `import type { Student } from '@/lib/queries/students';` alongside the `useStudents` import in Step 2 above (already included in the import block).

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `admin/tracks.tsx` itself has no errors. `lib/constants/portals.ts`/the three `_layout.tsx` files still reference the old `special_tracks` route id (fixed in Task 28).

- [ ] **Step 4: Manual verification against the real dev server**

Log in as admin, open the tracks list: create a track with a masjid selected (no location field), confirm it saves; open "الطلاب" on a track and confirm the transfer picker moves a student onto it (and that student disappears from their old track's roster); confirm the capacity bar uses the live `studentCount`.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/admin/tracks.tsx
git commit -m "feat(mobile): rewrite AdminSpecialTracks as AdminTracks with masjid FK + transfer-only assignment"
```

---

### Task 13: `admin/register.tsx` — single track picker

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/admin/register.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1's `tracks.ts`.
- Produces: `AdminRegister` submitting `body.track` (drops separate `body.halqa`/`body.masjid`).

Finding during planning: the design doc's §13 also lists `lib/constants/masarMap.ts` as a file to modify for the "الحلقة المقترحة" → "المسار المقترح" copy reword. A direct grep (`grep -rn "الحلقة المقترحة" quran-hifz-mobile`) confirms that exact string exists **only** inside this file's JSX (line 162) — `masarMap.ts` itself has no such string (its `MasarInfo.halqa` field holds cosmetic placeholder values like `"حلقة أبي بكر الصديق"`, never this label text). So `masarMap.ts` needs no code change; the cosmetic fix folds into this task's Step 3 below.

- [ ] **Step 1: Replace imports (lines 13-16) — drop `useMasajid`/`useHalqat`, add `useTracks`**

```tsx
import { useCreateStudent } from '@/lib/queries/students';
import { useTracks } from '@/lib/queries/tracks';
import { pickMasar, READING_LEVELS } from '@/lib/constants/masarMap';
```

- [ ] **Step 2: Replace lines 21-30 (`Fields` type + `EMPTY`) — collapse `masjid`+`halqa` to `track`**

```tsx
type Fields = {
  name: string; age: string; guardianPhone: string; nationalId: string;
  level: string; studentLevel: string;
  track: string;
  email: string; password: string;
};
const EMPTY: Fields = {
  name: '', age: '', guardianPhone: '', nationalId: '', level: '', studentLevel: '',
  track: '', email: '', password: '',
};
```

- [ ] **Step 3: Replace lines 34-47 (`validate`) — single track requirement, cosmetic label fixed downstream in Step 6**

```tsx
function validate(f: Fields): string | null {
  if (f.name.trim().length < 2) return 'الاسم مطلوب (٢ أحرف على الأقل)';
  if (!f.age.trim()) return 'العمر مطلوب';
  if (Number(f.age) < 4 || Number(f.age) > 80) return 'العمر بين ٤ و٨٠';
  if (!f.guardianPhone.trim()) return 'جوال ولي الأمر مطلوب';
  if (!/^05\d{8}$/.test(f.guardianPhone.trim())) return 'صيغة الجوال: 05XXXXXXXX';
  // Optional, but must be well-formed when provided.
  if (f.nationalId.trim() && !/^[12]\d{9}$/.test(f.nationalId.trim())) return 'رقم الهوية ١٠ أرقام ويبدأ بـ ١ أو ٢';
  if (!f.level) return 'يرجى اختيار مستوى القراءة';
  if (f.studentLevel.trim() && (Number(f.studentLevel) < 1 || Number(f.studentLevel) > 10)) return 'المستوى بين ١ و١٠';
  if (!f.track) return 'يرجى اختيار المسار';
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'البريد الإلكتروني غير صحيح';
  return null;
}
```

- [ ] **Step 4: Replace lines 54-55 (data fetching) — `useTracks()` replaces `useMasajid()`+`useHalqat()`**

```tsx
  const { data: tracks = [] } = useTracks();
  const createStudent = useCreateStudent();
```

- [ ] **Step 5: Replace lines 77-89 (`handleSubmit`'s body) — `track` replaces `halqa`+`masjid`**

```tsx
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      guardian: '',
      guardianPhone: form.guardianPhone.trim(),
      nationalId: form.nationalId.trim() || undefined,
      track: form.track,
      path: masar?.path ?? 'حفظ كامل',
      status: 'new',
    };
```

- [ ] **Step 6: Replace lines 157-164 (masar suggestion box) — cosmetic label fix**

```tsx
            {masar && (
              <View style={s.masar}>
                <Text style={s.masarLabel}>المسار المقترح تلقائياً</Text>
                <Text style={s.masarName}>{masar.name}</Text>
                <Text style={s.masarDesc}>{masar.desc}</Text>
                <Text style={s.masarHalqa}>المسار المقترح: {masar.halqa}</Text>
              </View>
            )}
```

- [ ] **Step 7: Replace lines 167-187 (the "المسجد والحلقة" card) — single "المسار" `FormSelect`**

```tsx
          <Card>
            <CardHeader title="المسار" />
            <View style={s.formCol}>
              <FormGroup label="المسار" required>
                <FormSelect
                  value={form.track}
                  onChange={(v) => sf('track', v)}
                  options={tracks.map((t) => ({ value: t._id, label: t.title }))}
                  placeholder="اختر المسار"
                />
              </FormGroup>
            </View>
          </Card>
```

- [ ] **Step 8: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `admin/register.tsx` no longer errors.

- [ ] **Step 9: Manual verification against the real dev server**

Log in as admin, open "تسجيل طالب جديد": confirm the form shows a single "المسار" select (no separate مسجد/حلقة steps), that the reading-level-derived masar box still shows "المسار المقترح تلقائياً" + "المسار المقترح: …", and that submitting creates the student with the chosen track.

- [ ] **Step 10: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/admin/register.tsx
git commit -m "feat(mobile): AdminRegister — single track picker replaces masjid+halqa two-step"
```

---

### Task 14: `admin/students.tsx` + `admin/student-form.tsx` — one-hop track label + single track select

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/admin/students.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/admin/student-form.tsx`

**Interfaces:**
- Consumes: `Student.track` (Task 3), `useTracks` (Task 1).

- [ ] **Step 1: `admin/students.tsx` — replace lines 26-44 (`getName`/`getId`/`trackLabel`) — one-hop**

```tsx
function getId(v: unknown): string {
  if (v && typeof v === 'object' && '_id' in v) return (v as { _id: string })._id;
  if (typeof v === 'string') return v;
  return '';
}

/** المسار: real track lives one hop away via `Student.track`, not the unused legacy `path` enum. */
function trackLabel(s: Student): string | null {
  const track = typeof s.track === 'object' ? s.track : null;
  if (track?.title) return track.title;
  if (s.path) return s.path;
  return null;
}
function getTrackName(v: { title: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'title' in v) return v.title;
  if (typeof v === 'string') return v;
  return '—';
}
```

(`getName` — which read `.name` off `st.halqa`/`st.masjid` — is deleted entirely; both call sites are replaced in Step 2 with a single track chip via `getTrackName`.)

- [ ] **Step 2: Replace lines 150-162 (the chips row) — collapse "الحلقة"/"المسجد" chips to one "المسار" chip**

```tsx
                  <View style={s.chips}>
                    <View style={s.chip}>
                      <Text style={s.chipText} numberOfLines={1}>المسار: {getTrackName(st.track)}</Text>
                    </View>
                    {typeof st.level === 'number' && (
                      <View style={s.chip}>
                        <Text style={s.chipText} numberOfLines={1}>المستوى: {st.level}</Text>
                      </View>
                    )}
                  </View>
```

- [ ] **Step 3: `admin/student-form.tsx` — replace imports (lines 8-10)**

```tsx
import { useStudents, useUpdateStudent, type Student } from '@/lib/queries/students';
import { useTracks } from '@/lib/queries/tracks';
import { useAdminParents, useStudentParent, useSetStudentParent } from '@/lib/queries/adminParents';
```

- [ ] **Step 4: Replace lines 28-30 (data fetching) — drop `halqat`/`masajid`, add `tracks`**

```tsx
  const { data: students = [] } = useStudents();
  const { data: tracks = [] } = useTracks();
  const { data: parents = [] } = useAdminParents();
```

- [ ] **Step 5: Replace lines 37-48 (state + prefill effect) — collapse `halqa`+`masjid` to `track`**

```tsx
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [level, setLevel] = useState('');
  const [track, setTrack] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [status, setStatus] = useState<Student['status']>('active');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [error, setError] = useState('');

  const existing = id ? students.find((st) => st._id === id) : undefined;
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPath(existing.path);
    setLevel(existing.level != null ? String(existing.level) : '');
    setTrack(getId(existing.track));
    setGuardianPhone(existing.guardianPhone ?? '');
    setNationalId(existing.nationalId ?? '');
    setStatus(existing.status);
    setEmail(existing.email ?? '');
  }, [existing?._id]);
```

- [ ] **Step 6: Replace lines 71-85 (`handleSubmit`) — `track` replaces `halqa`+`masjid`**

```tsx
    try {
      setError('');
      await updateStudent.mutateAsync({
        id,
        name: name.trim(),
        path,
        track: track || undefined,
        guardianPhone: guardianPhone.trim(),
        nationalId: nationalId.trim() || undefined,
        status,
        ...(level.trim() && { level: Number(level) }),
        ...(email.trim() && { email: email.trim() }),
        ...(password && { password }),
      });
```

- [ ] **Step 7: Replace lines 122-138 (the "الحلقة"/"المسجد" selects) — single "المسار" select**

```tsx
      <Text style={s.label}>المسار</Text>
      <FormSelect
        value={track}
        onChange={setTrack}
        options={tracks.map((t) => ({ value: t._id, label: t.title }))}
        placeholder="اختر المسار"
        title="المسار"
      />
```

- [ ] **Step 8: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: both files no longer error.

- [ ] **Step 9: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/admin/students.tsx quran-hifz-mobile/app/\(portal\)/admin/student-form.tsx
git commit -m "feat(mobile): AdminStudents/AdminStudentForm — one-hop track label + single track select"
```

---

### Task 15: `admin/teachers.tsx` + `admin/dashboard.tsx`

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/admin/teachers.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/admin/dashboard.tsx`

**Interfaces:**
- Consumes: `Teacher.tracksCount`/`DashboardStats.totalTracks` from Task 3.

- [ ] **Step 1: `admin/teachers.tsx` — replace line 68 (`الحلقات` chip)**

```tsx
                  <View style={s.chip}><Text style={s.chipText}>المسارات: {t.tracksCount ?? 0}</Text></View>
```

- [ ] **Step 2: `admin/dashboard.tsx` — replace imports (lines 14-19) — drop `HalqaCard`/`useHalqat`**

```tsx
import { useStats } from '@/lib/queries/stats';
import { useKpis } from '@/lib/queries/kpis';
import { useStudents, type Student } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
```

- [ ] **Step 3: Delete lines 24-28 (the dead `nameOf` helper) — its only call sites (`s.halqa`/`s.masjid`) are removed in Step 6**

(No replacement — `nameOf` is deleted outright.)

- [ ] **Step 4: Replace lines 30-37 (`trackLabel`) — one-hop**

```tsx
/** المسار: real track lives one hop away via `Student.track` — same fallback chain as admin/students.tsx. */
function trackLabel(s: Student): string | null {
  const track = typeof s.track === 'object' ? s.track : null;
  if (track?.title) return track.title;
  if (s.path) return s.path;
  return null;
}
```

- [ ] **Step 5: Replace lines 42-58 (data fetching) — drop `halqatQuery`**

```tsx
  const stats = useStats();
  const kpisQuery = useKpis();
  const studentsQuery = useStudents();

  const isLoading = stats.isLoading || kpisQuery.isLoading || studentsQuery.isLoading;
  const isRefreshing = stats.isRefetching || kpisQuery.isRefetching || studentsQuery.isRefetching;
  const onRefresh = () => {
    stats.refetch();
    kpisQuery.refetch();
    studentsQuery.refetch();
  };

  const kpis = kpisQuery.data ?? [];
  const students = studentsQuery.data ?? [];
```

- [ ] **Step 6: Replace lines 79-84 (`STATS`) — `totalHalqat` → `totalTracks`**

```tsx
  const STATS = stats.data ? [
    { label: 'الطلاب المسجلون', value: stats.data.totalStudents, color: theme.green },
    { label: 'المعلمون',         value: stats.data.totalTeachers, color: theme.gold },
    { label: 'المسارات',         value: stats.data.totalTracks,   color: theme.blue },
    { label: 'المساجد',          value: stats.data.totalMasajid,  color: theme.red },
  ] : [];
```

- [ ] **Step 7: Delete lines 132-135 (the `HalqaCard` mini-list) — no replacement, matches "no new features"**

```tsx
        {/* Programme distribution */}
        <Card>
          <CardHeader title="توزيع المسارات" />
```

(i.e. the "Halqat overview (first 2)" comment block and its `.map` are removed outright; the "Programme distribution" `Card` that follows it is unaffected and now runs directly after the "+ طالب جديد" button.)

- [ ] **Step 8: Replace lines 173-177 (recent-registrations `infoGrid`) — one "المسار" line replaces "الحلقة"/"المسجد"**

```tsx
                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>المسار: {trackLabel(s) ?? '—'}</Text>
                  </View>
```

- [ ] **Step 9: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: both files no longer error.

- [ ] **Step 10: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/admin/teachers.tsx quran-hifz-mobile/app/\(portal\)/admin/dashboard.tsx
git commit -m "feat(mobile): admin teachers/dashboard — tracksCount chip, totalTracks stat, drop HalqaCard"
```

---

### Task 16: `admin/reports.tsx` — drop `halqat` prop

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/admin/reports.tsx`

**Interfaces:**
- Consumes: `ReportsScreen` (Task 9, no longer accepts `halqat`), `useTracks` (Task 1).

- [ ] **Step 1: Replace lines 5-6 (imports)**

```tsx
import { useTracks } from '@/lib/queries/tracks';
import { useKpis } from '@/lib/queries/kpis';
```

- [ ] **Step 2: Replace lines 18-29 (data fetching + refresh) — drop `halqat`**

```tsx
  const { data: tracks = [], isRefetching: tracksRefetching, refetch: refetchTracks } = useTracks();
  const { data: kpis = [], isRefetching: kpisRefetching, refetch: refetchKpis } = useKpis();
  const { data: teachers = [], isRefetching: teachersRefetching, refetch: refetchTeachers } = useTeachers();

  const refreshing = tracksRefetching || kpisRefetching || teachersRefetching;
  const onRefresh = () => {
    refetchTracks();
    refetchKpis();
    refetchTeachers();
  };
```

- [ ] **Step 3: Replace lines 38-46 (`<ReportsScreen>` call) — drop `halqat` prop**

```tsx
        <ReportsScreen
          baseFilter={{}}
          tracks={tracks}
          scopeAllLabel="كل المدرسة"
          showAdmin
          kpis={kpis}
          teachers={teachers}
        />
```

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `admin/reports.tsx` no longer errors.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/admin/reports.tsx
git commit -m "feat(mobile): AdminReports drops halqat prop"
```

---

### Task 17: `teacher/special_tracks.tsx` → `teacher/tracks.tsx`

**Files:**
- Delete: `quran-hifz-mobile/app/(portal)/teacher/special_tracks.tsx`
- Create: `quran-hifz-mobile/app/(portal)/teacher/tracks.tsx`

**Interfaces:**
- Consumes: `useTracks`, `Track`, `TrackTeacher` from Task 1.
- Produces: exported `TeacherTracks` component — consumed by Task 28's `teacher/_layout.tsx` (registered under the route name `tracks`, promoted into the now-vacant visible-tab slot that `myhalqa` occupied).

`enrolledStudents.length`/`t.location` are the only real behavior changes (`enrolledStudents` is server-dropped; `location` is superseded by `masjid`) — everything else is a mechanical rename.

- [ ] **Step 1: Delete the old file**

```bash
git rm quran-hifz-mobile/app/\(portal\)/teacher/special_tracks.tsx
```

- [ ] **Step 2: Create `teacher/tracks.tsx`**

```tsx
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import {
  useTracks,
  type Track,
  type TrackTeacher,
} from '@/lib/queries/tracks';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { AR_LOCALE } from '@/lib/date';

type AppTheme = ReturnType<typeof useAppTheme>;

function getTeacherName(v: TrackTeacher | string) {
  return typeof v === 'object' ? v.name : v;
}
function getMasjidName(v: unknown): string {
  if (v && typeof v === 'object' && 'name' in v) return (v as { name: string }).name;
  return typeof v === 'string' ? v : '—';
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(AR_LOCALE, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_LABEL: Record<Track['status'], string> = { active: 'نشط', upcoming: 'قادم', ended: 'منتهي' };
const STATUS_VARIANT: Record<Track['status'], 'green' | 'gold' | 'gray'> = { active: 'green', upcoming: 'gold', ended: 'gray' };

function TrackCard({ track, onOpenDetail }: { track: Track; onOpenDetail: () => void }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const enrolled = track.studentCount ?? 0;
  const pct = track.maxStudents > 0 ? Math.min(100, Math.round((enrolled / track.maxStudents) * 100)) : 0;

  return (
    <Card>
      <View style={s.headRow}>
        <Badge label={STATUS_LABEL[track.status]} variant={STATUS_VARIANT[track.status]} />
        <Text style={s.typeTag}>{track.type}</Text>
        {track.isOnline && <Text style={s.onlineTag}>أونلاين</Text>}
      </View>

      <Text style={s.title}>{track.title}</Text>

      <View style={s.infoGrid}>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>الوقت</Text>
          <Text style={s.infoValue}>{track.timeSlot}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>الأيام</Text>
          <Text style={s.infoValue}>{track.daysPerWeek}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>البداية</Text>
          <Text style={s.infoValue}>{fmtDate(track.startDate)}</Text>
        </View>
        <View style={s.infoItem}>
          <Text style={s.infoLabel}>النهاية</Text>
          <Text style={s.infoValue}>{fmtDate(track.endDate)}</Text>
        </View>
      </View>

      <Text style={s.infoLabel}>المكان</Text>
      <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.isOnline ? 'أونلاين' : getMasjidName(track.masjid)}</Text>

      {track.teachers.length > 0 && (
        <>
          <Text style={s.infoLabel}>المعلمون</Text>
          <Text style={[s.infoValue, { marginBottom: 10 }]}>{track.teachers.map(getTeacherName).join('، ')}</Text>
        </>
      )}

      <View style={s.capacityBox}>
        <View style={s.capacityRow}>
          <Text style={s.capacityLabel}>الطلاب</Text>
          <Text style={s.capacityValue}>{enrolled} / {track.maxStudents}</Text>
        </View>
        <ProgressBar value={pct} showPercent={false} />
      </View>

      {track.isOnline && track.meetLink && (
        <Text style={s.meetLink}>رابط الجلسة: {track.meetLink}</Text>
      )}

      <Button label={`عرض التفاصيل (${enrolled} طالب)`} variant="secondary" onPress={onOpenDetail} fullWidth />
    </Card>
  );
}

export default function TeacherTracks() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const router = useRouter();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const { data: tracks = [], isLoading, refetch, isRefetching } = useTracks(undefined, profileId);

  const active = tracks.filter((t) => t.status === 'active');
  const upcoming = tracks.filter((t) => t.status === 'upcoming');
  const ended = tracks.filter((t) => t.status === 'ended');

  function openDetail(id: string) {
    router.push({ pathname: '/(portal)/teacher/track-detail', params: { id } } as any);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isLoading && <SkeletonRows count={3} rowHeight={220} gap={14} />}

        {!isLoading && tracks.length === 0 && (
          <Text style={s.muted}>لا توجد مسارات مُسنَدة إليك</Text>
        )}

        {active.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات النشطة ({active.length})</Text>
            {active.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات القادمة ({upcoming.length})</Text>
            {upcoming.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
        {ended.length > 0 && (
          <>
            <Text style={s.sectionTitle}>المسارات المنتهية ({ended.length})</Text>
            {ended.map((t) => <TrackCard key={t._id} track={t} onOpenDetail={() => openDetail(t._id)} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    sectionTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 6 },
    headRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    typeTag: { fontSize: 11, backgroundColor: theme.bg, color: theme.textMuted, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    onlineTag: { fontSize: 11, backgroundColor: theme.bluePale, color: theme.blue, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, fontFamily: theme.fontCairo },
    title: { fontSize: 15, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 12 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
    infoItem: { width: '46%' },
    infoLabel: { fontSize: 10, color: theme.textMuted, fontFamily: theme.fontCairo },
    infoValue: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginTop: 1 },
    capacityBox: { backgroundColor: theme.bg, borderRadius: 10, padding: 10, marginBottom: 10 },
    capacityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    capacityLabel: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontCairo },
    capacityValue: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.text },
    meetLink: { fontSize: 11, color: theme.blue, fontFamily: theme.fontCairo, marginBottom: 10 },
  });
}
```

- [ ] **Step 3: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `teacher/tracks.tsx` no longer errors.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/tracks.tsx
git commit -m "feat(mobile): rename TeacherSpecialTracks to TeacherTracks"
```

---

### Task 18: `teacher/dashboard.tsx` + `teacher/students.tsx`

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/dashboard.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/students.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1; `Student.track` from Task 3.

- [ ] **Step 1: `teacher/dashboard.tsx` — replace lines 14-16 (imports)**

```tsx
import { useTracks } from '@/lib/queries/tracks';
import { useHomework } from '@/lib/queries/homework';
import { useStats } from '@/lib/queries/stats';
```

- [ ] **Step 2: Replace lines 31-53 (data fetching) — `useTracks` replaces `useHalqat`**

```tsx
  const { data: stats, refetch: refetchStats, isRefetching: statsRefetching } = useStats();
  const {
    data: tracks = [],
    isLoading: tracksLoading,
    isError: tracksError,
    refetch: refetchTracks,
    isRefetching: tracksRefetching,
  } = useTracks(undefined, authUser?.profileId);
  const {
    data: pendingHW = [],
    isLoading: hwLoading,
    isError: hwError,
    refetch: refetchHW,
    isRefetching: hwRefetching,
  } = useHomework({ teacher: authUser?.profileId, status: 'معلق' });

  const isError = tracksError || hwError;
  const isRefreshing = statsRefetching || tracksRefetching || hwRefetching;
  const onRefresh = () => {
    refetchStats();
    refetchTracks();
    refetchHW();
  };

  const totalStudents = tracks.reduce((sum, t) => sum + (t.studentCount ?? 0), 0);

  const STATS = [
    { label: 'طلابي الكلي', value: totalStudents, color: theme.green },
    { label: 'مساراتي', value: tracks.length, color: theme.gold },
    { label: 'متوسط الحضور', value: `${stats?.avgAttendancePct ?? 0}٪`, color: theme.blue },
    { label: 'واجبات معلقة', value: pendingHW.length, color: theme.red },
  ];
```

- [ ] **Step 3: Replace lines 92-111 (the "حلقاتي" card) — "مساراتي" card over `tracks`**

```tsx
        {/* My tracks */}
        <Card>
          <CardHeader title="مساراتي" />
          {tracksLoading ? (
            <SkeletonRows count={2} rowHeight={40} />
          ) : tracks.length === 0 ? (
            <Text style={styles.muted}>لا توجد مسارات مسجلة</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {tracks.map((t) => (
                <View key={t._id} style={styles.halqaRow}>
                  <Text style={styles.bold}>{t.title}</Text>
                  <Badge label={getName(t.masjid) || '—'} variant="gold" />
                  <Text style={styles.muted}>{t.timeSlot}</Text>
                  <Text style={styles.muted}>{t.studentCount ?? 0} طالب</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
```

(`styles.halqaRow` is a style-key name only — unchanged, per this plan's convention of leaving pure style identifiers alone unless the field they describe changed shape too.)

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `teacher/dashboard.tsx` no longer errors.

- [ ] **Step 5: `teacher/students.tsx` — full replacement**

The `"halqa:<id>"` filter branch and the `studentTracks` aggregation map both existed only because a student could belong to a halqa AND separately be enrolled in several tracks at once. Single-track-per-student removes that entirely — a student's track is just `student.track`, no aggregation needed. This is a full rewrite, not a line-patch, because removing the aggregation changes the file's control flow throughout.

```tsx
import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import ProgressBar from '@/components/ui/ProgressBar';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { usePortalStore } from '@/lib/store/portalStore';
import ScopeTabs from '@/components/ui/ScopeTabs';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

const hwVariant = (s: string) =>
  s === 'submitted' ? 'green' : s === 'late' ? 'red' : 'gold';
const hwLabel = (s: string) =>
  s === 'submitted' ? 'مُسلَّم' : s === 'late' ? 'متأخر' : 'معلق';

function getTrackName(v: { title: string } | string | undefined): string {
  if (v && typeof v === 'object' && 'title' in v) return v.title;
  return typeof v === 'string' ? v : '—';
}

export default function TeacherStudents() {
  const theme = useAppTheme();
  const authUser = usePortalStore((s) => s.authUser);
  // "all" | "track:<id>" — narrower vocabulary now that a student belongs to
  // exactly one track (no more halqa-vs-track duality to filter across).
  const [filter, setFilter] = useState('all');

  const { data: myTracks = [], refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, authUser?.profileId);
  // A teacher can run several tracks — fetch across all of them, not just the
  // first, or every student outside track #1 silently disappears.
  const trackIds = useMemo(() => myTracks.map((t) => t._id), [myTracks]);
  const {
    data: students = [],
    isLoading,
    isError,
    refetch: refetchStudents,
    isRefetching: refetchingStudents,
  } = useStudents({ track: trackIds.join(',') }, { enabled: trackIds.length > 0 });

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'كل الطلاب' },
    ...myTracks.map((t) => ({ value: `track:${t._id}`, label: t.title })),
  ], [myTracks]);

  const shown = useMemo(() => {
    if (filter.startsWith('track:')) {
      const id = filter.slice(6);
      return students.filter((st) => (typeof st.track === 'object' ? st.track?._id : st.track) === id);
    }
    return students;
  }, [students, filter]);

  const isRefreshing = refetchingStudents || refetchingTracks;
  const onRefresh = () => {
    refetchStudents();
    refetchTracks();
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    row: { paddingVertical: 14, gap: 8 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    muted: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filterLabel: { fontSize: 11, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    infoItem: { fontSize: 12, fontFamily: theme.fontCairo, color: theme.textMuted },
    progressWrap: { gap: 4 },
    empty: { textAlign: 'center', color: theme.textMuted, fontFamily: theme.fontCairo, fontSize: 13, paddingVertical: 24 },
  }), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        {isError && <Alert variant="error">تعذر تحميل الطلاب</Alert>}

        {filterOptions.length > 1 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.filterLabel}>تصفية الطلاب</Text>
            <ScopeTabs options={filterOptions} value={filter} onChange={setFilter} />
          </View>
        )}

        <Card noPadding>
          <CardHeader title={`الطلاب (${shown.length})`} style={{ padding: 16, paddingBottom: 8 }} />
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {isLoading && <SkeletonRows count={5} />}
            {!isLoading && shown.length === 0 && <Text style={styles.empty}>لا يوجد طلاب</Text>}

            {!isLoading && shown.map((s, i) => {
              const guardianName = s.parentName || s.guardian || '—';
              return (
                <View key={s._id} style={[styles.row, i < shown.length - 1 && styles.rowBorder]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    <Badge label={hwLabel(s.homeworkStatus)} variant={hwVariant(s.homeworkStatus) as any} />
                  </View>

                  <View style={styles.infoGrid}>
                    <Text style={styles.infoItem}>المسار: {getTrackName(s.track)}</Text>
                    <Text style={styles.infoItem}>·</Text>
                    <Text style={styles.infoItem}>آخر حفظ: {s.lastMemorization || '—'}</Text>
                  </View>

                  <View style={styles.rowHead}>
                    <Text style={[styles.muted, { color: s.attendancePct >= 90 ? theme.green : theme.red, fontFamily: theme.fontCairoBold }]}>
                      الحضور {s.attendancePct}٪
                    </Text>
                    <Text style={styles.muted}>ولي الأمر: {guardianName}</Text>
                  </View>

                  <View style={styles.progressWrap}>
                    <Text style={styles.muted}>التقدم {s.progressPct}٪</Text>
                    <ProgressBar value={s.progressPct} showPercent={false} />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: both files no longer error.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/dashboard.tsx quran-hifz-mobile/app/\(portal\)/teacher/students.tsx
git commit -m "feat(mobile): teacher dashboard/students — useTracks, drop halqa aggregation"
```

---

### Task 19: `teacher/attendance.tsx` — single-kind context collapse

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/attendance.tsx`

**Interfaces:**
- Consumes: `trackToContext`/`TeachingContext` from Task 5's `ContextCard.tsx`; `useTracks` from Task 1; `EvaluationRoster` with `{id}`-only context from Task 6.

This is the heaviest concentration of `kind === 'halqa'` ternaries in the app (`contextFilter`, the linked-plan match, and the View-1 dual-list rendering) — a full rewrite, not a line-patch, since the halqa/track duality is threaded through nearly every hook call and JSX branch in this 336-line file.

- [ ] **Step 1: Full replacement**

```tsx
import { useMemo, useState } from 'react';
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconClock, IconCalendarOff, IconTrophy, IconCalendarCheck, IconHistory, IconMedal,
} from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Leaderboard, { type LeaderboardRow } from '@/components/ui/Leaderboard';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import DaySlider, { useDaySchedule, type DayEntry } from '@/components/domain/DaySlider';
import EvaluationRoster from '@/components/domain/EvaluationRoster';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import { useEvaluations } from '@/lib/queries/evaluations';
import { useQuranPlans } from '@/lib/queries/quranPlan';
import { MAX_SCORES, TOTAL_MAX, legacyScoresOf } from '@/lib/evaluationRubric';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { fmtDayLabel, toDateOnly } from '@/lib/date';

export default function TeacherAttendance() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);

  const {
    data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks,
  } = useTracks(undefined, profileId);

  const contextFilter = selected ? { track: selected.id } : undefined;

  const {
    data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents,
  } = useStudents(contextFilter);

  const { data: plans = [], isLoading: loadingPlans, refetch: refetchPlans, isRefetching: refetchingPlans } =
    useQuranPlans(contextFilter);
  const linkedPlan = plans.find((p) => p.targetType === 'track') ?? plans[0];

  // ── Day slider ─────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [dayNotice, setDayNotice] = useState<string | null>(null);
  // A track context can carry several plans at once, so every plan's schedule
  // feeds the same strip of days.
  const scheduleEntries = useMemo(
    () => plans.flatMap((p) => p.schedule ?? []),
    [plans],
  );
  const baseDaySchedule = useDaySchedule(scheduleEntries, selectedDate);
  // The day strip itself (scheduledSet/dayChips/effectiveDate, above) still
  // needs every plan in context so a day covered only by a stray unrelated
  // plan stays selectable. But the actual per-date assignment lookup must
  // only ever come from `linkedPlan` — otherwise a stray plan sharing this
  // weekday piles its entries into the same date bucket (colliding React
  // keys, colliding completion-override keys, and `recordOccurrence` calls
  // sent with `occurrenceIndex` values that belong to a different plan).
  const linkedAssignmentByDate = useMemo(() => {
    const byDate = new Map<string, DayEntry[]>();
    for (const e of linkedPlan?.schedule ?? []) {
      if (!e.date) continue;
      const d = toDateOnly(e.date);
      const list = byDate.get(d) ?? [];
      list.push(e);
      byDate.set(d, list);
    }
    return byDate;
  }, [linkedPlan]);
  const daySchedule = useMemo(
    () => ({ ...baseDaySchedule, assignmentByDate: linkedAssignmentByDate }),
    [baseDaySchedule, linkedAssignmentByDate],
  );
  const { scheduledSorted, effectiveDate, today, isFutureDay } = daySchedule;

  // Full session history for this context, for the log + leaderboards below.
  const { data: history = [] } = useEvaluations(contextFilter);

  const { topScoreRows, topAttendanceRows } = useMemo(() => {
    type Agg = { id: string; name: string; totalSum: number; sessions: number; present: number };
    const byStudent = new Map<string, Agg>();
    for (const r of history) {
      const id = typeof r.student === 'string' ? r.student : r.student._id;
      const name = typeof r.student === 'string' ? r.student : r.student.name;
      const agg = byStudent.get(id) ?? { id, name, totalSum: 0, sessions: 0, present: 0 };
      agg.totalSum += r.total;
      agg.sessions += 1;
      if (r.attendanceStatus === 'حاضر') agg.present += 1;
      byStudent.set(id, agg);
    }
    const all = Array.from(byStudent.values());
    const byScore: LeaderboardRow[] = [...all]
      .sort((a, b) => b.totalSum / b.sessions - a.totalSum / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round(a.totalSum / a.sessions),
        max: TOTAL_MAX,
        sub: a.sessions === 1 ? 'جلسة واحدة' : `متوسط ${a.sessions} جلسات`,
      }));
    const byAttendance: LeaderboardRow[] = [...all]
      .sort((a, b) => b.present / b.sessions - a.present / a.sessions)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        name: a.name,
        value: Math.round((a.present / a.sessions) * 100),
        max: 100,
        sub: `${a.present} من ${a.sessions} جلسة`,
      }));
    return { topScoreRows: byScore, topAttendanceRows: byAttendance };
  }, [history]);

  const isRefreshingSelection = refetchingTracks;
  const onRefreshSelection = () => { refetchTracks(); };
  const isRefreshingDetail = refetchingStudents || refetchingPlans;
  const onRefreshDetail = () => { refetchStudents(); refetchPlans(); };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },

    histRow: { paddingVertical: 9, gap: 4 },
    histTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    histName: { flex: 1, fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
    histDate: { fontSize: 10, fontFamily: theme.fontCairo, color: theme.textMuted },
    histScores: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },

    spotTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
    spotTitleText: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text },
  }), [theme]);

  // ── View 1: context selector ────────────────────────────────────────────
  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshingSelection} onRefresh={onRefreshSelection} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {loadingTracks && <SkeletonRows count={3} rowHeight={92} />}
          {!loadingTracks && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد مسارات مسندة إليك</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── View 2: day slider + per-student attendance/evaluation roster ────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshingDetail} onRefresh={onRefreshDetail} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable onPress={() => { setSelected(null); setSelectedDate(''); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        {/* Day slider — only when this context has scheduled days */}
        {loadingPlans ? (
          <SkeletonRows count={1} rowHeight={44} />
        ) : (
          <DaySlider
            schedule={daySchedule}
            onSelect={(iso) => { setDayNotice(null); setSelectedDate(iso); }}
            onBlocked={(iso) => setDayNotice(`${fmtDayLabel(iso)} — هذا اليوم غير مشمول بخطة الحفظ الحالية`)}
          />
        )}

        {!!dayNotice && (
          <Alert variant="warning" icon={<IconCalendarOff size={16} color="#92400E" />}>{dayNotice}</Alert>
        )}

        {!loadingPlans && scheduledSorted.length === 0 && (
          <Alert variant="warning">
            لا يوجد خطة حفظ نشطة لهذا المسار — أضف خطة من صفحة "الخطط الفردية" أولاً لتفعيل التقويم.
          </Alert>
        )}

        {isFutureDay && (
          <Alert variant="warning" icon={<IconClock size={16} color="#92400E" />}>
            هذا اليوم لم يحن بعد — لا يمكن تسجيل الحضور والتقييم مسبقًا لجلسة لم تُعقد.
          </Alert>
        )}

        <Card>
          <CardHeader title={`${selected.title} — ${fmtDayLabel(effectiveDate)}`} />

          {loadingStudents && <SkeletonRows count={4} />}
          {!loadingStudents && (
            <EvaluationRoster
              students={students}
              context={{ id: selected.id }}
              teacherId={profileId}
              linkedPlan={linkedPlan}
              daySchedule={daySchedule}
            />
          )}
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader title="سجل الجلسات" right={<IconHistory size={18} color={theme.green} />} />
            {history.map((r, i) => (
              <View key={r._id} style={[styles.histRow, i < history.length - 1 && styles.rowBorder]}>
                <View style={styles.histTop}>
                  <Text style={styles.histName}>
                    {typeof r.student === 'string' ? r.student : r.student.name}
                  </Text>
                  <Badge label={r.attendanceStatus} variant={r.attendanceStatus === 'حاضر' ? 'green' : 'red'} />
                  <Text style={styles.histDate}>{toDateOnly(r.date)}</Text>
                </View>
                <Text style={styles.histScores}>
                  حضور {legacyScoresOf(r).attendance}/{MAX_SCORES.attendance} · حفظ {legacyScoresOf(r).hifz}/{MAX_SCORES.hifz} ·
                  تجويد {legacyScoresOf(r).tajweed}/{MAX_SCORES.tajweed} · تلاوة {legacyScoresOf(r).talawah}/{MAX_SCORES.talawah} ·
                  المجموع {r.total}/{TOTAL_MAX}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {(topScoreRows.length > 0 || topAttendanceRows.length > 0) && (
          <Card>
            <CardHeader title="أبرز الطلاب" right={<IconMedal size={18} color={theme.gold} />} />
            {topScoreRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconTrophy size={14} color={theme.gold} />
                  <Text style={styles.spotTitleText}>الأعلى تقييمًا</Text>
                </View>
                <Leaderboard rows={topScoreRows} />
              </>
            )}
            {topAttendanceRows.length > 0 && (
              <>
                <View style={styles.spotTitle}>
                  <IconCalendarCheck size={14} color={theme.green} />
                  <Text style={styles.spotTitleText}>الأعلى حضورًا</Text>
                </View>
                <Leaderboard rows={topAttendanceRows} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

Note for the implementer: the original file's style sheet also carried a large block of `row`/`rowTop`/`avatar`/`banner`/`toggleRow`/`completionBox`/`catLabel`/`scoreChipRow`/`disabled`-family keys that no JSX in this file actually referenced (the roster is rendered via `<EvaluationRoster>`, not inlined) — that was pre-existing dead code unrelated to this restructure, and this rewrite drops it as ordinary cleanup rather than carrying it forward; if a stricter "only touch what the migration requires" reading is preferred, those keys can be pasted back in unchanged with no functional difference either way.

- [ ] **Step 2: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `teacher/attendance.tsx` no longer errors.

- [ ] **Step 3: Manual verification against the real dev server**

Log in as a teacher, open "الحضور": confirm the picker shows only tracks (no halqat), confirm a track's day slider + roster loads and a save records correctly, and confirm the session log/leaderboards still populate.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/attendance.tsx
git commit -m "feat(mobile): TeacherAttendance collapses to single-kind track context"
```

---

### Task 20: `teacher/evaluate.tsx` + `teacher/grouphomework.tsx` + `teacher/recordlesson.tsx` — identical dual-kind collapse

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/evaluate.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/grouphomework.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/recordlesson.tsx`

**Interfaces:**
- Consumes: `trackToContext`/`TeachingContext` from Task 5; `useTracks` from Task 1; `useRubric`/`useBulkEvaluate` (Task 2), `useGroupHomework`/`useCreateGroupHomework`/`useDeleteGroupHomework` (Task 2), `useStudents`/`useCreateRecording` (Tasks 2-3).

All three screens share the exact same dual-kind-context-picker structure `teacher/attendance.tsx` had (View-1 picks a halqa-or-track, the mutation payload ternaries on `selected.kind`) — grouped into one task per this plan's "closely-related mechanical renames across small files share one task" rule (mirrors Phase 2's grouping of `TeacherAttendance.tsx`/`TeacherGroupHomework.tsx` consumer updates). Each is a full replacement, since the kind-based branch touches the data-fetch, the picker JSX, and the mutation payload in each file.

- [ ] **Step 1: `teacher/evaluate.tsx` — full replacement**

```tsx
import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCircleCheck, IconLock } from '@tabler/icons-react-native';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Skeleton';
import FormTextarea from '@/components/forms/FormTextarea';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents } from '@/lib/queries/students';
import { useEvaluations, useRubric, useBulkEvaluate, type BulkEvaluateRecord } from '@/lib/queries/evaluations';
import {
  MAX_SCORES, TOTAL_MAX, manualCriteria, totalMaxOf, DEFAULT_GRADE_RUBRIC,
  type GradeCriterion,
} from '@/lib/evaluationRubric';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';
import { success, error } from '@/lib/haptics';

/** Scores are keyed by the active plan's rubric, so categories are not known
 * at compile time any more. */
type StudentEval = { attendanceStatus: 'حاضر' | 'غائب'; scores: Record<string, number>; note: string };

/** Scores start at 0 so the teacher consciously awards points rather than
 * every student defaulting to full marks. */
function blankEval(): StudentEval {
  return { attendanceStatus: 'حاضر', scores: {}, note: '' };
}
/** Absent → 0. `auto` criteria (حضور) are awarded in full on presence. */
function totalOf(e: StudentEval, rubric: GradeCriterion[]): number {
  if (e.attendanceStatus === 'غائب') return 0;
  return rubric.reduce((a, c) => a + (c.auto ? c.max : Math.min(e.scores[c.key] ?? 0, c.max)), 0);
}

export default function TeacherEvaluate() {
  const theme = useAppTheme();
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [overrides, setOverrides] = useState<Record<string, StudentEval>>({});
  const [saved, setSaved] = useState(false);

  const { data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, profileId);

  const contextFilter = selected ? { track: selected.id } : undefined;

  const { data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents } = useStudents(contextFilter);

  const today = new Date().toISOString().split('T')[0];

  // Today's already-saved evaluations for this context — prefill + once-a-day lock.
  const { data: savedToday = [], refetch: refetchEvaluations, isRefetching: refetchingEvaluations } = useEvaluations(
    contextFilter ? { ...contextFilter, from: today, to: today } : undefined,
  );
  const savedById: Record<string, StudentEval> = {};
  for (const r of savedToday) {
    const id = typeof r.student === 'string' ? r.student : r.student._id;
    savedById[id] = {
      attendanceStatus: r.attendanceStatus,
      scores: Object.fromEntries((r.criteria ?? []).map((c) => [c.key, c.value])),
      note: r.note ?? '',
    };
  }
  const alreadySubmitted = savedToday.length > 0;

  const evalFor = (studentId: string): StudentEval => overrides[studentId] ?? savedById[studentId] ?? blankEval();
  function setAttendance(studentId: string, status: 'حاضر' | 'غائب') {
    setOverrides((p) => ({ ...p, [studentId]: { ...evalFor(studentId), attendanceStatus: status } }));
  }
  function setScore(studentId: string, key: string, value: number) {
    setOverrides((p) => {
      const current = evalFor(studentId);
      return { ...p, [studentId]: { ...current, scores: { ...current.scores, [key]: value } } };
    });
  }
  function setNote(studentId: string, note: string) {
    setOverrides((p) => ({ ...p, [studentId]: { ...evalFor(studentId), note } }));
  }

  // Grading split comes from the plan governing this track; the server falls
  // back to the historical default when no single plan resolves.
  const { data: rubricData } = useRubric(contextFilter);
  const rubric = rubricData?.rubric ?? DEFAULT_GRADE_RUBRIC;
  const rubricTotalMax = totalMaxOf(rubric);

  const bulkEvaluate = useBulkEvaluate();

  function handleSave() {
    if (!selected || alreadySubmitted) return;
    const records: BulkEvaluateRecord[] = students.map((s) => {
      const e = evalFor(s._id);
      return {
        student: s._id,
        attendanceStatus: e.attendanceStatus,
        scores: e.scores,
        note: e.note.trim() || undefined,
      };
    });
    bulkEvaluate.mutate(
      {
        teacher: profileId!,
        track: selected.id,
        date: today,
        records,
      },
      {
        onSuccess: () => {
          success();
          setSaved(true);
          setTimeout(() => setSaved(false), 4000);
        },
        onError: () => error(),
      },
    );
  }

  const isLoading = loadingTracks;
  const isRefreshing = refetchingTracks || refetchingStudents || refetchingEvaluations;
  function handleRefresh() {
    refetchTracks();
    refetchStudents();
    refetchEvaluations();
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    studentRow: { paddingVertical: 14, gap: 10 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    toggleText: {
      fontSize: 12,
      fontFamily: theme.fontCairo,
      color: theme.text,
    },
    categoryBlock: { gap: 6 },
    categoryLabel: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.textMuted },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: {
      minWidth: 32,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.radiusSm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipText: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    totalText: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.green },
  }), [theme]);

  if (!selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={72} />}
          {!isLoading && tracks.length === 0 && (
            <Text style={styles.muted}>لا توجد مسارات مسندة إليك</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
        {saved && (
          <Alert variant="success" icon={<IconCircleCheck size={18} color={theme.green} />}>
            تم حفظ التقييم بنجاح.
          </Alert>
        )}
        {bulkEvaluate.isError && (
          <Alert variant="error">{(bulkEvaluate.error as Error).message}</Alert>
        )}
        {alreadySubmitted && (
          <Alert variant="success" icon={<IconLock size={18} color={theme.green} />}>
            تم تسجيل التقييم لهذا اليوم بالفعل. اختر يومًا آخر أو راجع السجل لاحقًا للتعديل.
          </Alert>
        )}

        <Pressable onPress={() => { setSelected(null); setOverrides({}); }}>
          <Text style={styles.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        <Card>
          <CardHeader title={`${selected.title} — ${today}`} />

          {loadingStudents && <View style={{ paddingHorizontal: 4 }}><SkeletonRows count={3} rowHeight={140} gap={14} /></View>}
          {!loadingStudents && students.length === 0 && (
            <Text style={styles.muted}>لا يوجد طلاب</Text>
          )}

          {students.map((st, i) => {
            const e = evalFor(st._id);
            const isAbsent = e.attendanceStatus === 'غائب';
            const total = totalOf(e, rubric);
            return (
              <View key={st._id} style={[styles.studentRow, i < students.length - 1 && styles.rowBorder]}>
                <Text style={styles.studentName}>{st.name}</Text>

                <View style={styles.toggleRow}>
                  <Pressable
                    haptic="select"
                    disabled={alreadySubmitted}
                    onPress={() => setAttendance(st._id, 'حاضر')}
                    style={[styles.toggleBtn, !isAbsent && { backgroundColor: theme.greenPale, borderColor: theme.greenAccent }]}
                  >
                    <Text style={[styles.toggleText, !isAbsent && { color: theme.green, fontFamily: theme.fontCairoBold }]}>حاضر</Text>
                  </Pressable>
                  <Pressable
                    haptic="select"
                    disabled={alreadySubmitted}
                    onPress={() => setAttendance(st._id, 'غائب')}
                    style={[styles.toggleBtn, isAbsent && { backgroundColor: theme.red + '20', borderColor: theme.red }]}
                  >
                    <Text style={[styles.toggleText, isAbsent && { color: theme.red, fontFamily: theme.fontCairoBold }]}>غائب</Text>
                  </Pressable>
                </View>

                {!isAbsent && (
                  <>
                    {manualCriteria(rubric).map((cat) => (
                      <View key={cat.key} style={styles.categoryBlock}>
                        <Text style={styles.categoryLabel}>{cat.label} (٠-{cat.max})</Text>
                        <View style={styles.chipRow}>
                          {Array.from({ length: cat.max + 1 }, (_, n) => n).map((n) => {
                            const active = (e.scores[cat.key] ?? 0) === n;
                            return (
                              <Pressable
                                haptic="select"
                                key={n}
                                disabled={alreadySubmitted}
                                onPress={() => setScore(st._id, cat.key, n)}
                                style={[styles.chip, active && { backgroundColor: theme.greenAccent, borderColor: theme.green }]}
                              >
                                <Text style={[styles.chipText, active && { color: theme.white }]}>{n}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalText}>{total}/{rubricTotalMax}</Text>
                    </View>
                  </>
                )}

                <FormTextarea
                  rows={2}
                  editable={!alreadySubmitted}
                  placeholder="ملاحظات (اختياري)"
                  value={e.note}
                  onChangeText={(v) => setNote(st._id, v)}
                />
              </View>
            );
          })}
        </Card>

        <Button
          label={alreadySubmitted ? 'تم الإرسال لهذا اليوم' : bulkEvaluate.isPending ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
          onPress={handleSave}
          disabled={alreadySubmitted || bulkEvaluate.isPending || students.length === 0}
          fullWidth
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: `teacher/grouphomework.tsx` — full replacement**

```tsx
import { useMemo, useState } from 'react';
import {
  ScrollView, View, TextInput, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useTracks } from '@/lib/queries/tracks';
import { useGroupHomework, useCreateGroupHomework, useDeleteGroupHomework } from '@/lib/queries/groupHomework';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

type AppTheme = ReturnType<typeof useAppTheme>;

const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export default function TeacherGroupHomework() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', dueDay: DAYS[0] });

  const { data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, profileId);

  const { data: homeworks = [], isLoading: loadingHw, refetch: refetchHw, isRefetching: refetchingHw } = useGroupHomework(
    selected ? { track: selected.id } : undefined,
  );
  const createHW = useCreateGroupHomework();
  const deleteHW = useDeleteGroupHomework();

  const isLoading = loadingTracks;
  const isRefreshing = refetchingTracks || refetchingHw;
  function handleRefresh() {
    refetchTracks();
    refetchHw();
  }

  async function handleAdd() {
    if (!selected || !form.title.trim() || !form.desc.trim()) return;
    await createHW.mutateAsync({
      track: selected.id,
      title: form.title,
      description: form.desc,
      dueDay: form.dueDay,
      dueDate: new Date().toISOString(),
    });
    setForm({ title: '', desc: '', dueDay: DAYS[0] });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!selected) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={72} />}
          {!isLoading && tracks.length === 0 && (
            <Text style={s.muted}>لا توجد مسارات مسندة إليك</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable onPress={() => setSelected(null)}>
          <Text style={s.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        {saved && <Text style={s.successBanner}>تم إضافة الواجب الجماعي ✓</Text>}
        {createHW.isError && <Text style={s.errorBanner}>فشلت الإضافة، حاول مجدداً.</Text>}

        <Pressable style={s.addBtn} onPress={() => setShowForm((v) => !v)}>
          <Text style={s.addBtnText}>+ واجب جديد لـ {selected.title}</Text>
        </Pressable>

        {showForm && (
          <Card>
            <CardHeader title="إضافة واجب جماعي" />
            <Text style={s.label}>عنوان الواجب</Text>
            <TextInput style={s.input} placeholder="عنوان الواجب..." value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>الوصف</Text>
            <TextInput style={[s.input, { minHeight: 60 }]} placeholder="وصف الواجب..." value={form.desc} onChangeText={(v) => setForm((f) => ({ ...f, desc: v }))} multiline textAlignVertical="top" textAlign="right" placeholderTextColor={theme.textMuted} />
            <Text style={s.label}>موعد التسليم</Text>
            <View style={s.chipsRow}>
              {DAYS.map((d) => (
                <Pressable haptic="select" key={d} style={[s.chip, form.dueDay === d && s.chipActive]} onPress={() => setForm((f) => ({ ...f, dueDay: d }))}>
                  <Text style={[s.chipText, form.dueDay === d && s.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.row}>
              <Pressable style={s.saveBtn} onPress={handleAdd} disabled={createHW.isPending}>
                <Text style={s.saveBtnText}>{createHW.isPending ? 'جارٍ الحفظ...' : 'إضافة'}</Text>
              </Pressable>
              <Pressable style={s.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={s.cancelText}>إلغاء</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <CardHeader title="الواجبات الجماعية الحالية" />
          {loadingHw && <SkeletonRows count={3} rowHeight={64} />}
          {!loadingHw && homeworks.length === 0 && <Text style={s.muted}>لا توجد واجبات جماعية بعد</Text>}
          {homeworks.map((hw, i) => (
            <View key={hw._id} style={[s.hwItem, i > 0 && s.border]}>
              <Text style={s.hwTitle}>{hw.title}</Text>
              <Text style={s.hwDesc}>{hw.description}</Text>
              <View style={s.hwFoot}>
                <Badge label={`موعد: ${hw.dueDay}`} variant="gold" />
                <Pressable haptic="medium" onPress={() => deleteHW.mutate(hw._id)} disabled={deleteHW.isPending}>
                  <Text style={s.delText}>حذف</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: 16, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 16 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    successBanner: { backgroundColor: theme.greenPale, color: theme.green, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    errorBanner: { backgroundColor: theme.redPale, color: theme.red, fontFamily: theme.fontCairoBold, fontSize: 13, padding: 12, borderRadius: 8, textAlign: 'center' },
    addBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, padding: 12, alignItems: 'center' },
    addBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 14 },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 , textAlign: 'left'},
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.inputBg },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    chipActive: { backgroundColor: theme.greenPale, borderColor: theme.green },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    row: { flexDirection: 'row', gap: 12, marginTop: 12 },
    saveBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
    saveBtnText: { color: theme.white, fontFamily: theme.fontCairoBold },
    cancelBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, flex: 1, alignItems: 'center' },
    cancelText: { color: theme.textMuted, fontFamily: theme.fontCairo },
    hwItem: { paddingVertical: 12 },
    border: { borderTopWidth: 1, borderTopColor: theme.border },
    hwTitle: { fontSize: 13, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 4 },
    hwDesc: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontCairo, marginBottom: 6 },
    hwFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    delText: { fontSize: 12, color: theme.red, fontFamily: theme.fontCairo },
  });
}
```

- [ ] **Step 3: `teacher/recordlesson.tsx` — full replacement**

```tsx
import { useMemo, useState } from 'react';
import {
  ScrollView, View, TextInput, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import Text from '@/components/ui/Text';
import Pressable from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconMicrophone, IconPlayerStop, IconSend } from '@tabler/icons-react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';
import Card from '@/components/ui/Card';
import CardHeader from '@/components/ui/CardHeader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { SkeletonRows } from '@/components/ui/Skeleton';
import ContextCard, { trackToContext, type TeachingContext } from '@/components/domain/ContextCard';
import { useTracks } from '@/lib/queries/tracks';
import { useStudents, type Student } from '@/lib/queries/students';
import { useCreateRecording } from '@/lib/queries/lessonRecordings';
import { usePortalStore } from '@/lib/store/portalStore';
import { useAppTheme } from '@/lib/hooks/useAppTheme';

import { success, error } from '@/lib/haptics';

type AppTheme = ReturnType<typeof useAppTheme>;

const LESSON_TYPES = ['حفظ جديد', 'مراجعة قريبة', 'مراجعة بعيدة', 'تحسين تلاوة', 'اختبار'];

function StudentRecorderCard({ student, context, onSent }: { student: Student; context: TeachingContext; onSent: () => void }) {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const createRecording = useCreateRecording();

  const [type, setType] = useState(LESSON_TYPES[0]);
  const [segment, setSegment] = useState(student.lastMemorization ?? '');
  const [points, setPoints] = useState('700');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const hasStopped = !state.isRecording && !!recorder.uri;

  async function handleToggle() {
    if (state.isRecording) {
      await recorder.stop();
    } else {
      await recorder.prepareToRecordAsync();
      recorder.record();
    }
  }

  async function handleSend() {
    if (!segment.trim()) return;
    try {
      await createRecording.mutateAsync({
        student: student._id,
        track: context.id,
        type,
        segment,
        points: Number(points) || 0,
        teacherNote: note,
      });
    } catch {
      error();
      return; // failure is surfaced by createRecording.isError
    }
    success();
    setSent(true);
    onSent();
  }

  return (
    <Card>
      <View style={s.studentHead}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{student.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.studentName}>{student.name}</Text>
          <Text style={s.lastHifz}>آخر حفظ: {student.lastMemorization || '—'}</Text>
        </View>
        {sent ? <Badge label="أُرسل ✓" variant="green" /> : <Badge label="لم يُسجَّل" variant="gold" />}
      </View>

      {sent ? (
        <Alert variant="success">تم الإرسال لـ {student.name} وولي أمره — النقاط: {points}</Alert>
      ) : (
        <>
          <Text style={s.label}>نوع الواجب</Text>
          <View style={s.chipsRow}>
            {LESSON_TYPES.map((t) => (
              <Pressable haptic="select" key={t} style={[s.chip, type === t && s.chipActive]} onPress={() => setType(t)}>
                <Text style={[s.chipText, type === t && s.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>المقطع</Text>
          <TextInput style={s.input} placeholder="البقرة ٢٤٠-٢٤٥" value={segment} onChangeText={setSegment} textAlign="right" placeholderTextColor={theme.textMuted} />

          <View style={s.recArea}>
            <Pressable haptic="medium" style={[s.recBtn, state.isRecording && s.recBtnStop]} onPress={handleToggle}>
              {state.isRecording ? <IconPlayerStop size={18} color={theme.white} /> : <IconMicrophone size={18} color={theme.white} />}
              <Text style={s.recBtnText}>{state.isRecording ? 'إيقاف' : hasStopped ? 'تسجيل جديد' : 'ابدأ التسجيل'}</Text>
            </Pressable>
            {state.isRecording && (
              <Text style={s.timer}>{Math.floor((state.durationMillis ?? 0) / 1000)} ث</Text>
            )}
          </View>

          {hasStopped && (
            <>
              <Text style={s.label}>النقاط (٠–١٠٠٠)</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={points} onChangeText={setPoints} textAlign="right" placeholderTextColor={theme.textMuted} />
              <Text style={s.label}>ملاحظة للطالب</Text>
              <TextInput style={s.input} placeholder="اختياري..." value={note} onChangeText={setNote} textAlign="right" placeholderTextColor={theme.textMuted} />
              <Pressable style={s.sendBtn} onPress={handleSend} disabled={createRecording.isPending}>
                <IconSend size={18} color={theme.white} />
                <Text style={s.recBtnText}>{createRecording.isPending ? 'جارٍ الإرسال...' : 'إرسال للطالب وولي الأمر'}</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </Card>
  );
}

export default function TeacherRecordLesson() {
  const theme = useAppTheme();
  const s = useMemo(() => createS(theme), [theme]);
  const profileId = usePortalStore((s) => s.authUser?.profileId);
  const [selected, setSelected] = useState<TeachingContext | null>(null);
  const [, forceRerender] = useState(0);

  const { data: tracks = [], isLoading: loadingTracks, refetch: refetchTracks, isRefetching: refetchingTracks } = useTracks(undefined, profileId);

  const { data: students = [], isLoading: loadingStudents, refetch: refetchStudents, isRefetching: refetchingStudents } = useStudents(
    selected ? { track: selected.id } : undefined,
  );

  const isLoading = loadingTracks;
  const isRefreshing = refetchingTracks || refetchingStudents;
  function handleRefresh() {
    refetchTracks();
    refetchStudents();
  }

  if (!selected) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.page}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
        >
          {isLoading && <SkeletonRows count={4} rowHeight={72} />}
          {!isLoading && tracks.length === 0 && (
            <Text style={s.muted}>لا توجد مسارات مسندة إليك</Text>
          )}
          {tracks.map((t) => (
            <Pressable key={t._id} onPress={() => setSelected(trackToContext(t))}>
              <ContextCard context={trackToContext(t)} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.spinner]} tintColor={theme.spinner} />}
      >
        <Pressable onPress={() => setSelected(null)}>
          <Text style={s.backLink}>‹ رجوع لاختيار المسار</Text>
        </Pressable>

        <Alert variant="info">سجّل واجب كل طالب صوتياً — يُرسل تلقائياً للطالب وولي أمره فور الانتهاء.</Alert>

        {loadingStudents && <SkeletonRows count={3} rowHeight={160} gap={14} />}
        {!loadingStudents && students.length === 0 && <Text style={s.muted}>لا يوجد طلاب في هذا السياق</Text>}

        {students.map((st) => (
          <StudentRecorderCard key={st._id} student={st} context={selected} onSent={() => forceRerender((n) => n + 1)} />
        ))}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createS(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    page: { padding: theme.pagePadding, gap: 14 },
    muted: { fontSize: 13, color: theme.textMuted, fontFamily: theme.fontCairo, textAlign: 'center', paddingVertical: 24 },
    backLink: { fontSize: 13, color: theme.green, fontFamily: theme.fontCairoBold, marginBottom: 4 },
    studentHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.greenPale, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontFamily: theme.fontCairoBold, color: theme.green },
    studentName: { fontSize: 14, fontFamily: theme.fontCairoBold, color: theme.text },
    lastHifz: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    label: { fontSize: 12, fontFamily: theme.fontCairoBold, color: theme.text, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, fontFamily: theme.fontCairo, fontSize: 13, color: theme.text, backgroundColor: theme.inputBg },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    chipActive: { backgroundColor: theme.greenPale, borderColor: theme.green },
    chipText: { fontSize: 11, fontFamily: theme.fontCairo, color: theme.textMuted },
    chipTextActive: { color: theme.green, fontFamily: theme.fontCairoBold },
    recArea: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    recBtn: { backgroundColor: theme.greenAccent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    recBtnStop: { backgroundColor: theme.red },
    recBtnText: { color: theme.white, fontFamily: theme.fontCairoBold, fontSize: 13 },
    timer: { fontSize: 16, fontFamily: theme.fontCairoBold, color: theme.green },
    sendBtn: { backgroundColor: theme.gold, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 },
  });
}
```

- [ ] **Step 4: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: all three files no longer error.

- [ ] **Step 5: Manual verification against the real dev server**

Log in as a teacher and step through "تقييم الجلسة", "واجب جماعي", and "تسجيل الدرس": confirm each picker shows tracks only, and confirm a save/create/record action on each succeeds.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/evaluate.tsx quran-hifz-mobile/app/\(portal\)/teacher/grouphomework.tsx quran-hifz-mobile/app/\(portal\)/teacher/recordlesson.tsx
git commit -m "feat(mobile): collapse evaluate/grouphomework/recordlesson to single-kind track context"
```

---

### Task 21: `teacher/homework.tsx` + `teacher/plans.tsx` + `teacher/plan-detail.tsx` — display fixes

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/homework.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plans.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plan-detail.tsx`

**Interfaces:**
- Consumes: `Homework.track` from Task 2, `QuranPlan.targetType`/`.track` from Task 1.

- [ ] **Step 1: `teacher/homework.tsx` — replace line 76 — always "المسار: {…}"**

```tsx
                  <Text style={styles.infoItem}>{`المسار: ${getTitle(h.track)}`}</Text>
```

(`getName` — now only used for `h.student` on line 67 — and `getTitle` are otherwise unchanged.)

- [ ] **Step 2: `teacher/plans.tsx` — replace lines 7-11 (icon imports) — drop `IconSchool`**

```tsx
import {
  IconPlus, IconPencil, IconCopy, IconTrash, IconCalendarEvent,
  IconUsers, IconCalendarWeek, IconBook, IconBook2, IconFiles, IconCalendarDue,
  IconProgress, IconCalendarStar,
} from '@tabler/icons-react-native';
```

- [ ] **Step 3: Replace lines 33-41 (`targetLabel`) — two-way branch**

```tsx
function targetLabel(plan: QuranPlan): string {
  if (plan.targetType === 'track') {
    return typeof plan.track === 'object' ? plan.track?.title ?? '—' : '—';
  }
  return `${plan.students?.length ?? 0} طالب محدد`;
}
```

- [ ] **Step 4: Replace lines 83-87 (`PlanCard`'s `targetIcon`) — two-way branch**

```tsx
  const targetIcon = plan.targetType === 'track'
    ? <IconCalendarEvent size={15} color={theme.textMuted} />
    : <IconUsers size={15} color={theme.textMuted} />;
```

- [ ] **Step 5: `teacher/plan-detail.tsx` — replace lines 30-34 (`targetLabel`) — two-way branch**

```tsx
function targetLabel(plan: QuranPlan): string {
  if (plan.targetType === 'track') return typeof plan.track === 'object' ? plan.track?.title ?? '—' : '—';
  return `${plan.students?.length ?? 0} طالب محدد`;
}
```

- [ ] **Step 6: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: all three files no longer error.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/homework.tsx quran-hifz-mobile/app/\(portal\)/teacher/plans.tsx quran-hifz-mobile/app/\(portal\)/teacher/plan-detail.tsx
git commit -m "feat(mobile): teacher homework/plans/plan-detail — track-only display"
```

---

### Task 22: `teacher/plan-form.tsx` — `form.halqa` → `form.track` (789 lines, second-largest file in this phase)

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx`

**Interfaces:**
- Consumes: `useTracks` from Task 1's `tracks.ts`; `QuranPlan.targetType`/`.track` from Task 1's `quranPlan.ts`.
- Produces: `TeacherPlanForm` submitting `{ targetType: 'track', track }` (unless `lockedTarget` is set) — unchanged export name/route.

Mobile-specific quirk confirmed by reading the file directly: this form has **no `targetType` picker in the UI at all** — it always hardcoded `targetType: 'halqa'` on submit; the only way a plan got a different target was the read-only `lockedTarget` display when editing a plan whose `existingPlan.targetType !== 'halqa'`. Since `targetType` is now only `'track' | 'students'`, `lockedTarget` narrows to only the `students`-targeted case — editing a track-targeted plan is no longer special-cased, matching every other track-targeted flow in this app.

- [ ] **Step 1: Replace line 20 (import) — `useTracks` replaces `useHalqat`**

```tsx
import { useTracks } from '@/lib/queries/tracks';
```

- [ ] **Step 2: Replace lines 59-72 (`FormFields` type) — `halqa` → `track`**

```tsx
type FormFields = {
  name: string;
  description: string;
  track: string;
  /** One per selected type, max four. Their days must not overlap. */
  segments: FormSegment[];
  holidays: string[];
  startDate: string;
  endType: 'activeDays' | 'date';
  activeDaysCount: string;
  endDate: string;
  /** Daily grading split for this plan. Seeded from DEFAULT_GRADE_RUBRIC. */
  gradeRubric: GradeCriterion[];
};
```

- [ ] **Step 3: Replace lines 86-92 (`EMPTY`) — `halqa: ''` → `track: ''`**

```tsx
const EMPTY: FormFields = {
  name: '', description: '', track: '',
  segments: [emptySegment('حفظ')],
  holidays: [], startDate: todayISO(),
  endType: 'activeDays', activeDaysCount: '', endDate: '',
  gradeRubric: DEFAULT_GRADE_RUBRIC.map((c) => ({ ...c })),
};
```

- [ ] **Step 4: Replace line 98 (`params` type) — `halqaId` → `trackId`**

```tsx
  const params = useLocalSearchParams<{ mode?: string; id?: string; trackId?: string }>();
```

- [ ] **Step 5: Replace line 107 (data fetching) — `useTracks` replaces `useHalqat`**

```tsx
  const { data: tracks = [] } = useTracks(undefined, profileId);
```

- [ ] **Step 6: Replace lines 112-115 (initial form state) — `halqa` → `track`**

```tsx
  const [form, setForm] = useState<FormFields>(() => ({
    ...EMPTY,
    track: params.trackId ?? '',
  }));
```

- [ ] **Step 7: Replace lines 119-123 (`lockedTarget` state's doc comment) — narrows to students-only**

```tsx
  // A plan linked to a track via the track-detail "link plan" action always
  // shows this form's track picker unlocked (targetType is only 'track' or
  // 'students' now — no more special-casing a track-targeted plan). Only a
  // plan explicitly targeting an explicit student list locks the target,
  // matching the web form's "targetType editing not offered here" convention.
  const [lockedTarget, setLockedTarget] = useState<{ targetType: string; label: string } | null>(null);
```

- [ ] **Step 8: Replace lines 126-156 (prefill `useEffect`) — `halqa`→`track`, `lockedTarget` narrows to `'students'`**

```tsx
  useEffect(() => {
    if (prefillFrom && existingPlan && !prefilled) {
      setForm({
        name: isDuplicate ? `${existingPlan.name} (نسخة)` : existingPlan.name,
        description: existingPlan.description ?? '',
        track: existingPlan.targetType === 'track'
          ? (typeof existingPlan.track === 'object' ? existingPlan.track?._id ?? '' : existingPlan.track ?? '')
          : '',
        // The server always returns segments, migrating a legacy single-type
        // plan into a one-element array, so there is no old shape to handle.
        segments: existingPlan.segments.map((seg) => ({
          type: seg.type, days: seg.days,
          rangeStart: seg.rangeStart, rangeEnd: seg.rangeEnd,
        })),
        holidays: existingPlan.holidays ?? [],
        startDate: existingPlan.startDate ? existingPlan.startDate.split('T')[0] : todayISO(),
        endType: existingPlan.endType,
        activeDaysCount: existingPlan.activeDaysCount ? String(existingPlan.activeDaysCount) : '',
        endDate: existingPlan.endDate ? existingPlan.endDate.split('T')[0] : '',
        gradeRubric: existingPlan.gradeRubric?.length
          ? existingPlan.gradeRubric.map((c) => ({ ...c }))
          : DEFAULT_GRADE_RUBRIC.map((c) => ({ ...c })),
      });
      if (existingPlan.targetType === 'students') {
        setLockedTarget({ targetType: existingPlan.targetType, label: `${existingPlan.students?.length ?? 0} طالب محدد` });
      }
      setPrefilled(true);
    }
  }, [prefillFrom, isDuplicate, existingPlan, prefilled]);
```

- [ ] **Step 9: Replace line 255 (validation) — "حلقة" → "مسار"**

```tsx
    if (!lockedTarget && !form.track) return setFormError('يرجى اختيار مسار');
```

- [ ] **Step 10: Replace lines 276-290 (`body.targetType`/`.track` + teacher fallback) — `halqa`→`track`**

```tsx
    if (!lockedTarget) {
      body.targetType = 'track';
      body.track = form.track;
    }
    if (!isEdit) {
      // `teacher` is required by the server on create. An admin reaching this
      // form from the track drill-down has no profileId of their own, so fall
      // back to the teacher who owns the track the plan targets.
      const trackTeacher = tracks.find((t) => t._id === form.track)?.teachers[0];
      body.teacher = profileId
        ?? (typeof trackTeacher === 'object' ? trackTeacher?._id : trackTeacher);
      if (!body.teacher) {
        setFormError('تعذّر تحديد المعلم لهذه الخطة — اختر مسارًا له معلم مُسنَد.');
        return;
      }
    }
```

- [ ] **Step 11: Replace lines 350-364 (the target `FormGroup` in the JSX) — "الحلقة" → "المسار"**

```tsx
          {lockedTarget ? (
            <FormGroup label="الفئة المستهدفة">
              <Text style={s.lockedText}>{lockedTarget.label} (لا يمكن تغييرها من هنا)</Text>
            </FormGroup>
          ) : (
            <FormGroup label="المسار" required>
              <FormSelect
                value={form.track}
                onChange={(v) => sf('track', v)}
                options={tracks.map((t) => ({ value: t._id, label: t.title }))}
                placeholder="اختر مسارًا"
              />
            </FormGroup>
          )}
```

- [ ] **Step 12: Typecheck**

```bash
cd quran-hifz-mobile && npx tsc --noEmit
```

Expected: `teacher/plan-form.tsx` no longer errors.

- [ ] **Step 13: Manual verification against the real dev server**

Log in as a teacher, open "الخطط الفردية" → "خطة جديدة": confirm the form shows "المسار" (not "الحلقة") sourced from your tracks, that segments/holidays/duration/rubric all still work exactly as before, and that submitting creates a track-targeted plan. Edit an existing students-targeted plan and confirm its target still shows locked/read-only.

- [ ] **Step 14: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/plan-form.tsx
git commit -m "feat(mobile): TeacherPlanForm — form.track replaces form.halqa, lockedTarget narrows to students-only"
```

---
