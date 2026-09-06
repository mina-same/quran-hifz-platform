# Halqa/Track Restructure — Phase 3 (Mobile) Research

**Scope:** `quran-hifz-mobile` (Expo/React Native, Expo Router file-based routing). Mirrors `docs/superpowers/specs/2026-09-04-halqa-track-phase2-web-research.md` in structure. Read alongside the master design (`2026-09-05-halqa-track-restructure-design.md`) and the approved web design (`2026-09-05-halqa-track-restructure-phase2-web-design.md`), which explicitly marks mobile out of scope for Phase 2 — this is that deferred work.

Grep for `halqa|Halqa|specialTrack|SpecialTrack|special_track` across `app/`, `lib/`, `components/` turns up **exactly 47 files** (verified twice, list stable). Every one is covered below. No `MASAJID`/`HALQAT` mock-data constants exist anywhere in the mobile app.

## Server contract this phase must consume (already shipped, Phases 1–2)

Same as web: `Halqa` deleted, `/api/halqat` gone. `SpecialTrack`→`Track`, gains required `masjid`, drops `location`/`enrolledStudents`. Routes `/api/special-tracks`→`/api/tracks`; new `GET /api/tracks/:id`, `POST /api/tracks/:id/assign` (transfer); enroll/unenroll and the list endpoint's `?student=` filter are gone. `Student.halqa`+`Student.masjid`→single required `Student.track`. `Attendance`/`Evaluation`/`Homework`/`GroupHomework`/`LessonRecording`→single required `track`. `QuranPlan.targetType`: `'halqa'|'students'|'specialTrack'`→`'track'|'students'`. Teacher stats `halqatCount`/`halqat`→`tracksCount`/`tracks`; global stats `totalHalqat`+`totalSpecialTracks`→`totalTracks`. Single-track-per-student is final — no cross-track membership, ever. Server confirms `GET /students?masjid=` still works (resolves via `Track.find({masjid})` then filters by `track` — no change needed to mobile's `StudentFilters.masjid?`).

---

## 1. API / query layer (`lib/queries/`)

**`halqat.ts`** (75 lines) — `Halqa` type + `useHalqat(s)`/`useHalqa`/`useCreateHalqa`/`useUpdateHalqa`/`useDeleteHalqa` hitting `/halqat`. **Delete outright.**

**`specialTracks.ts`** (82 lines) — `SpecialTrack` type has `location`/`enrolledStudents` (both server-dropped), no `masjid` (now required). `useSpecialTracks(status?, teacherId?, studentId?)` — the `studentId` param builds `?student=`, removed server-side. `useCreateTrack`/`useUpdateTrack`/`useDeleteTrack` already correctly named. `useEnrollStudent`/`useUnenrollStudent` → collapse to `useAssignStudent({id, studentId})` calling `POST /api/tracks/:id/assign`. **Rename file → `tracks.ts`.** Add new `useTrack(id)` single-fetch hook (`GET /api/tracks/:id`) for `student/schedule.tsx`.

**`quranPlan.ts`** (295 lines) — `PlanHalqa`/`PlanSpecialTrack` types; `targetType: 'halqa'|'students'|'specialTrack'`, fields `halqa?`/`specialTrack?`; `useQuranPlans(filters: {teacher?, halqa?, student?, specialTrack?})`. Becomes `targetType: 'track'|'students'`, single `track?` field/param. Segment/schedule machinery untouched.

**`attendance.ts`**, **`evaluations.ts`**, **`groupHomework.ts`**, **`homework.ts`**, **`lessonRecordings.ts`** — each has `halqa?`/`specialTrack?` on its record type and filters (plus `useRubric(ctx)` on evaluations). → single required `track`.

**`students.ts`** — `Student.halqa: {_id,name,time?,days?,specialTrack?}|string` (two-hop), `Student.masjid`, `StudentFilters.halqa?`/`specialTrack?`/`masjid?`. → single required `Student.track: {_id,name,...,masjid,teachers,daysPerWeek,timeSlot,...}|string`; `StudentFilters.track?`; `masjid?` stays (server-confirmed still supported).

**`teachers.ts`** — `Teacher.halqatCount?` → `tracksCount?`.

**`stats.ts`** — `DashboardStats.totalHalqat` → `totalTracks`.

**`parent.ts`** — `ParentChild.halqa` → `ParentChild.track`.

**`masajid.ts`** — `Masjid` type currently `{_id,name,location}`, no `gender`. Add required `gender: 'male'|'female'` (companion change, matches web).

## 2. Types — dead code (`lib/types/`)

**`halqa.ts`**, **`student.ts`**, **`teacher.ts`** — verified zero importers except each other. **Delete all three outright**, no migration needed.

**`lib/data/students.ts`** — mock arrays with hardcoded `halqa:` strings. Verified zero importers anywhere. **Delete.**

## 3. Domain components (`components/domain/`)

**`HalqaCard.tsx`** (125 lines) — renders a `Halqa`, shows `halqa.specialTrack` as an optional row. Consumers: `admin/halqat.tsx`, `admin/dashboard.tsx`. **Delete outright** — a track already carries everything this card shows.

**`ContextCard.tsx`** (198 lines) — mobile's mirror of web's `ContextPicker.tsx`. `TeachingContext{kind:'halqa'|'specialTrack'}`, `halqaToContext`/`trackToContext` mappers, badge/subtitle branch on `kind`, header background color swaps green-vs-brown by `kind`. Imported by 8 screens (`teacher/myhalqa.tsx`, `attendance.tsx`, `evaluate.tsx`, `grouphomework.tsx`, `recordlesson.tsx`, and others). Becomes: drop `kind` entirely, one `trackToContext` mapper (subtitle from `masjid` name, `studentCount` from students-by-track), single badge/subtitle label, **single fixed header color** (no more kind-based branch — confirmed decision, see design doc). No auto-skip.

**`TrackDetail.tsx`** (479 lines) — shared by `admin/track-detail.tsx` + `teacher/track-detail.tsx` via `role` prop. Currently imports `useHalqat`, computes `halqaIdsInTrack`, then `useStudents({halqa: ...})`, merges with `track.enrolledStudents`. Plan-linking reads/writes `plan.specialTrack`. Becomes: delete `useHalqat` import + `halqaIdsInTrack` derivation entirely — roster is direct `useStudents({track: track._id})`. Plan-link payload renames `specialTrack`→`track`. `EvaluationRoster`'s context prop simplifies once `RosterContext` drops `kind`.

**`MasjidAccordion.tsx`** (177 lines) — mobile-only, no web equivalent. Props: `masjid`, `halqat: Halqa[]` (caller-resolved). Since server's `getMasajid` already sends `m.tracks` pre-populated, this becomes: accept `masjid.tracks` directly (no separate query), same row fields renamed halqa→track. **Minimal fix, no redesign** (confirmed decision).

**`IndividualPlanPanel.tsx`** — comment-only hit (`/** The shared halqa/track plan... */`). Update comment to say "track plan." No code change.

**`EvaluationRoster.tsx`** (643 lines) — `RosterContext = {kind:'halqa'|'specialTrack', id}`, `contextFilter` branches on `kind`. Consumers: `TrackDetail.tsx`, `teacher/attendance.tsx`. Becomes: `RosterContext = {id: string}` (drop `kind`), `contextFilter = {track: context.id}` unconditionally.

**`ReportsScreen.tsx`** (550 lines) — mobile's mirror of web's `ReportsDashboard.tsx`, shared by `admin/reports.tsx`/`teacher/reports.tsx`. Props `halqat: Halqa[]` + `tracks: SpecialTrack[]`; `scope` state `""|"halqa:<id>"|"track:<id>"`; halqa-comparison leaderboard (`halqaEvalStats`) with no track equivalent. Becomes: drop `halqat` prop, `scope` simplifies to `""|"track:<id>"`, leaderboard becomes track-comparison grouped by `e.track`/`s.track`. CSV export column "الحلقة"→"المسار".

**`StudentReportPanel.tsx`** (338 lines) — `aggregateFilter: {halqa?; specialTrack?}` → `{track?}`. Pass-through type only, no internal logic.

**`DaySlider.tsx`** — confirmed **no halqa/specialTrack reference at all**. No-op, no change needed.

## 4. UI components (`components/ui/`)

**`ScopeTabs.tsx`** (129 lines) — `ScopeOption.kind?: 'all'|'halqa'|'track'` drives icon (`IconSchool` vs `IconRoute` vs `IconUsers`). Consumers: `ReportsScreen.tsx`, `teacher/students.tsx`. Becomes: drop `'halqa'` from the union, `IconSchool` import becomes dead.

## 5. Constants (`lib/constants/`)

**`masarMap.ts`** — `MasarInfo.halqa: string`, free-text "الحلقة المقترحة" display copy at student registration, never sent to server. Consumer: `admin/register.tsx`. **Reword to "المسار المقترح"** (confirmed decision — mechanical copy update, not dropped).

**`portals.ts`** (362 lines) — mobile's functional equivalent of web's `pageRegistry.ts`. `PORTALS` nav config, `id` fields are load-bearing route names (consumed by `MoreSheet.tsx`'s `router.push`). Teacher nav has `myhalqa`(visible)+`special_tracks`(more-sheet); admin has `halqat`(visible)+`special_tracks`(more-sheet); student has `special_tracks`(more-sheet). Becomes: remove `myhalqa`/`halqat` entries+groups; rename `special_tracks`→`tracks`, relabel to singular "مساري"/"مساراتي" as appropriate; **the renamed tracks entry is promoted into each portal's now-vacant visible-tab slot** (confirmed decision, see design doc §Tab bar). Mock role-display strings referencing "حلقة عمر بن الخطاب" are cosmetic placeholder copy, update in the same pass.

## 6. Routing (Expo Router `_layout.tsx` files)

**`app/(portal)/admin/_layout.tsx`** — `Tabs.Screen name="halqat"` (visible), `name="special_tracks"`/`"track-detail"` (more-sheet only). `MORE_IDS` includes `'special_tracks'`.

**`app/(portal)/teacher/_layout.tsx`** — `Tabs.Screen name="myhalqa"` (visible, `title:'حلقاتي'`), `name="special_tracks"`/`"track-detail"` (more-sheet). `MORE_IDS` includes `'special_tracks'`.

**`app/(portal)/student/_layout.tsx`** — `Tabs.Screen name="special_tracks"` (more-sheet only, `title:'المسارات'`).

**`app/index.tsx`** — login screen; `getHalqaName(h)` helper shown as child-selector subtitle. Becomes `getTrackName`/`child.track`.

Becomes:
- **Delete** `admin/halqat.tsx`, `admin/halqa-form.tsx`, `teacher/myhalqa.tsx` outright. Remove their `Tabs.Screen` lines and `PORTALS` nav entries.
- **Rename** `special_tracks.tsx`→`tracks.tsx` (all three portals). Update every `Tabs.Screen name="special_tracks"`→`"tracks"`, every `MORE_IDS` entry, every `PORTALS` id, every `router.push(...special_tracks...)` call site.
- **Promote** the renamed `tracks` screen into admin's and teacher's now-vacant visible-tab slot (was `halqat`/`myhalqa` respectively) — confirmed decision.
- Component renames `AdminSpecialTracks`→`AdminTracks`, `TeacherSpecialTracks`→`TeacherTracks`, `StudentSpecialTracks`→`StudentTracks`.
- The planning pass must grep the whole tree for `special_tracks`/`halqat`/`myhalqa` string literals (route names, `PORTALS` ids, `router.push` calls) since there's no single central registry file to anchor the search, unlike web's `pageRegistry.ts`.

## 7. Admin screens

**`admin/halqat.tsx`** (105 lines), **`admin/halqa-form.tsx`** (119 lines) — full halqa CRUD, fully subsumed by track CRUD. **Delete both outright.**

**`admin/masajid.tsx`** (116 lines) + **`MasjidAccordion.tsx`** — currently resolves nested list via separate `useHalqat()` filtered client-side. Becomes: drop the separate fetch, pass `masjid.tracks` (server-populated) straight to the accordion. Add `gender` field to `masjid-form.tsx`.

**`admin/register.tsx`** (263 lines) — `useHalqat()` populates a "الحلقة" select, both `masjid`/`halqa` required and submitted separately; `masar.halqa` suggested-name display. Becomes: **single "المسار" `FormSelect` sourced from `useTracks()`**, submitted as `body.track`; separate `masjid` field/selection step drops entirely (confirmed decision, see design doc §Registration picker).

**`admin/students.tsx`** (263 lines) — `trackLabel(s)` reads `s.halqa.specialTrack.title` (two-hop), separate "الحلقة"/"المسجد" chips. Becomes: direct `s.track.title` (one hop), single "المسار" chip.

**`admin/student-form.tsx`** (213 lines) — separate `halqa`/`masjid` selects, options from independent `useHalqat()`/`useMasajid()`. Becomes: single "المسار" select from `useTracks()`, submitted as `{track}`.

**`admin/teachers.tsx`** (128 lines) — `{t.halqatCount ?? 0}` chip → `{t.tracksCount ?? 0}`.

**`admin/dashboard.tsx`** (191 lines) — `stats.data.totalHalqat` tile, `useHalqat()` mini-list via `HalqaCard`, two-hop `trackLabel(s)`. Becomes: `totalTracks` tile; drop the `HalqaCard` mini-list (no replacement — matches "no new features"); `trackLabel` simplifies to one-hop `s.track.title`.

**`admin/special_tracks.tsx`** (903 lines) — largest single file in the mobile app. Full CRUD form (no real `masjid` FK today — location is free text or a masjid-name string), enroll/unenroll student-management panel. Becomes: drop `location`/`enrolledStudents`, add required `masjid` FK select from `useMasajid()`, replace enroll/unenroll UI with single "نقل الطالب" transfer action via `useAssignStudent`. Plan as its own task, same as web treated `AdminSpecialTracks.tsx`.

**`admin/reports.tsx`** — thin wrapper passing `{halqat, tracks, kpis, teachers}` into `ReportsScreen`. Drop `halqat` prop + `useHalqat()` import.

**`admin/track-detail.tsx`** — thin wrapper, no direct halqa code itself (only via `TrackDetail` import). No change needed.

## 8. Teacher screens

**`teacher/myhalqa.tsx`** (153 lines) — teacher's halqat+tracks list. **Delete outright** — superseded by `TeacherTracks` + `TrackDetail`.

**`teacher/dashboard.tsx`** — `useHalqat({teacher})` stat+card list. Becomes `useTracks({teacher})`.

**`teacher/students.tsx`** (178 lines) — `filter` state `"all"|"halqa:<id>"|"track:<id>"`; `studentTracks` map built by walking both `myTracks[].enrolledStudents` and `halqat[].specialTrack`. Becomes: drop `"halqa:<id>"` variant + `useHalqat` import; roster is `useStudents({track: trackIds.join(',')})` directly.

**`teacher/attendance.tsx`** (336 lines) — mobile's mirror of web's `TeacherAttendance.tsx`, heaviest concentration of `kind==='halqa'` ternaries (`contextFilter`, `linkedPlan` match, View-1 dual-list rendering). Becomes: single `useTracks({teacher})` list, `contextFilter = {track: selected.id}`, `plan.targetType === 'track'` unconditionally.

**`teacher/evaluate.tsx`** (312 lines) — identical dual-kind pattern, own separate screen (mobile-specific — web folds evaluation into `TeacherAttendance`). Same collapse.

**`teacher/grouphomework.tsx`** (194 lines) — same dual-kind context picker + mutation payload ternary. Same collapse.

**`teacher/homework.tsx`** (95 lines) — read-only list, per-row `h.specialTrack ? "مسار:..." : getName(h.halqa)`. Becomes: single `h.track` read, always "المسار: {getName(h.track)}".

**`teacher/recordlesson.tsx`** (240 lines) — same dual-kind context picker for choosing which class to record for. Same collapse.

**`teacher/plans.tsx`** (273 lines) — `targetLabel(plan)` three-way branch (`halqa`/`specialTrack`/`students`). Becomes two-way (`track`/`students`).

**`teacher/plan-form.tsx`** (789 lines) — mobile-specific: **no `targetType` picker in the UI at all** — always hardcodes `targetType:'halqa'` on submit; the only way a plan gets a different target is via a read-only `lockedTarget` display when editing a plan whose `existingPlan.targetType !== 'halqa'`. Form field literally `form.halqa`, sourced from `useHalqat({teacher})`. Becomes: field renames to `form.track`, sourced from `useTracks({teacher})`; **`lockedTarget` narrows to only the `students`-targeted case** (confirmed — once `targetType` is only `'track'|'students'`, editing a track-targeted plan is no longer special-cased). Validation message, handoff param `halqaId`→`trackId`, teacher-fallback lookup all rename accordingly.

**`teacher/plan-detail.tsx`** (247 lines) — `targetLabel(plan)` three-way branch, identical to `plans.tsx`. Same two-way collapse.

**`teacher/reports.tsx`** — thin wrapper, `useHalqat({teacher})` for `baseFilter={halqa: ...||'__none__'}`. Becomes `useTracks({teacher})`, `baseFilter={track: ...}`.

**`teacher/special_tracks.tsx`** (167 lines) — track list, `enrolledStudents.length`/`maxStudents` capacity. Rename file→`tracks.tsx`; `enrolledStudents.length` needs a server-computed students-by-track count instead.

**`teacher/track-detail.tsx`** — thin wrapper, no change needed to this file itself.

## 9. Student screens

**`student/dashboard.tsx`** — `getName(student.halqa)`/`getName(student.masjid)` as two separate rows; `halqaObj.days`/`.time`. Becomes: `getName(student.track)`, schedule fields from `student.track.daysPerWeek`/`.timeSlot`.

**`student/homework.tsx`** — `today.specialTrack ? "مسار:..." : 'الحلقة'`. Becomes: always `"مسار: {getTitle(today.track)}"`.

**`student/schedule.tsx`** (257 lines) — mobile-specific, no obvious web equivalent. Currently `useHalqa(halqaId)`, renders "تفاصيل الحلقة" card + weekly grid on `halqa.days`. Becomes `useTrack(trackId)` (new hook, see §1), reading `track.daysPerWeek`/`.timeSlot`/`.teachers`/`.masjid`.

**`student/special_tracks.tsx`** (229 lines) — plural "my tracks" list calling `useSpecialTracks(undefined, undefined, profileId)` (the removed `?student=` filter). Since single-track-per-student is final, this screen's plural premise no longer matches the data model. **Resolved by precedent**: web's already-shipped `StudentTracks.tsx` (`quran-hifz/src/quran/pages/student/StudentTracks.tsx`) kept the exact same list UI/section-headers/empty-state, just fetches `useTracks()` and filters to the one track matching `student.track` (renders 0 or 1 cards), retitled "مساري". **Mirror this exactly** — rename file→`tracks.tsx`, same filter-to-own-track approach, no structural rewrite.

**`student/myhifz.tsx`** — confirmed no halqa/track reference. No change needed.

## 10. Parent screens

**`parent/dashboard.tsx`** — `child.halqa` shown as "الحلقة" row. Becomes `child.track`.

**`app/index.tsx`** (login/child-selector) — `getHalqaName(h)` under child name in child-picker modal. Becomes `getTrackName(child.track)`.

---

## Design questions — resolved (user-confirmed 2026-09-06)

1. **`student/special_tracks.tsx`'s fate** — mirror the confirmed web precedent (`StudentTracks.tsx`): same list UI, filtered to the student's own single track, retitled "مساري". Not re-decided independently.
2. **Vacated visible tab-bar slots** — the renamed `tracks` screen is promoted into admin's and teacher's now-empty visible-tab slot in place of `halqat`/`myhalqa`, in both `_layout.tsx` files.
3. **`admin/register.tsx`'s masjid+halqa two-step picker** — becomes a single track picker (masjid shown as part of the track's info, not separately selected), matching how `AdminStudents`'s per-student track editor already works.
4. **`MasjidAccordion.tsx`'s inner-row content** — minimal fix only: accept `masjid.tracks` directly, rename fields, no redesign (per "no new features").
5. **`masarMap.ts`'s `halqa` suggested-name copy** — reword to "المسار المقترح" (mechanical copy change, not dropped).
6. **`ContextCard.tsx`'s header-color-by-kind treatment** — settles on a single fixed color once there's only one kind; no repurposing for status.
7. **`StudentFilters.masjid?`** — confirmed still supported server-side (`Track.find({masjid})` resolve), no change needed.
