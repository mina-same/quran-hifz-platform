# Halqa/Track Restructure — Phase 3 (Mobile) Design

**Status:** Approved by user 2026-09-06. Ready for `superpowers:writing-plans`.

**Context:** Phases 1 (server) and 2 (web) are complete and shipped. Phase 1 deleted
`Halqa` entirely, gave `Masjid` a required `gender: 'male'|'female'` field, renamed
`SpecialTrack`→`Track` (gained required `masjid`, dropped `location`/`enrolledStudents`),
and collapsed every context-carrying model (`Attendance`/`Evaluation`/`Homework`/
`GroupHomework`/`LessonRecording`/`QuranPlan`) to a single required `track` field.
Single-track-per-student is intentional — no cross-track temporary programs.

This phase brings `quran-hifz-mobile` in line with that already-shipped server contract.
It is **not** a redesign: no new features, no UI behavior beyond what's needed to remove
the halqa/specialTrack duality (with two narrow, confirmed exceptions below where mobile's
fixed-tab-bar/two-step-form constraints have no web equivalent to mirror). Full research
of the current mobile state lives in
`docs/superpowers/specs/2026-09-06-halqa-track-restructure-phase3-mobile-research.md` —
this spec is the resolved, approved version of that research; the plan should treat this
file as authoritative and the research doc as background.

## Global Constraints

- No new features. Every change here exists to consume the already-shipped server
  contract or to remove now-dead halqa/specialTrack duality.
- Single-track-per-student: never build UI that lets a student appear on more than one
  track.
- `Track` hook names already correct where they exist (`useCreateTrack`/`useUpdateTrack`/
  `useDeleteTrack`) — do not rename them again.
- Grading logic and the same-day multi-segment scheduling internals are untouched by
  this phase.
- Where a mobile screen has a direct web equivalent whose Phase 2 resolution is known,
  mirror that resolution rather than re-deciding independently (see `student/tracks.tsx`
  below).

## 1. API / query layer

- **Delete** `lib/queries/halqat.ts` entirely (the `Halqa` type, `useHalqat`/`useHalqa`/
  `useCreateHalqa`/`useUpdateHalqa`/`useDeleteHalqa` hooks).
- **Rename** `lib/queries/specialTracks.ts` → `lib/queries/tracks.ts`:
  - `SpecialTrack` type → `Track`: drop `location`/`enrolledStudents`; add required
    `masjid: {_id, name, gender: "male"|"female"} | string`.
  - `useSpecialTracks(status?, teacherId?, studentId?)` → `useTracks(status?, teacherId?)`
    — drop the `studentId` param and its `?student=` query.
  - Keep `useCreateTrack`/`useUpdateTrack`/`useDeleteTrack` exactly as named.
  - Replace `useEnrollStudent`/`useUnenrollStudent` with a single
    `useAssignStudent({id, studentId})` calling `POST /api/tracks/:id/assign`.
  - **Add** `useTrack(id)` — a single-track fetch hook (`GET /api/tracks/:id`), needed by
    `student/schedule.tsx` (retires that screen's `useHalqa(id)` call).
- **`lib/queries/quranPlan.ts`**: `targetType` union `"halqa"|"students"|"specialTrack"` →
  `"track"|"students"`. Drop `PlanHalqa` type and the `halqa` field; rename `specialTrack`
  → `track` (type `PlanTrack`). `useQuranPlans` filter param `halqa?`/`specialTrack?` →
  `track?`.
- **`lib/queries/attendance.ts`, `evaluations.ts`, `groupHomework.ts`, `homework.ts`,
  `lessonRecordings.ts`**: each record type's `halqa?`/`specialTrack?` pair collapses to a
  single required `track`; filter types and mutation bodies follow. `evaluations.ts`'s
  `useRubric(ctx)` param becomes `{track, plan?}`.
- **`lib/queries/students.ts`**: `Student.halqa`/`Student.masjid` → single required
  `Student.track: {_id, name, ..., masjid, teachers, daysPerWeek, timeSlot} | string`.
  `StudentFilters.halqa?`/`specialTrack?` → `track?`; `StudentFilters.masjid?` **stays
  unchanged** (server confirmed it still resolves via `Track.find({masjid})`).
- **`lib/queries/teachers.ts`**: `Teacher.halqatCount?` → `Teacher.tracksCount?`.
- **`lib/queries/stats.ts`**: `DashboardStats.totalHalqat` → `totalTracks`.
- **`lib/queries/parent.ts`**: `ParentChild.halqa` → `ParentChild.track`.
- **`lib/queries/masajid.ts`**: add required `gender: 'male'|'female'` to `Masjid`
  (companion change, matches Phase 1/2's `Masjid` shape).

## 2. Dead code — delete outright

- `lib/types/halqa.ts`, `lib/types/student.ts`, `lib/types/teacher.ts` (verified zero
  importers except each other — an unreachable legacy parallel type system, not part of
  the halqa→track surface).
- `lib/data/students.ts` (mock arrays, verified zero importers anywhere).

## 3. `ContextCard.tsx` (mobile's `ContextPicker` mirror)

- `TeachingContext` type: drop `kind` entirely.
- Delete `halqaToContext`. Keep one `trackToContext` mapper (subtitle sourced from
  `masjid` name instead of the dropped `location` field; `studentCount` from a
  students-by-track count instead of `enrolledStudents.length`).
- The card component: remove every `kind === 'halqa' ? ... : ...` branch (badge text,
  subtitle label, **and the header background color swap** — settles on one fixed
  header color now that there's only one kind).
- No auto-skip — same as today, grid always renders even with one context.
- Consumers requiring the same ternary removal: `teacher/attendance.tsx`,
  `evaluate.tsx`, `grouphomework.tsx`, `recordlesson.tsx` (each screen's own View-1
  context-picker rendering collapses from two parallel lists — `halqat.map(...)` +
  `tracks.map(...)` — to one `useTracks({teacher}).map(trackToContext)` list; each
  screen's filter/mutation-payload ternary collapses to always `{track: selected.id}`).

## 4. Shared domain components

- **`TrackDetail.tsx`** — delete the `useHalqat` import and `halqaIdsInTrack` derivation
  entirely; roster becomes direct `useStudents({track: track._id})`. Plan-link mutation
  payload renames `specialTrack`→`track`.
- **`EvaluationRoster.tsx`** — `RosterContext` drops `kind` (becomes `{id: string}`);
  `contextFilter` becomes `{track: context.id}` unconditionally.
- **`MasjidAccordion.tsx`** — accept `masjid.tracks` directly (server already
  pre-populates this per Phase 1), drop the separate caller-side `halqat` resolution.
  Row fields rename halqa→track with **no other redesign** — same layout, same field
  count, per the "no new features" constraint.
- **`IndividualPlanPanel.tsx`** — comment-only fix ("halqa/track plan" → "track plan").
- **`ReportsScreen.tsx`** — drop `halqat` prop entirely, keep `tracks: Track[]`. `scope`
  state simplifies `""|"halqa:<id>"|"track:<id>"` → `""|"track:<id>"`. The halqa-
  comparison leaderboard becomes a track-comparison leaderboard regrouped by
  `e.track`/`s.track` — same feature, one less branch. CSV export column
  "الحلقة"→"المسار".
- **`StudentReportPanel.tsx`** — `aggregateFilter` prop narrows `{halqa?; specialTrack?}`
  → `{track?}` (pass-through type only).
- **`HalqaCard.tsx`**, **`DaySlider.tsx`** — `HalqaCard.tsx` deleted outright (superseded
  by Track's own fields); `DaySlider.tsx` confirmed to have zero halqa/track coupling,
  no change.

## 5. `components/ui/ScopeTabs.tsx`

`ScopeOption.kind?` union drops `'halqa'` (keeps `'all'|'track'`); the now-dead
`IconSchool` import is removed.

## 6. Screens — delete outright

- `app/(portal)/admin/halqat.tsx`, `admin/halqa-form.tsx` (halqa CRUD, fully subsumed by
  track CRUD).
- `app/(portal)/teacher/myhalqa.tsx` (superseded by the tracks list + `TrackDetail.tsx`).

## 7. Screens — rename

- `special_tracks.tsx` → `tracks.tsx` in all three portals (admin/teacher/student).
  Component renames: `AdminSpecialTracks`→`AdminTracks`, `TeacherSpecialTracks`→
  `TeacherTracks`, `StudentSpecialTracks`→`StudentTracks`.

## 8. Admin screens — edits

- **`masajid.tsx` + `MasjidAccordion.tsx`**: drop the separate `useHalqat()` fetch, pass
  `masjid.tracks` straight to the accordion. `masjid-form.tsx` gains the required
  `gender` select.
- **`register.tsx`**: replace the masjid-then-halqa two-step picker with a **single
  "المسار" `FormSelect` sourced from `useTracks()`**, submitted as `body.track` — masjid
  is shown as part of the track's info, not separately selected. `masar.halqa` suggested-
  name copy reworded to "المسار المقترح" (kept, not dropped — purely cosmetic label
  text, never sent to the server).
- **`students.tsx`**: `trackLabel(s)` simplifies from the two-hop `s.halqa.specialTrack.title`
  to direct one-hop `s.track.title`; separate "الحلقة"/"المسجد" chips collapse to one
  "المسار" chip.
- **`student-form.tsx`**: replace the independent `halqa`/`masjid` selects with a single
  "المسار" select sourced from `useTracks()`, submitted as `{track}`.
- **`teachers.tsx`**: `{t.halqatCount ?? 0}` chip → `{t.tracksCount ?? 0}`.
- **`dashboard.tsx`**: `totalHalqat` stat tile → `totalTracks`; drop the `HalqaCard`
  mini-list entirely (no track-list replacement — matches "no new features"); `trackLabel`
  simplifies to one-hop `s.track.title`.
- **`special_tracks.tsx`** (→ `tracks.tsx`, 903 lines, largest file in this phase): drop
  `location`/`enrolledStudents` fields+displays; add required `masjid` FK select (options
  from `useMasajid()`, replacing today's free-text/masjid-name-string location field);
  replace the enroll/unenroll student-management panel with a single "نقل الطالب"
  (transfer) action calling `useAssignStudent` — every assignment is a transfer, never an
  add, since a student can only ever be on one track. Plan this as its own task.
- **`reports.tsx`**: drop `halqat` prop + `useHalqat()` import, pass only `tracks` into
  `ReportsScreen`.

## 9. Teacher screens — edits

- **`dashboard.tsx`**: `useHalqat({teacher})` → `useTracks({teacher})` for the stat +
  card list.
- **`students.tsx`**: drop the `"halqa:<id>"` filter variant and `useHalqat` import;
  roster becomes `useStudents({track: trackIds.join(',')})` where `trackIds` comes from
  `useTracks({teacher})`.
- **`attendance.tsx`**: `contextFilter` always `{track: selected.id}`; plan match always
  `plan.targetType === 'track'`; single `useTracks({teacher})` list in View-1 (drop the
  parallel halqat list).
- **`evaluate.tsx`**, **`grouphomework.tsx`**, **`recordlesson.tsx`**: identical
  dual-kind-context-picker collapse as `attendance.tsx`.
- **`homework.tsx`**: drop the `h.specialTrack ? ... : getName(h.halqa)` ternary — always
  "المسار: {getName(h.track)}".
- **`plans.tsx`**, **`plan-detail.tsx`**: `targetLabel`/`targetIcon` three-way branch
  (`halqa`/`specialTrack`/`students`) → two-way (`track`/`students`).
- **`plan-form.tsx`**: form field `form.halqa` → `form.track`, sourced from
  `useTracks({teacher})` (was `useHalqat`). `lockedTarget` narrows to only the
  `students`-targeted case (no longer special-cases track-targeted plans, since
  `targetType` is now only `'track'|'students'`). Validation message "يرجى اختيار حلقة"
  → "يرجى اختيار مسار". Handoff param `halqaId`→`trackId`. Teacher-fallback lookup
  `halqat.find(...)?.teacher` → `tracks.find(...)?.teachers[0]`.
- **`reports.tsx`**: `useHalqat({teacher})` → `useTracks({teacher})`;
  `baseFilter={halqa: ...||'__none__'}` → `{track: ...||'__none__'}` (same sentinel
  pattern for the empty-list case).
- **`special_tracks.tsx`** (→ `tracks.tsx`): `enrolledStudents.length` capacity display
  needs a students-by-track count instead (server-computed field, or a
  `useStudents({track})` count — confirm exact source during planning).

## 10. Student screens — edits

- **`dashboard.tsx`**: `getName(student.halqa)`/`getName(student.masjid)` → single
  `getName(student.track)`; schedule fields from `student.track.daysPerWeek`/`.timeSlot`.
- **`homework.tsx`**: drop the `today.specialTrack ? ... : 'الحلقة'` ternary — always
  "مسار: {getTitle(today.track)}".
- **`schedule.tsx`**: `useHalqa(halqaId)` → `useTrack(trackId)` (the new hook from §1),
  reading `track.daysPerWeek`/`.timeSlot`/`.teachers`/`.masjid` instead of
  `halqa.days`/`.time`/`.teacher`/`.masjid`.
- **`special_tracks.tsx`** (→ `tracks.tsx`): **mirror the already-shipped web precedent**
  (`quran-hifz/src/quran/pages/student/StudentTracks.tsx`) exactly — keep the same list
  UI, section headers (active/upcoming/ended), and empty state; fetch `useTracks()` and
  filter to the single track matching `student.track` (renders 0 or 1 cards); retitle
  "مساري". No structural rewrite. Drop the removed `useSpecialTracks(undefined,
  undefined, profileId)` third-arg call.

## 11. Parent + login screens

- **`parent/dashboard.tsx`**: `child.halqa` → `child.track`.
- **`app/index.tsx`**: `getHalqaName(h)` helper → `getTrackName(child.track)`.

## 12. Nav config + routing

- **`lib/constants/portals.ts`**: remove the `myhalqa` (teacher) and `halqat` (admin)
  nav entries/groups entirely. Rename `special_tracks`→`tracks` id in all three portals;
  relabel to the appropriate singular/plural Arabic ("مساري" for student, "مساراتي" for
  teacher/admin as fits each list). Update mock role-display copy referencing "حلقة عمر
  بن الخطاب" in the same pass.
- **`app/(portal)/admin/_layout.tsx`**: remove `Tabs.Screen name="halqat"`; rename
  `name="special_tracks"`→`"tracks"` and **promote it into the now-vacant visible-tab
  slot** (was `halqat`'s position).
- **`app/(portal)/teacher/_layout.tsx`**: remove `Tabs.Screen name="myhalqa"`; rename
  `name="special_tracks"`→`"tracks"` and **promote it into the now-vacant visible-tab
  slot** (was `myhalqa`'s position, `title: 'حلقاتي'`→ new track-appropriate title).
- **`app/(portal)/student/_layout.tsx`**: rename `name="special_tracks"`→`"tracks"`
  (stays in the "المزيد" overflow — student's tab bar loses no visible slot since
  `special_tracks` was never a visible tab there).
- Grep the whole tree for `special_tracks`/`halqat`/`myhalqa` string literals (route
  names, `PORTALS` ids, `router.push` calls, `MORE_IDS` arrays) since mobile has no
  single central route registry to anchor the search, unlike web's `pageRegistry.ts`.

## 13. Cosmetic / low-risk

- **`lib/constants/masarMap.ts`**: `MasarInfo.halqa` suggested-name copy reworded from
  "الحلقة المقترحة" to "المسار المقترح" — text change only, never sent to the server.

## Testing

- Confirm the mobile app's actual type-check/test gate during planning (repo convention
  elsewhere is `tsc --noEmit`; mobile additionally has `quranRange.test.ts`, which this
  restructure does not touch).
- Manual click-through against the live dev server + the real (already Phase 1/2
  migrated) Atlas dev database, covering the golden paths per portal: admin creates a
  masjid with gender and a track under it, registers a student directly onto a track,
  transfers a student between tracks; teacher takes attendance/records evaluation/group
  homework/lesson recording for a track via the single-kind context card, views/edits/
  creates a plan targeting a track; student sees their own track/schedule/homework;
  parent sees their child's track. Mirrors Phases 1/2's live-verification approach.

## Out of scope

- The same-day multi-segment scheduling internals (`PlanSegment`, `segmentReversed`,
  `todayAssignments`, etc.) — untouched.
- `IndividualPlan`, `HifzEntry`, `Message`, `KPI`, `ParentStudent`, `User` models/queries
  beyond updating any `halqa`/`specialTrack` references they hold to the new `track`
  shape.
- Any new feature or UX behavior beyond removing the halqa/specialTrack duality, except
  the two confirmed mobile-specific calls above (tab-bar slot promotion, single-track
  registration picker) — both are minimal adaptations of existing UI, not new features.
