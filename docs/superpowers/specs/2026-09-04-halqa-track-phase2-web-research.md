# Phase 2 (web) — research handoff

Phase 1 (server) is complete and pushed to `origin/main`. This doc captures the
research needed to design Phase 2 (`quran-hifz` web app) so a fresh chat can
pick it up without re-deriving it. Read alongside:
`docs/superpowers/specs/2026-09-05-halqa-track-restructure-design.md` (overall design)
and `docs/superpowers/plans/2026-09-05-halqa-track-restructure-phase1-server.md` (locked server API shape).

## Server contract Phase 2 must consume (already shipped)

- `Halqa` model/routes/controller: deleted. `/api/halqat` gone.
- `Masjid` gained required `gender: 'male'|'female'`. `getMasajid`/`getMasjid` now
  populate `tracks` (was `halqat`) via `Track.find({masjid})`.
- `SpecialTrack` renamed `Track`: gained required `masjid`, dropped `location`
  and `enrolledStudents`. Routes moved `/api/special-tracks` → `/api/tracks`.
  New: `GET /api/tracks/:id`, `POST /api/tracks/:id/assign` (replaces
  enroll — sets `Student.track`, a transfer not an array op). Removed:
  enroll/unenroll endpoints, `?student=` filter on the list endpoint.
- `Student.halqa`+`Student.masjid` → single required `Student.track`.
- `Attendance`/`Evaluation`/`Homework`/`GroupHomework`/`LessonRecording`: single
  required `track` field (was `halqa?`/`specialTrack?` XOR).
- `QuranPlan.targetType`: `'halqa'|'students'|'specialTrack'` → `'track'|'students'`.
  `halqa` field removed, `specialTrack` renamed `track`.
- Teacher stats: `halqatCount`/`halqat` → `tracksCount`/`tracks` (breaking wire format).
- Global stats: `totalHalqat`+`totalSpecialTracks` → single `totalTracks` (breaking).
- Single-track-per-student is fully intentional (user-confirmed) — no cross-track
  temporary programs, ever.

## Current web state (as of this research pass)

**`ContextPicker.tsx`** (`quran-hifz/src/quran/components/common/ContextPicker.tsx`,
136 lines) — unifies "halqa | specialTrack" into one `TeachingContext` shape
(`kind: "halqa"|"specialTrack"`) with `halqaToContext`/`trackToContext`/
`hasDirectEnrollment` mappers and a card-grid picker component. Consumers:
- `TeacherDashboard.tsx` — uses the mappers only (no picker UI) for stat counts.
- `TeacherAttendance.tsx` — renders picker as its "View 1"; branches every
  filter/mutation on `selected.kind === "halqa" ? {halqa:id} : {specialTrack:id}`.
- `TeacherGroupHomework.tsx` — identical pattern to TeacherAttendance.

Since `Halqa` is gone, this whole dual-kind abstraction collapses to a
single-kind "pick a track" picker — no more branching, no more `kind` field.

**`AdminHalqat.tsx`** (354 lines) — full CRUD for حلقات: fields
name/teacher/masjid/specialTrack/days/time/capacity. Since `Track` already
carries `masjid`, `teachers[]`, `daysPerWeek`, `timeSlot`, `maxStudents` (per
the Phase 1 model), this page's entire function is already subsumed by the
Track CRUD page. Deletion candidate, not a merge.

**`AdminMasajid.tsx`** (266 lines) — CRUD for مساجد, currently only
`name`+`location` fields, no `gender`. Nested list shows `m.halqat`. Needs:
add `gender` field to form; nested list becomes `m.tracks` (already the shape
the server sends per Phase 1's `getMasajid`).

**`api/halqat.ts`** (71 lines) — `Halqa` type + `useHalqat(s)`/CRUD hooks.
Deletion candidate (mirrors server deletion).

**`api/special-tracks.ts`** (87 lines) — `SpecialTrack` type has
`location`/`enrolledStudents` (both dropped server-side), missing `masjid`
(now required server-side). Hooks already conveniently named `useCreateTrack`/
`useUpdateTrack`/`useDeleteTrack` (not `useCreateSpecialTrack`), so only the
type shape, `useSpecialTracks`→`useTracks` name, and enroll/unenroll→assign
need changing. `useSpecialTracks(status, teacherId, studentId)` sends
`?student=` — that filter is gone server-side, must be dropped.

**`AdminSpecialTracks.tsx`** (932 lines), **`TeacherSpecialTracks.tsx`**,
**`StudentSpecialTracks.tsx`** — full contents captured in this session's
research (large; re-run the same Explore-agent research pass in the new
session if the raw content is needed again, or recall via
`git log`/direct file read since they still exist on disk unchanged).

**`TeacherHalqa.tsx`** (route key `myhalqa`) — a teacher's single-halqa view.
Superseded by the already-existing `TeacherTrackDetail.tsx` (built during the
earlier same-day-segments work). Deletion candidate; `myhalqa` nav should
point at the tracks list instead.

**`TeacherPlanForm.tsx`** — does NOT use `ContextPicker`. Has its own
`targetType` state; `TARGET_TYPES` UI list only offers `"halqa"` (a
`specialTrack` branch exists in form state/rendering but has no button —
dead from the UI's perspective, reachable only via edit-handoff). Needs:
`TARGET_TYPES` → offer `"track"`; field renames `halqa`→`track`,
`specialTrack`→ folded into the same `track` field; handoff key `halqaId`→`trackId`.

**`TeacherPlanDetail.tsx`**, **`TeacherPlans.tsx`** — read `plan.targetType`/
`plan.halqa`/`plan.specialTrack` purely for display (target label/icon). Simple
rename to `plan.track`, drop the halqa branch.

**`TeacherReports.tsx`**, **`AdminReports.tsx`**, **`ReportsDashboard.tsx`**,
**`StudentReportPanel.tsx`** — currently show halqat and tracks as two parallel
scope-tab sources (`scope: "halqa:<id>"|"track:<id>"`), plus a
halqa-only comparison leaderboard (`halqaEvalStats`) with no track equivalent.
Becomes track-only scope; the leaderboard's grouping key becomes `track`
instead of `halqa` (same feature, one less branch).

**`TeacherStudents.tsx`** — derives roster via halqat→students plus own
tracks' `enrolledStudents`. With `Student.track` as sole membership and
`Track.teachers` many-to-many, roster becomes a direct
`useStudents({track: trackIds.join(',')})` — simpler than today.

**`AdminStudents.tsx`** — edits `Student.halqa` directly (a per-student FK
editor, separate concern from ContextPicker). Needs: field becomes
`student.track`, options come from `useTracks()` directly (no more indirect
halqa→masjid→track chain).

**`IndividualPlanPanel.tsx`** — no code references `halqa`/`specialTrack`,
only a comment mentioning "halqa/specialTrack-targeted plans." Comment-only fix.

**`TeacherTrackDetail.tsx`** (already the Track detail page from the earlier
same-day-segments work) — still round-trips through `Halqa` for roster
derivation (`useHalqat`, `h.specialTrack`, `st.halqa`) and for plan-linking
(`p.specialTrack`) and create-plan handoffs (`halqaId`). Since `Halqa` is
being deleted and `Student.track` becomes the sole membership mechanism, this
whole roster-derivation path collapses to `useStudents({track: track._id})`
directly — no more `useHalqat` import at all. Plan link/create calls rename
`specialTrack`→`track`, handoffs rename `halqaId`→`trackId`.

**`pageRegistry.ts`** — route keys to retire: `halqat` (admin), `myhalqa`
(teacher). Route keys to consider renaming for consistency with the
server-side rename (not required, but matches the pattern): `special_tracks`/
`specialtracks`→`tracks`, component names `AdminSpecialTracks`→`AdminTracks`
etc. If renamed, every `showPage("specialtracks"|"trackdetail")` call site
must move together — known call sites: `TeacherAttendance.tsx` (~line 709,
comment-adjacent nav), `TeacherTrackDetail.tsx` (lines ~850, ~884).

## Design questions — resolved (user-confirmed 2026-09-05)

1. **ContextPicker fate:** keep it as a simple single-kind "pick your track"
   grid — same picker UI, drop the halqa/track branching, always shows the
   grid even when a teacher has only one track. (No auto-skip behavior.)
2. **Route key renaming:** rename `special_tracks`/`specialtracks`→`tracks`
   (and `AdminSpecialTracks`→`AdminTracks`, etc.) for consistency with the
   server-side rename already shipped. Touches the ~4 known call sites listed
   above (`pageRegistry.ts`, `TeacherAttendance.tsx` ~line 709,
   `TeacherTrackDetail.tsx` ~lines 850/884) — update them together.
3. **`AdminHalqat.tsx`/`TeacherHalqa.tsx` disposition:** delete both. Their
   function (roster, schedule, teacher assignment) is already covered by
   AdminTracks/TeacherTracks + TeacherTrackDetail. Remove their route keys
   (`halqat` admin, `myhalqa` teacher) from `pageRegistry.ts` too, and repoint
   any nav item that linked to `myhalqa` at the tracks list instead.

## Recommended next step

Open a fresh chat and run `superpowers:brainstorming` (Architectural path,
though most decisions above are now pre-resolved) for Phase 2, using this doc
plus the two Phase 1 docs as input, then `superpowers:writing-plans` →
`superpowers:subagent-driven-development`, mirroring exactly how Phase 1 was
run. Full raw file contents (AdminSpecialTracks.tsx, TeacherSpecialTracks.tsx,
StudentSpecialTracks.tsx, and per-line excerpts of the attendance/evaluation/
report screens) were captured in this session's research pass but are not
reproduced here in full — re-read the files directly (they're unchanged on
disk) rather than trusting a stale copy.
