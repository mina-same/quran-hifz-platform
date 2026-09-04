# Same-day حفظ + مراجعة segments — design

Date: 2026-09-04
Status: approved (chat), pending spec review

## Problem

A `QuranPlan` currently splits into up to two `IPlanSegment`s (one per
`PlanType`: `حفظ` | `مراجعة`), each with its own weekdays and mushaf range.
`validateSegmentDays` (quranRange.ts) enforces that the weekdays are
**partitioned** across segments — no calendar date belongs to more than one
segment/type. This was deliberate: it keeps a day's ward, its attendance
record, its evaluation and its reflow all single-valued.

The user wants to lift that restriction: a teacher should be able to put
حفظ and مراجعة on the *same* weekdays, so a student does a memorization
portion and a review portion on the same day, each tracked with its own
"الورد الفعلي" (actual completion) / "الورد المقرر" (assigned ward) /
progress — while attendance and the daily grade stay single per day.

## Confirmed decisions

1. **Attendance stays one-per-day.** A single حاضر/غائب covers the whole
   day regardless of how many segments are active on it. No change to
   `Attendance.model.ts` or `attendance.controller.ts`.
2. **Evaluation stays one-per-day, combined.** The rubric score (حفظ 4 +
   تجويد 2 + تلاوة 1, or whatever the plan's `gradeRubric` is) is a single
   entry for the day, not split per type. No change to `Evaluation.model.ts`
   or `evaluation.controller.ts`.
3. **`activeDaysCount` keeps meaning distinct calendar days.** When a date
   matches two segments, it still consumes one unit of the plan's shared
   day budget, but *both* segments earn an occurrence on it. This is a
   no-op generalization for non-overlapping plans (today's exact behavior).
4. Only the **ward/occurrence tracking** (what was assigned, what the
   student actually reached, per-type progress) needs to become
   type-plural on a shared day. It already is, structurally —
   `IStudentOccurrence.type` and the `record` endpoint's `type` param
   already exist for this because a plan can have two segments today (they
   just never landed on the same date).

## Non-goals

- No schema change to `IPlanSegment`, `IStudentOccurrence`, `Attendance`,
  or `Evaluation` — the `type` field already exists everywhere it's needed.
- No change to how reflow computes redistribution (`studentPlanReflow.ts`
  already scopes every walk to one `type` via `occurrencesOfType`).
- No change to the `record` occurrence API contract — it already accepts
  an optional `type`, required whenever more than one type exists on the
  student's overlay.

## Design

### 1. Relax the day-partition rule

`validateSegmentDays(segments)` in `quranRange.ts` — remove the "day X is
already assigned to type Y" rejection. Keep:
- at least one segment,
- each type appears at most once across segments,
- each segment has at least one day.

Duplicated in three places, same edit in all three:
- `quran-hifz-server/src/lib/quranRange.ts`
- `quran-hifz/src/quran/lib/quranRange.ts`
- `quran-hifz-mobile/lib/quranRange.ts`

### 2. `segmentOccurrenceCounts` — shared-day budget, per-segment counts

In the `endType: 'activeDays'` branch, the walk currently does
`plan.segments.find(s => s.days.includes(label))` (singular) to attribute
a matching day to one segment and increment a single `seen` counter.
Change to: for a qualifying (non-holiday) day, find **every** segment
whose `days` includes that weekday, increment each of their own counters,
and increment `seen` once for the day (not once per segment) — so the
walk still stops after `activeDaysCount` distinct calendar days, and a
shared day funds an occurrence in both segments simultaneously.

For `endType: 'date'`, no change — `countMatchingDays` is already called
independently per segment.

Same file locations as §1.

### 3. `computeMultiTodayAssignment` → plural

Rename/change return shape from a single nullable
`(TodayAssignment & {type}) | null` to an array
`(TodayAssignment & {type})[]` (0–2 entries: `segmentForDate` similarly
becomes `segmentsForDate` returning an array instead of one-or-null).
`computeMultiScheduleBreakdown` needs **no change** — it already merges
independently-computed per-segment breakdowns and multiple same-date
entries already sort correctly (add `type` as a stable tiebreaker in the
sort comparator for determinism when dates tie).

### 4. Server: `withPlanComputed` (quran-plan.controller.ts)

- `segments[].todayAssignment/progress/juzProgress/schedule` — **no
  change**, each is already computed independently per segment and is
  already correct for an overlapping day.
- Top-level rollups: add `todayAssignments: (TodayAssignment & {type})[]`
  (all segments due today, 0–2 items). Keep the existing singular
  `todayAssignment`/`type` rollups **as deprecated best-effort fields**
  (first due segment) so any screen not yet migrated still renders
  something sane instead of breaking, but every screen this project
  touches below reads `todayAssignments` (or per-segment data) instead.
  Update the stale "days are partitioned, so at most one segment can be
  due today" comment.

### 5. Server: student-plan-progress — no functional change

`recordOccurrenceSchema`/`recordOccurrence` (student-plan-progress.controller.ts)
already require an explicit `type` whenever the student's overlay has more
than one type present, and `initStudentOccurrences` already builds one
occurrence array entry per (segment, date) independently — this already
produces two occurrences on the same date once §1 allows it. No backend
change needed here; only verify (via a manual/integration check) that two
occurrences sharing a date behave correctly end-to-end once created.

### 6. Web: plan builder (`TeacherPlanForm.tsx`)

Currently each segment's day-multiselect calls
`disabledDays={WEEK_DAYS.filter(d => { const owner = dayOwner.get(d); return !!owner && owner !== seg.type; })}`,
built from a `dayOwner` map (`quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx:216-234,403-419`).
Remove the disabling — every day is selectable by both segments. Update
the surrounding comment block ("day already taken by another type is
disabled and names its owner"). The live schedule preview at the bottom of
the form must show both types' rows for a shared date (it already renders
from `computeScheduleBreakdown`-shaped data per segment — verify it
doesn't assume one row per date).

Mirror in mobile plan-form: `quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx`.

### 7. Web: "today's ward" banners → loop over `todayAssignments`

Screens currently reading the singular `plan.todayAssignment`:
- `TeacherPlans.tsx` (PlanCard's today-assignment line)
- `TeacherPlanDetail.tsx`
- `TeacherSpecialTracks.tsx` / `StudentSpecialTracks.tsx` / `AdminSpecialTracks.tsx` (linked-plan widget)
- `TeacherAttendance.tsx`'s `.assignment-banner` (line ~726)
- `TeacherTrackDetail.tsx`'s equivalent banner
- `TeacherStudentPlanDetail.tsx`

Each renders one `.assignment-banner`-style block; on a dual-type day it
renders one block per entry in `todayAssignments`, each labeled with its
`type`. Reverse-direction display orientation (`orientSlice`/
`isReversedRange`) is unaffected — applied per assignment as today.

### 8. Web: attendance/completion recording UI

`TeacherAttendance.tsx` and `TeacherTrackDetail.tsx` (near-identical
blocks, per existing convention — same edit in both) currently render, per
student per day: one حاضر/غائب toggle, one score-entry panel, and one
"وصل إلى" actual-completion `CompactSurahAyah` picker tied to one
`occurrenceIndex`.

Change: when the day's roster has occurrences of both types (look them up
by date from the student's `effectiveSchedule`/plan schedule), render
**two** "وصل إلى" pickers, one per type, each bounded (`bounds` prop, see
bug-319) to its own type's day slice and calling `recordOccurrence` with
its own `type` + `occurrenceIndex`. حاضر/غائب and the score panel stay
singular per the confirmed decisions (§ Confirmed decisions #1–2). Marking
غائب triggers a `record` call with `status: 'absent'` for **each** type
present that day (two calls when two types are present), so both segments'
reflow fires independently.

### 9. Web: schedule list/table displays

`TeacherPlanDetail.tsx`'s schedule modal, `IndividualPlanPanel.tsx`
(base/current columns), and any other table rendering
`computeScheduleBreakdown`/`schedule[]` rows already carry `type` per
entry (`SegmentScheduleEntry`) — add a visible type badge/column so two
rows sharing a date read as "both happen today" rather than a rendering
bug. Row ordering: keep date-ascending, break ties by type (حفظ before
مراجعة, matching `PLAN_TYPES` order) for a stable display.

### 10. Mobile — mirror of §6–9

- `quran-hifz-mobile/lib/quranRange.ts` — §1–3 mirrored.
- `app/(portal)/teacher/plan-form.tsx` — §6 mirrored.
- `app/(portal)/teacher/attendance.tsx` — §8 mirrored (this is the one
  screen with real record-writing logic on mobile; per existing cerebrum
  note `TeacherTrackDetail.tsx` has **no** mobile counterpart for
  attendance/completion, so mobile changes are confined to this file).
- `app/(portal)/teacher/plans.tsx`, `plan-detail.tsx` — §7 mirrored.
- `components/domain/DaySlider.tsx`'s `useDaySchedule` hook builds
  `assignmentByDate: Map<string, Assignment>` (singular) — becomes
  `Map<string, Assignment[]>`; both call sites (`attendance.tsx`,
  `TrackDetail.tsx`) updated for the array shape.
- `components/domain/ScheduleSheet.tsx` / `scheduleItems()` — §9 mirrored
  (type badge per card; already iterates a flat list of entries so a
  same-date pair of cards should already render side by side once the
  upstream data includes both — verify no per-date dedupe exists).
- `components/domain/IndividualPlanPanel.tsx` — §9 mirrored.
- `components/domain/TrackDetail.tsx` — §7 mirrored (read-only, no
  recording logic — per existing scope cut).

### 11. Validation/error copy

`validateSegmentDays`'s Arabic error message for the removed rule
("يوم {day} مُسنَد لـ... — اليوم الواحد لنوع واحد فقط") is deleted along
with the check. No new validation message needed — allowing the overlap
requires no new rejection.

## Testing

- `quran-hifz-mobile/lib/quranRange.test.ts` (only existing test file
  touching this logic) — add cases: two segments sharing all weekdays,
  two segments sharing a subset, `segmentOccurrenceCounts` under
  `activeDays` with full overlap (each segment should get the same count
  as the shared day count) and partial overlap.
- Manual verification via the dev server (per existing session
  convention, `run`/Playwright): create a plan with حفظ + مراجعة on the
  same 3 weekdays, generate schedule, confirm both segments show correct
  independent schedules; record one type's occurrence absent and confirm
  only that type's reflow fires (the other type's occurrence for the same
  date is untouched).

## Open risk

This touches three independently-maintained copies of `quranRange.ts` and
several near-duplicated UI blocks (`TeacherAttendance.tsx` /
`TeacherTrackDetail.tsx`, and the mobile equivalents) — the existing
project convention for all of these. No shared package exists to remove
that duplication as part of this change; each copy is edited in lock-step
as today.
