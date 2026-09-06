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
