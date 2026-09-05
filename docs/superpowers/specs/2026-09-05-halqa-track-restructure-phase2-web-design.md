# Halqa/Track Restructure — Phase 2 (Web) Design

**Status:** Approved by user 2026-09-05. Ready for `superpowers:writing-plans`.

**Context:** Phase 1 (server) is complete and shipped to `origin/main`. It
deleted `Halqa` entirely, gave `Masjid` a required `gender: 'male'|'female'`
field, renamed `SpecialTrack`→`Track` (gained required `masjid`, dropped
`location`/`enrolledStudents`), and collapsed every context-carrying model
(`Attendance`/`Evaluation`/`Homework`/`GroupHomework`/`LessonRecording`/
`QuranPlan`) to a single required `track` field. Single-track-per-student is
intentional — no cross-track temporary programs.

This phase brings the `quran-hifz` web app in line with that already-shipped
server contract. It is **not** a redesign: no new features, no UI behavior
beyond what's needed to remove the halqa/specialTrack duality. Full research
of the current web state lives in
`docs/superpowers/specs/2026-09-04-halqa-track-phase2-web-research.md` —
this spec is the resolved, approved version of that research; the plan
should treat this file as authoritative and the research doc as background.

## Global Constraints

- No new features. Every change here exists to consume the Phase 1 server
  contract or to remove now-dead halqa/specialTrack duality — nothing else.
- Single-track-per-student: never build UI that lets a student appear on
  more than one track.
- `Track` type/hook names already correct where they exist
  (`useCreateTrack`/`useUpdateTrack`/`useDeleteTrack`) — do not rename them
  again.
- Mobile (`quran-hifz-mobile`) is explicitly out of scope — Phase 3, separate
  plan.
- Grading logic and the same-day multi-segment scheduling internals
  (`normalizePlanSegments`, `segmentOccurrenceCounts`, `todayAssignment(s)`,
  `validateSegmentDays`) are untouched by this phase.

## 1. API layer

- **Delete** `quran-hifz/src/quran/api/halqat.ts` entirely (the `Halqa`
  type, `useHalqat`/`useHalqa`/`useCreateHalqa`/`useUpdateHalqa`/
  `useDeleteHalqa` hooks).
- **Rename** `quran-hifz/src/quran/api/special-tracks.ts` →
  `quran-hifz/src/quran/api/tracks.ts`:
  - `SpecialTrack` type → `Track`: drop `location: string` and
    `enrolledStudents: (EnrolledStudent | string)[]`; add required
    `masjid: { _id: string; name: string; gender: "male" | "female" } | string`.
  - `useSpecialTracks(status?, teacherId?, studentId?)` → `useTracks(status?, teacherId?)`.
    Drop the `studentId` param and its `?student=` query entirely (the
    server dropped that filter in Phase 1). No new params — the per-masjid
    track list (`AdminMasajid.tsx`'s nested view) comes pre-populated as
    `m.tracks` on the masjid response, so no separate masjid-filtered fetch
    is needed.
  - Keep `useCreateTrack`/`useUpdateTrack`/`useDeleteTrack` exactly as
    named — only their body/response types change shape (via the renamed
    `Track` type).
  - Replace `useEnrollStudent`/`useUnenrollStudent` with a single
    `useAssignStudent({ id, studentId })` calling
    `POST /api/tracks/:id/assign` with `{ studentId }` — mirrors the
    server's Phase 1 `assignStudent` endpoint (a transfer, not an array op).
  - Keep `TRACK_DETAIL_ID_KEY` and its sessionStorage handoff mechanism
    unchanged.
- **`quran-hifz/src/quran/api/quran-plans.ts`**: change the `targetType`
  union from `"halqa" | "students" | "specialTrack"` to
  `"track" | "students"`. Remove the `halqa` field from the plan type;
  rename `specialTrack` → `track`.

## 2. ContextPicker

`quran-hifz/src/quran/components/common/ContextPicker.tsx` currently unifies
"halqa | specialTrack" into one `TeachingContext` shape with a `kind`
discriminant. Since a teaching context is now always a track:

- `TeachingContext` type: drop the `kind` field entirely.
- Delete `halqaToContext` and `hasDirectEnrollment` (no longer meaningful —
  every track now has direct students via `Student.track`).
- Keep `trackToContext` producing the same card shape (`id`, `title`,
  `subtitle` — keeps the existing `isOnline` distinction but sources the
  offline case from the masjid name instead of the now-gone `location`
  field: `t.isOnline ? "أونلاين" : getName(t.masjid)`; `scheduleLabel`
  unchanged; `studentCount` now computed via a students-by-track count
  rather than `enrolledStudents.length`).
- The `ContextPicker` component itself: remove every `ctx.kind === "halqa"
  ? ... : ...` branch (icon, label text, "المسجد"/"المكان" subtitle label).
  Grid UI, empty-state, and click behavior are otherwise unchanged — it
  still renders even when there's exactly one context (no auto-skip).

**Consumers:**
- `TeacherAttendance.tsx`: drop every `selected.kind === "halqa" ? {halqa:
  selected.id} : {specialTrack: selected.id}` ternary → always `{track:
  selected.id}`. Same for the plan-target match
  (`p.targetType === (selected?.kind === "specialTrack" ? "specialTrack" :
  "halqa")` → `p.targetType === "track"`) and the bulk-evaluate mutation
  payload.
- `TeacherGroupHomework.tsx`: identical ternary removals for
  `useGroupHomework` filter and `createHW.mutateAsync` payload.
- `TeacherDashboard.tsx`: the `contexts` array used for stat counts is built
  from tracks only (drop the halqat half of the union).

## 3. CRUD pages

- **Delete** `AdminHalqat.tsx` and `TeacherHalqa.tsx` outright. Their
  function (roster, schedule, teacher assignment) is already covered by the
  Track pages + `TeacherTrackDetail.tsx`.
- **`AdminMasajid.tsx`**: add a required `gender` select (`male`/`female`,
  labeled جامع/دار at display time — matching the server's design that
  gender is a display-time label, not stored in `Masjid.name`) to the
  create/edit form. The nested per-masjid list reads `m.tracks` instead of
  `m.halqat` (the server's `getMasajid` already sends this shape per
  Phase 1).
- **`AdminStudents.tsx`**: the per-student halqa editor becomes a per-student
  track editor — `form.halqa` → `form.track`, options sourced directly from
  `useTracks()` (no more indirect halqa→masjid→track derivation). The
  `getTrackTitle`/`getObjName` helpers reading `s.halqa`/`h.specialTrack`
  simplify to reading `s.track` directly.
- **Rename** `AdminSpecialTracks.tsx` → `AdminTracks.tsx`,
  `TeacherSpecialTracks.tsx` → `TeacherTracks.tsx`,
  `StudentSpecialTracks.tsx` → `StudentTracks.tsx`. Inside each: drop the
  `location`/`enrolledStudents` form fields and displays, add a required
  `masjid` select (options from `useMasajid()`), replace the
  enroll/unenroll UI (student picker + add/remove buttons) with a single
  "نقل الطالب" (transfer student) action calling `useAssignStudent` — since
  a student can only be on one track, assigning to a new track is always a
  transfer, never an addition.

## 4. Plans

- **`TeacherPlanForm.tsx`**: `TARGET_TYPES` list changes its one entry from
  `{ value: "halqa", label: "حلقة كاملة", icon: "ti-school" }` to
  `{ value: "track", label: "مسار كامل", icon: "ti-route" }`. Drop the
  dead `specialTrack`-branch form state/rendering (no button ever reached
  it as "halqa" and "specialTrack" both collapse into the one `track`
  concept now — there is nothing left to preserve). Form field `halqa:
  string` and `specialTrack: string` merge into a single `track: string`.
  Plan-loading (`targetType`, `halqa: plan.halqa ? ... : ""`, `specialTrack:
  ...`) becomes `targetType: plan.targetType, track: plan.track ? getId(plan.track) : ""`.
  `useHalqat`/`useSpecialTracks` calls become a single `useTracks({teacher:
  teacherId})`. Validation message: "يرجى اختيار حلقة" → "يرجى اختيار مسار".
  Submit body: `track: form.targetType === "track" ? form.track :
  undefined` (replaces both the `halqa` and `specialTrack` lines). The
  create-mode handoff key `handoff.halqaId` → `handoff.trackId`.
- **`TeacherPlanDetail.tsx`, `TeacherPlans.tsx`**: `targetLabel`/`targetIcon`
  computation drops the three-way `halqa`/`specialTrack`/`students` branch
  for a two-way `track`/`students` branch, reading `plan.track` (was
  `plan.halqa` / `plan.specialTrack`).
- **`TeacherTrackDetail.tsx`**: remove the `useHalqat` import and every
  halqa-mediated roster derivation (`myHalqaIdsInTrack`, the `h.specialTrack`
  matching, `{halqa: myHalqaIdsInTrack.join(',')}` student filter) — roster
  becomes `useStudents({track: track._id})` directly, since
  `Student.track` is now the sole membership mechanism. Plan-linking
  (`p.specialTrack !== track._id` filter, `link()`'s `{targetType:
  "specialTrack", specialTrack: track._id}` mutation payload) renames to
  `track`. The saved-evaluation/rubric queries
  (`{specialTrack: track._id, ...}`) rename to `{track: track._id, ...}`.
  The `createNewPlan`/`createPlanForStudent` handoffs drop the
  `myHalqaIdsInTrack`-derived `halqaId` and instead always pass
  `{ mode: "create", trackId: track._id }` (a track's students are now
  always exactly its own roster, so there's no ambiguity to resolve).
- **`IndividualPlanPanel.tsx`**: update the one comment referencing
  "halqa/specialTrack-targeted plans" to say "track-targeted plans." No
  code change — `planCoversStudent`'s logic (`targetType !== "students"` →
  covers everyone) already generalizes correctly.

## 5. Reports

- **`ReportsDashboard.tsx`**: drop the `halqat: Halqa[]` prop and the
  `Halqa` import; keep `tracks: SpecialTrack[]` renamed to `tracks:
  Track[]`. `scope` state simplifies from `"" | "halqa:<id>" |
  "track:<id>"` to `"" | "track:<id>"`. `scopedFilter` drops the `halqa:`
  branch. `scopeOptions` drops the halqat-mapping half. The halqa-comparison
  leaderboard (`halqaEvalStats`, `evalHalqaId`/`evalHalqaName`/
  `halqaIdOf`/`halqaNameOf`) becomes a track-comparison leaderboard,
  regrouped by `e.track`/`s.track` instead of `e.halqa`/`s.halqa` — same
  feature (a comparison table across teaching contexts), one less branch.
- **`StudentReportPanel.tsx`**: `aggregateFilter` prop type narrows from
  `{ halqa?: string; specialTrack?: string }` to `{ track?: string }`.
- **`TeacherReports.tsx`, `AdminReports.tsx`**: drop `useHalqat`/`halqat`
  entirely; `baseFilter` (teacher reports) becomes `{ track:
  tracks.map(t=>t._id).join(",") }` (or `{ track: "__none__" }` when empty,
  preserving the existing "no results" fallback behavior); pass only
  `tracks` into `<ReportsDashboard>` (drop the `halqat` prop).
- **`TeacherStudents.tsx`**: drop `useHalqat`, `halqaIds`, and the
  `{halqa: halqaIds.join(',')}` student filter — roster becomes
  `useStudents({track: trackIds.join(',')})` where `trackIds` comes from
  `useTracks({teacher: user?.profileId})`. The `filter` state's
  `"halqa:<id>"` variant is dropped (was already parallel to `"track:<id>"`
  — now `"track:<id>"` is the only scoped variant besides `"all"`).

## 6. Routing

- **`pageRegistry.ts`**: remove the `halqat` (admin) and `myhalqa` (teacher)
  route-key registrations along with their now-deleted component imports.
  Rename `special_tracks`/`specialtracks` (admin) and `specialtracks`
  (teacher/student) route keys to `tracks`, and their imported component
  names to `AdminTracks`/`TeacherTracks`/`StudentTracks` to match the
  file renames in section 3.
- Update every `showPage("specialtracks" | "special_tracks")` call site to
  `showPage("tracks")` — known sites: `TeacherAttendance.tsx` (~line 709,
  a comment-adjacent nav call) and `TeacherTrackDetail.tsx` (~lines 850,
  884, the back-navigation after creating/viewing a plan). The planning
  pass must grep for `showPage("specialtracks"`, `showPage("special_tracks"`,
  `showPage("halqat"`, and `showPage("myhalqa"` across the whole
  `quran-hifz/src` tree to catch any call site not already identified here,
  and must also grep for `myhalqa`/`halqat` in any sidebar/nav-menu
  configuration file (not enumerated in the Phase 1 research pass) so no
  dead nav link is left pointing at a deleted route.

## Testing

- Whatever automated test suite `quran-hifz` currently has must continue to
  pass (the planning pass should confirm what that is — this repo's other
  two sub-projects have `tsc --noEmit` and `jest`; assume at minimum a
  type-check gate applies here too unless the plan finds otherwise).
- Manual click-through against the live dev server + the real (already
  Phase-1-migrated) Atlas dev database, covering the golden paths: admin
  creates a masjid with a gender and a track under it; admin assigns a
  student to that track; teacher takes attendance and records group
  homework for the track via the (now single-kind) picker; teacher
  views/edits/creates a plan targeting the track; teacher and admin reports
  show the track-scoped and track-comparison views correctly. This mirrors
  Phase 1's live-verification approach (Phase 1's Task 14 and its
  final-review fix wave both live-verified against the real Atlas
  connection).

## Out of scope

- `quran-hifz-mobile` (Phase 3 — separate plan, after this one lands).
- Any new feature or UX behavior beyond removing the halqa/specialTrack
  duality (e.g., no auto-skip-picker-when-one-track, no new reporting
  views).
- The three pre-existing Phase-A bugs (`TeacherAttendance`'s "undefined"
  ward panel on no-individual-plan, `IndividualPlanPanel`'s missing
  per-segment-type support, `StudentPlanProgress.overflowPages` not being
  type-scoped) — these predate this restructure and are explicitly
  deferred, tracked separately.
