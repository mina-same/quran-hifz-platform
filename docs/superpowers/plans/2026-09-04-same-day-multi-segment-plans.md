# Same-day حفظ + مراجعة Plan Segments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher put حفظ (memorization) and مراجعة (review) segments on the *same* weekdays within one `QuranPlan`, so a student can have both a memorization ward and a review ward due the same day — each with its own assigned range, its own "وصل إلى" (actual completion) tracking, and its own reflow — while attendance and the daily grade stay a single record per day.

**Architecture:** The scheduling math (`quranRange.ts`, duplicated in three copies with no shared package — server/web/mobile) already models each segment independently by `type`; the only real blocker is `validateSegmentDays` rejecting two segments claiming the same weekday, plus every UI/controller spot that assumes "at most one segment is due on a given date" and collapses to a single value instead of an array. This plan removes the day-partition rule, makes the shared-day occurrence budget correct, and then threads "possibly two, not one" through the read paths (today's-ward banners, schedule tables) and the one write path that needs it (the teacher's per-student actual-completion recording UI). Reflow, attendance, and evaluation already only see one `type` at a time or are intentionally type-agnostic — neither needs new code.

**Tech Stack:** Node/Express/Mongoose (`quran-hifz-server`), React + TanStack Query + Vite (`quran-hifz` web), Expo/React Native (`quran-hifz-mobile`), Jest (mobile only — the only test runner in this repo).

**Spec:** `docs/superpowers/specs/2026-09-04-same-day-multi-segment-plans-design.md`

## Global Constraints

- `quranRange.ts` exists as three independently-maintained, logic-identical copies (`quran-hifz-server/src/lib/quranRange.ts`, `quran-hifz/src/quran/lib/quranRange.ts`, `quran-hifz-mobile/lib/quranRange.ts`) — no shared package. Every logic change to a function that exists in more than one copy must be applied to all copies that have it, in lock-step, verbatim except for import paths.
- Attendance (`حاضر`/`غائب`) stays exactly one record per student per day, regardless of how many segment types are active that day. Do not add a `type` field to `Attendance.model.ts`, `attendance.controller.ts`, or the evaluation/grading pipeline (`Evaluation.model.ts`, `evaluation.controller.ts`, `useBulkEvaluate`, `useEvaluations`).
- The daily grade (rubric score) stays exactly one combined record per student per day. Do not split it per type.
- No schema changes to `IPlanSegment`, `IStudentOccurrence`, `Attendance`, or `Evaluation` — the `type` field already exists everywhere the ward/occurrence layer needs it.
- All new/changed Arabic user-facing copy must be Modern Standard Arabic (Fusha), matching the existing convention (see `.wolf/cerebrum.md`'s 2026-07-03 entry).
- `TeacherAttendance.tsx` and `TeacherTrackDetail.tsx` (web) carry a near-duplicated attendance/completion block; the mobile counterpart is `EvaluationRoster.tsx` (used by `attendance.tsx`) — mobile's `TrackDetail.tsx` is read-only and has no recording logic (existing, deliberate scope cut — do not add any).

## Verified — no change needed

Research during planning confirmed these spec-mentioned files are already correct and need no edits, so no task touches them:
- `quran-hifz-mobile/components/domain/ScheduleSheet.tsx` — `scheduleItems()` already carries `type` per item and already renders a gold `Badge` for it.
- `quran-hifz/src/quran/components/common/IndividualPlanPanel.tsx` and `quran-hifz-mobile/components/domain/IndividualPlanPanel.tsx` — each panel instance is already scoped to one `type` via its own `type`/`segType` prop, so its rows have no type ambiguity to resolve.
- `quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx`'s day-picker pattern was confirmed to exactly mirror the web version (Task 7 below still edits it — this note only means no *extra* investigation is needed there beyond Task 7).

---

## Task 1: Mobile `quranRange.ts` — relax day-partition, fix occurrence-count split, pluralize `segmentForDate`

**Files:**
- Modify: `quran-hifz-mobile/lib/quranRange.ts:421-460` (`segmentOccurrenceCounts`), `:496-509` (`segmentForDate`), `:509-527` (`validateSegmentDays`)
- Test: `quran-hifz-mobile/lib/quranRange.test.ts:405-550`

**Interfaces:**
- Consumes: existing `PlanSegmentInput`, `MultiPlanInput`, `PlanType` types (unchanged) from the same file.
- Produces: `validateSegmentDays(segments: PlanSegmentInput[]): string | null` (unchanged signature, relaxed rule) — consumed by Task 2 (web mirror), Task 3 (server mirror), Task 6/7 (plan-form UI). `segmentOccurrenceCounts(plan: MultiPlanInput): Map<PlanType, number>` (unchanged signature, corrected walk) — consumed by Task 3. `segmentsForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput[]` (**renamed from `segmentForDate`, now returns an array**) — consumed by Task 3 (server mirror only; no other caller in this repo per grep).

- [ ] **Step 1: Write the failing tests**

In `quran-hifz-mobile/lib/quranRange.test.ts`, replace the `it('rejects two types claiming the same weekday', ...)` test inside `describe('validateSegmentDays', ...)` (lines 444-450) with:

```ts
  it('accepts two types sharing a weekday', () => {
    const shared: PlanSegmentInput = { ...MURAJAA, days: ['الخميس', 'السبت'] };
    expect(validateSegmentDays([HIFZ, shared])).toBeNull();
  });
```

Add two new tests inside `describe('segmentOccurrenceCounts', ...)` (after the existing `it('skips holidays when splitting the budget', ...)` block, before its closing `});` at line 484):

```ts

  it('funds every matching segment on a shared day while spending only one unit of the shared budget', () => {
    const overlap: PlanSegmentInput = { ...MURAJAA, days: ['السبت', 'الخميس'] }; // مراجعة also runs on Saturday now
    const counts = segmentOccurrenceCounts({
      startDate: START, endType: 'activeDays', activeDaysCount: 5,
      segments: [HIFZ, overlap], // حفظ: Sat/Mon/Wed
    });
    // Distinct qualifying days consumed: Sat 8/1 (both), Mon 8/3 (حفظ), Wed 8/5 (حفظ),
    // Thu 8/6 (مراجعة), Sat 8/8 (both) = 5 days, but حفظ earns 4 occurrences and
    // مراجعة earns 3 — they are not required to match.
    expect(counts.get('حفظ')).toBe(4);
    expect(counts.get('مراجعة')).toBe(3);
  });

  it('gives fully-overlapping segments identical counts', () => {
    const hifzSat: PlanSegmentInput = { ...HIFZ, days: ['السبت'] };
    const murajaaSat: PlanSegmentInput = { ...MURAJAA, days: ['السبت'] };
    const counts = segmentOccurrenceCounts({
      startDate: START, endType: 'activeDays', activeDaysCount: 4,
      segments: [hifzSat, murajaaSat],
    });
    expect(counts.get('حفظ')).toBe(4);
    expect(counts.get('مراجعة')).toBe(4);
  });
```

Replace the whole `describe('computeMultiScheduleBreakdown', ...)` block's contents by adding one more `it` right before its closing `});` (after the existing `it('never puts two types on the same date', ...)` block, around line 528):

```ts

  it('produces a row per segment on a date they both run, on the same calendar dates', () => {
    const hifzThursday: PlanSegmentInput = { ...HIFZ, days: ['الخميس'] };
    const murajaaThursday: PlanSegmentInput = { ...MURAJAA, days: ['الخميس'] };
    const rows = computeMultiScheduleBreakdown({
      startDate: START, endType: 'date' as const, endDate: new Date(2026, 7, 28),
      segments: [hifzThursday, murajaaThursday],
    });
    const hifzDates = rows.filter((r) => r.type === 'حفظ').map((r) => r.date.slice(0, 10)).sort();
    const murajaaDates = rows.filter((r) => r.type === 'مراجعة').map((r) => r.date.slice(0, 10)).sort();
    expect(hifzDates).toHaveLength(4);
    expect(hifzDates).toEqual(murajaaDates);
  });
```

Replace the entire `describe('segmentForDate', ...)` block (lines 531-550) with:

```ts
describe('segmentsForDate', () => {
  const plan = {
    startDate: START, endType: 'date' as const, endDate: new Date(2026, 7, 28),
    holidays: ['2026-08-03'],
    segments: [HIFZ, MURAJAA],
  };

  it('resolves a date to every segment that owns it', () => {
    expect(segmentsForDate(plan, new Date(2026, 7, 1)).map((s) => s.type)).toEqual(['حفظ']);     // Saturday
    expect(segmentsForDate(plan, new Date(2026, 7, 6)).map((s) => s.type)).toEqual(['مراجعة']);  // Thursday
  });

  it('resolves a shared weekday to both segments', () => {
    const overlap = { ...plan, segments: [HIFZ, { ...MURAJAA, days: ['السبت'] }] };
    expect(segmentsForDate(overlap, new Date(2026, 7, 1)).map((s) => s.type).sort())
      .toEqual(['حفظ', 'مراجعة'].sort());
  });

  it('returns empty on an off day', () => {
    expect(segmentsForDate(plan, new Date(2026, 7, 7))).toEqual([]); // Friday
  });

  it('returns empty on a holiday even when the weekday matches', () => {
    expect(segmentsForDate(plan, new Date(2026, 7, 3))).toEqual([]); // Monday, holiday
  });
});
```

Update the import at line 409 from `segmentForDate` to `segmentsForDate`:
```ts
import {
  validateSegmentDays, segmentOccurrenceCounts, computeMultiScheduleBreakdown,
  segmentsForDate, unionDays, type PlanSegmentInput,
} from './quranRange';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd quran-hifz-mobile && npx jest lib/quranRange.test.ts`
Expected: FAIL — `segmentsForDate is not a function` (not yet exported under that name), plus assertion failures on the new/changed `validateSegmentDays`/`segmentOccurrenceCounts` tests against the current implementation.

- [ ] **Step 3: Implement the logic changes in `quran-hifz-mobile/lib/quranRange.ts`**

Replace the `segmentOccurrenceCounts` function (lines 421-460) with:

```ts
export function segmentOccurrenceCounts(plan: MultiPlanInput): Map<PlanType, number> {
  const counts = new Map<PlanType, number>();
  for (const seg of plan.segments) counts.set(seg.type, 0);

  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;

  if (plan.endType === 'date') {
    for (const seg of plan.segments) {
      counts.set(seg.type, countMatchingDays(plan.startDate, plan.endDate!, seg.days, holidays));
    }
    return counts;
  }

  const target = plan.activeDaysCount ?? 0;
  const cursor = dateOnly(plan.startDate);
  let seen = 0;
  let walked = 0;
  while (seen < target && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (!holidays.has(dateKey(cursor))) {
      const label = dayLabel(cursor);
      // A day can now fund more than one segment (حفظ + مراجعة sharing a
      // weekday) — every matching segment gets an occurrence, but the day
      // still consumes only one unit of the shared calendar-day budget.
      const matching = plan.segments.filter((s) => s.days.includes(label));
      if (matching.length > 0) {
        for (const seg of matching) counts.set(seg.type, (counts.get(seg.type) ?? 0) + 1);
        seen++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    walked++;
  }
  return counts;
}
```

Replace `segmentForDate` (lines 496-501, the exact body may sit a few lines earlier/later — locate it by its `export function segmentForDate` signature) with:

```ts
/** Every segment that owns a given date — a date can now belong to more than
 * one segment (حفظ + مراجعة sharing a weekday), so this returns an array,
 * not a single winner. Empty on an off day/holiday. */
export function segmentsForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput[] {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return [];
  const label = dayLabel(day);
  return plan.segments.filter((s) => s.days.includes(label));
}
```

Replace `validateSegmentDays` (lines 509-527) with:

```ts
/**
 * Rejects a segment set where a segment has no days, or a type appears
 * twice. Returns an Arabic message, or null when the set is valid. Shared
 * by the API and both clients' forms. Two different types MAY claim the
 * same weekday — that is exactly what lets a plan run حفظ and مراجعة on the
 * same day; each still tracks its own ward/occurrence independently.
 */
export function validateSegmentDays(segments: PlanSegmentInput[]): string | null {
  if (segments.length === 0) return 'يجب اختيار نوع واحد على الأقل';

  const seenTypes = new Set<PlanType>();
  for (const seg of segments) {
    if (seenTypes.has(seg.type)) return `النوع "${seg.type}" مكرر — كل نوع مرة واحدة فقط`;
    seenTypes.add(seg.type);

    if (seg.days.length === 0) return `اختر أيام "${seg.type}"`;
  }
  return null;
}
```

Also update the block comment above the multi-segment section (search for `The weekdays are PARTITIONED` near the top of the "Multi-segment plans" section) — replace any sentence claiming weekdays are partitioned/exclusive with a note that a weekday may now be shared by more than one segment, and that ward/occurrence tracking (not attendance/evaluation) is what stays per-type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd quran-hifz-mobile && npx jest lib/quranRange.test.ts`
Expected: PASS, all tests including the new ones.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/lib/quranRange.ts quran-hifz-mobile/lib/quranRange.test.ts
git commit -m "feat: allow حفظ and مراجعة segments to share weekdays (mobile scheduling core)"
```

---

## Task 2: Web `quranRange.ts` mirror

**Files:**
- Modify: `quran-hifz/src/quran/lib/quranRange.ts:422-460` (`segmentOccurrenceCounts`), `:497-509` (`segmentForDate`), `:510-527` (`validateSegmentDays`)

**Interfaces:**
- Consumes: nothing new.
- Produces: same three functions, same signatures as Task 1 (`segmentsForDate` renamed/pluralized). No caller of `segmentForDate` exists in the web app today (confirmed by grep) — the rename is safe with no other call site to update in this codebase.

- [ ] **Step 1: Apply the identical logic changes to `quran-hifz/src/quran/lib/quranRange.ts`**

Replace the `segmentOccurrenceCounts` function (lines 422-460) with:

```ts
export function segmentOccurrenceCounts(plan: MultiPlanInput): Map<PlanType, number> {
  const counts = new Map<PlanType, number>();
  for (const seg of plan.segments) counts.set(seg.type, 0);

  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;

  if (plan.endType === 'date') {
    for (const seg of plan.segments) {
      counts.set(seg.type, countMatchingDays(plan.startDate, plan.endDate!, seg.days, holidays));
    }
    return counts;
  }

  const target = plan.activeDaysCount ?? 0;
  const cursor = dateOnly(plan.startDate);
  let seen = 0;
  let walked = 0;
  while (seen < target && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (!holidays.has(dateKey(cursor))) {
      const label = dayLabel(cursor);
      // A day can now fund more than one segment (حفظ + مراجعة sharing a
      // weekday) — every matching segment gets an occurrence, but the day
      // still consumes only one unit of the shared calendar-day budget.
      const matching = plan.segments.filter((s) => s.days.includes(label));
      if (matching.length > 0) {
        for (const seg of matching) counts.set(seg.type, (counts.get(seg.type) ?? 0) + 1);
        seen++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    walked++;
  }
  return counts;
}
```

Replace `segmentForDate` (line 497) with:

```ts
/** Every segment that owns a given date — a date can now belong to more than
 * one segment (حفظ + مراجعة sharing a weekday), so this returns an array,
 * not a single winner. Empty on an off day/holiday. */
export function segmentsForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput[] {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return [];
  const label = dayLabel(day);
  return plan.segments.filter((s) => s.days.includes(label));
}
```

Replace `validateSegmentDays` (line 510) with:

```ts
/**
 * Rejects a segment set where a segment has no days, or a type appears
 * twice. Returns an Arabic message, or null when the set is valid. Shared
 * by the API and both clients' forms. Two different types MAY claim the
 * same weekday — that is exactly what lets a plan run حفظ and مراجعة on the
 * same day; each still tracks its own ward/occurrence independently.
 */
export function validateSegmentDays(segments: PlanSegmentInput[]): string | null {
  if (segments.length === 0) return 'يجب اختيار نوع واحد على الأقل';

  const seenTypes = new Set<PlanType>();
  for (const seg of segments) {
    if (seenTypes.has(seg.type)) return `النوع "${seg.type}" مكرر — كل نوع مرة واحدة فقط`;
    seenTypes.add(seg.type);

    if (seg.days.length === 0) return `اختر أيام "${seg.type}"`;
  }
  return null;
}
```

This file has no import-path differences for these functions since they take no cross-file types beyond what's already local. Also update the block comment above the multi-segment section (search for text claiming weekdays are partitioned/exclusive) to note a weekday may now be shared by more than one segment.

- [ ] **Step 2: Typecheck**

Run: `cd quran-hifz && npx tsc --noEmit`
Expected: no new errors from `quranRange.ts` itself (it currently has no callers of `segmentForDate` to break). If any pre-existing unrelated errors show up, they are out of scope — only confirm nothing new appears in `quranRange.ts` or files importing it.

- [ ] **Step 3: Commit**

```bash
git add quran-hifz/src/quran/lib/quranRange.ts
git commit -m "feat: allow حفظ and مراجعة segments to share weekdays (web scheduling core)"
```

---

## Task 3: Server `quranRange.ts` mirror + `computeMultiTodayAssignment` → plural + fix `backfillPlans.ts`

**Files:**
- Modify: `quran-hifz-server/src/lib/quranRange.ts:429-460` (`segmentOccurrenceCounts`), `:490-501` (`computeMultiScheduleBreakdown` — sort tiebreaker only), `:504-510` (`segmentForDate`), `:513-523` (`computeMultiTodayAssignment`), `:530-548` (`validateSegmentDays`)
- Modify: `quran-hifz-server/src/seeds/backfillPlans.ts:13,49-54`
- Modify: `quran-hifz-server/src/models/QuranPlan.model.ts:53-64` (`IPlanSegment` doc comment only — no field/schema change)

**Interfaces:**
- Consumes: nothing new.
- Produces: `segmentsForDate(plan, d): PlanSegmentInput[]` (renamed/pluralized, matching Task 1/2). `computeMultiTodayAssignments(plan, today?): (TodayAssignment & { type: PlanType })[]` (**renamed from `computeMultiTodayAssignment`, now returns an array, 0-2 entries**) — consumed by `backfillPlans.ts` in this same task. Not consumed by Task 4 (`quran-plan.controller.ts` computes its per-segment `todayAssignment`s inline via `computeTodayAssignment`, not through this helper — confirmed, this helper has exactly one real caller in the whole repo).

- [ ] **Step 1: Apply the `segmentOccurrenceCounts` and `validateSegmentDays` changes**

In `quran-hifz-server/src/lib/quranRange.ts`, replace the `segmentOccurrenceCounts` function (lines 429-460) with:

```ts
export function segmentOccurrenceCounts(plan: MultiPlanInput): Map<PlanType, number> {
  const counts = new Map<PlanType, number>();
  for (const seg of plan.segments) counts.set(seg.type, 0);

  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;

  if (plan.endType === 'date') {
    for (const seg of plan.segments) {
      counts.set(seg.type, countMatchingDays(plan.startDate, plan.endDate!, seg.days, holidays));
    }
    return counts;
  }

  const target = plan.activeDaysCount ?? 0;
  const cursor = dateOnly(plan.startDate);
  let seen = 0;
  let walked = 0;
  while (seen < target && walked < SCHEDULE_WALK_LIMIT_DAYS) {
    if (!holidays.has(dateKey(cursor))) {
      const label = dayLabel(cursor);
      // A day can now fund more than one segment (حفظ + مراجعة sharing a
      // weekday) — every matching segment gets an occurrence, but the day
      // still consumes only one unit of the shared calendar-day budget.
      const matching = plan.segments.filter((s) => s.days.includes(label));
      if (matching.length > 0) {
        for (const seg of matching) counts.set(seg.type, (counts.get(seg.type) ?? 0) + 1);
        seen++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    walked++;
  }
  return counts;
}
```

Replace `validateSegmentDays` (lines 530-548) with:

```ts
/**
 * Rejects a segment set where a segment has no days, or a type appears
 * twice. Returns an Arabic message, or null when the set is valid. Shared
 * by the API and both clients' forms. Two different types MAY claim the
 * same weekday — that is exactly what lets a plan run حفظ and مراجعة on the
 * same day; each still tracks its own ward/occurrence independently.
 */
export function validateSegmentDays(segments: PlanSegmentInput[]): string | null {
  if (segments.length === 0) return 'يجب اختيار نوع واحد على الأقل';

  const seenTypes = new Set<PlanType>();
  for (const seg of segments) {
    if (seenTypes.has(seg.type)) return `النوع "${seg.type}" مكرر — كل نوع مرة واحدة فقط`;
    seenTypes.add(seg.type);

    if (seg.days.length === 0) return `اختر أيام "${seg.type}"`;
  }
  return null;
}
```

Also update the block comment above the multi-segment section (search for text claiming weekdays are partitioned/exclusive, and the `IPlanSegment` doc comment in `quran-hifz-server/src/models/QuranPlan.model.ts` making the same claim) to note a weekday may now be shared by more than one segment.

- [ ] **Step 2: Rename `segmentForDate` → `segmentsForDate`, pluralize**

Replace (lines 504-510):

```ts
export function segmentForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput | null {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return null;
  const label = dayLabel(day);
  return plan.segments.find((s) => s.days.includes(label)) ?? null;
}
```

with:

```ts
/** Every segment that owns a given date — a date can now belong to more than
 * one segment (حفظ + مراجعة sharing a weekday), so this returns an array,
 * not a single winner. Empty on an off day/holiday. */
export function segmentsForDate(plan: MultiPlanInput, d: Date): PlanSegmentInput[] {
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const day = dateOnly(d);
  if (holidays.has(dateKey(day))) return [];
  const label = dayLabel(day);
  return plan.segments.filter((s) => s.days.includes(label));
}
```

- [ ] **Step 3: Rename `computeMultiTodayAssignment` → `computeMultiTodayAssignments`, pluralize**

Replace (lines 512-523, doc comment + body):

```ts
/** Today's ward across the plan — at most one, since days are partitioned. */
export function computeMultiTodayAssignment(
  plan: MultiPlanInput,
  today: Date = new Date(),
): (TodayAssignment & { type: PlanType }) | null {
  const seg = segmentForDate(plan, today);
  if (!seg) return null;
  const count = segmentOccurrenceCounts(plan).get(seg.type) ?? 0;
  if (count <= 0) return null;
  const slice = computeTodayAssignment(segmentAsScheduleInput(plan, seg, count), today);
  return slice ? { ...slice, type: seg.type } : null;
}
```

with:

```ts
/** Every ward due today across the plan — 0-2 entries, one per active
 * segment (a day may now fund both حفظ and مراجعة at once). */
export function computeMultiTodayAssignments(
  plan: MultiPlanInput,
  today: Date = new Date(),
): (TodayAssignment & { type: PlanType })[] {
  const segs = segmentsForDate(plan, today);
  if (segs.length === 0) return [];
  const counts = segmentOccurrenceCounts(plan);
  const out: (TodayAssignment & { type: PlanType })[] = [];
  for (const seg of segs) {
    const count = counts.get(seg.type) ?? 0;
    if (count <= 0) continue;
    const slice = computeTodayAssignment(segmentAsScheduleInput(plan, seg, count), today);
    if (slice) out.push({ ...slice, type: seg.type });
  }
  return out;
}
```

- [ ] **Step 4: Add a stable sort tiebreaker to `computeMultiScheduleBreakdown`**

At line 500, change:
```ts
  return out.sort((a, b) => a.date.localeCompare(b.date));
```
to:
```ts
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
```

- [ ] **Step 5: Fix the one real caller, `backfillPlans.ts`**

In `quran-hifz-server/src/seeds/backfillPlans.ts`, line 13, change the import:
```ts
import { WEEK_DAYS, computeMultiTodayAssignment, pageRangeOfAyahRange } from '../lib/quranRange';
```
to:
```ts
import { WEEK_DAYS, computeMultiTodayAssignments, pageRangeOfAyahRange } from '../lib/quranRange';
```

Lines 49-54, change:
```ts
    return computeMultiTodayAssignment({
      startDate: p.startDate, holidays: p.holidays,
      endType: p.endType, activeDaysCount: p.activeDaysCount, endDate: p.endDate,
      segments,
    }, today) !== null;
```
to:
```ts
    return computeMultiTodayAssignments({
      startDate: p.startDate, holidays: p.holidays,
      endType: p.endType, activeDaysCount: p.activeDaysCount, endDate: p.endDate,
      segments,
    }, today).length > 0;
```

- [ ] **Step 6: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: no errors referencing `quranRange.ts`, `backfillPlans.ts`, or `segmentForDate`/`computeMultiTodayAssignment` (the old names) anywhere.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-server/src/lib/quranRange.ts quran-hifz-server/src/seeds/backfillPlans.ts quran-hifz-server/src/models/QuranPlan.model.ts
git commit -m "feat: allow حفظ and مراجعة segments to share weekdays (server scheduling core)"
```

---

## Task 4: Server `quran-plan.controller.ts` — add `todayAssignments` array

**Files:**
- Modify: `quran-hifz-server/src/controllers/quran-plan.controller.ts:202-227`

**Interfaces:**
- Consumes: `shaped: { type: PlanType; todayAssignment: (TodayAssignment & {type: PlanType}) | null; ... }[]` — the existing per-segment array built earlier in `withPlanComputed` (line 168-200), unchanged.
- Produces: `todayAssignments: (TodayAssignment & { type: PlanType })[]` on every plan API response (`getPlans`, `getPlan`, `createPlan`, `updatePlan`, `generateSchedule`) — consumed by Task 5 (type declarations) and Tasks 8/9 (UI banners).

- [ ] **Step 1: Add the plural rollup, keep the singular one for back-compat**

In `withPlanComputed` (`quran-hifz-server/src/controllers/quran-plan.controller.ts`), replace lines 202-203:

```ts
  // Days are partitioned, so at most one segment can be due today.
  const todayAssignment = shaped.find((s) => s.todayAssignment)?.todayAssignment ?? null;
```

with:

```ts
  // A day can now fund more than one segment (حفظ + مراجعة sharing a
  // weekday) — every segment due today is exposed via `todayAssignments`.
  // `todayAssignment` (singular) is kept as a best-effort first-match for
  // screens that only ever render one type; new/updated screens should read
  // `todayAssignments` instead.
  const todayAssignments = shaped.map((s) => s.todayAssignment).filter((a): a is NonNullable<typeof a> => a != null);
  const todayAssignment = todayAssignments[0] ?? null;
```

Then, in the returned object (around line 227, where `todayAssignment,` currently appears in the rollups), add `todayAssignments,` right after it:

```ts
    todayAssignment,
    todayAssignments,
```

- [ ] **Step 2: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `cd quran-hifz-server && npx ts-node-dev --transpile-only src/server.ts` (or however the dev server is normally started per `.wolf/cerebrum.md`'s 2026-07-03 entry), then in another shell:
```bash
curl -s http://localhost:5001/api/quran-plans -H "Authorization: Bearer <a real teacher token>" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.data[0].todayAssignments, j.data[0].todayAssignment);})"
```
Expected: `todayAssignments` is an array (possibly empty), `todayAssignment` equals its first element or `null`.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src/controllers/quran-plan.controller.ts
git commit -m "feat: expose todayAssignments array from quran-plan API for same-day multi-type plans"
```

---

## Task 5: API type declarations — add `todayAssignments` field (web + mobile)

**Files:**
- Modify: `quran-hifz/src/quran/api/quran-plans.ts:96` (area)
- Modify: `quran-hifz-mobile/lib/queries/quranPlan.ts:76` (area)

**Interfaces:**
- Consumes: the `todayAssignments` field added to the server response in Task 4.
- Produces: `QuranPlan.todayAssignments: (TodayAssignment & { type: PlanType })[]` on the client-side `QuranPlan` type in both apps — consumed by Tasks 8 and 9.

- [ ] **Step 1: Web — add the field**

In `quran-hifz/src/quran/api/quran-plans.ts`, find the top-level `QuranPlan` type's existing line (around line 96):
```ts
  todayAssignment: (TodayAssignment & { type: PlanType }) | null;
```
Add directly after it:
```ts
  todayAssignments: (TodayAssignment & { type: PlanType })[];
```

- [ ] **Step 2: Mobile — add the field**

In `quran-hifz-mobile/lib/queries/quranPlan.ts`, find the top-level `QuranPlan` type's existing line (around line 76):
```ts
  todayAssignment: (TodayAssignment & { type: PlanType }) | null;
```
Add directly after it:
```ts
  todayAssignments: (TodayAssignment & { type: PlanType })[];
```

- [ ] **Step 3: Typecheck both**

Run: `cd quran-hifz && npx tsc --noEmit` and `cd quran-hifz-mobile && npx tsc --noEmit`
Expected: no new errors (a purely-additive field never breaks existing consumers).

- [ ] **Step 4: Commit**

```bash
git add quran-hifz/src/quran/api/quran-plans.ts quran-hifz-mobile/lib/queries/quranPlan.ts
git commit -m "feat: add todayAssignments to the client-side QuranPlan type"
```

---

## Task 6: Web plan builder — remove cross-segment day disabling

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx:216-234, 403-419`

**Interfaces:**
- Consumes: `validateSegmentDays` from Task 2 (now accepts shared days — the client-side pre-submit validation must stop rejecting them too, though it doesn't call `validateSegmentDays` directly per the disabling pattern here; this task removes the UI-level block that pre-empts it).
- Produces: nothing new consumed elsewhere — this is a leaf UI change.

- [ ] **Step 1: Read the current block**

Read `quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx` lines 200-430 to confirm exact current context around the `dayOwner` map and the segment-card day picker before editing (line numbers may have drifted slightly since the file was last read for this plan).

- [ ] **Step 2: Remove the `dayOwner` map and the disabling**

Delete the `dayOwner` `useMemo` (originally lines 216-218-area):
```ts
    const owner = new Map<string, PlanType>();
    for (const sg of form.segments) for (const d of sg.days) owner.set(d, sg.type);
    return owner;
```
and its containing `useMemo` wrapper — remove the whole `dayOwner` computation and its declaration, since no day is disabled any more.

In the segment-card day picker (originally lines 403-419), change:
```tsx
              disabledDays={WEEK_DAYS.filter((d) => {
                const owner = dayOwner.get(d);
                return !!owner && owner !== seg.type;
              })}
```
to:
```tsx
              disabledDays={[]}
```
(or remove the `disabledDays` prop entirely if `DaysOfWeekPicker` treats an omitted prop as "nothing disabled" — check `quran-hifz/src/quran/components/common/DaysOfWeekPicker.tsx` for the prop's default before deciding; prefer omitting the prop over passing `[]` if that is the established default-empty convention there).

Update the comment block right above (originally around lines 403-405: "One card per selected type: its own days and range. A day already taken by another type is disabled and names its owner") to remove the "disabled and names its owner" clause — replace with a note that both types may now share a day.

- [ ] **Step 3: Manual verification**

Run: `cd quran-hifz && npm run dev` (or the project's existing dev command), open the teacher "خطة قرآنية" create form, add a حفظ segment and a مراجعة segment, and confirm every weekday chip is selectable in both segment cards simultaneously, including a day already checked in the other segment's card. Confirm the live schedule preview at the bottom of the form shows rows for both types on a shared date.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx
git commit -m "feat: allow picking the same weekday for both plan segments in the builder (web)"
```

---

## Task 7: Mobile plan builder — remove cross-segment day disabling

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx:209-213, 356-386`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Remove the `dayOwner` map**

Delete (lines 209-213):
```ts
const dayOwner = useMemo(() => {
  const owner = new Map<string, PlanType>();
  for (const sg of form.segments) for (const d of sg.days) owner.set(d, sg.type);
  return owner;
}, [form.segments]);
```

- [ ] **Step 2: Remove the disabling in the chip renderer**

Replace (lines 359-386-area):
```tsx
{WEEK_DAYS.map((d) => {
  const owner = dayOwner.get(d);
  const mine = owner === seg.type;
  const taken = !!owner && !mine;
  return (
    <Pressable disabled={taken} ... onPress={() => toggleSegmentDay(seg.type, d)}
      accessibilityLabel={taken ? `${d} — مُسنَد لـ${owner}` : d}>
      <Text style={[s.chipText, mine && s.chipTextActive, taken && s.chipTextDisabled]}>{d}</Text>
    </Pressable>
  );
})}
```
with:
```tsx
{WEEK_DAYS.map((d) => {
  const mine = seg.days.includes(d);
  return (
    <Pressable onPress={() => toggleSegmentDay(seg.type, d)} accessibilityLabel={d}>
      <Text style={[s.chipText, mine && s.chipTextActive]}>{d}</Text>
    </Pressable>
  );
})}
```
(Keep any other existing props on the `Pressable`/`Text` not shown in this excerpt — this replacement only removes the `disabled`/`taken`/`chipTextDisabled` logic and the "مُسنَد لـ" label, it does not touch styling props outside what's quoted. Read the actual surrounding lines first to preserve them.)

Update the comment at lines 356-358 the same way as Task 6 Step 2's comment update.

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-mobile && npx tsc --noEmit`
Expected: no errors (confirm `PlanType` import is still used elsewhere in the file — if `dayOwner`'s removal makes the `PlanType` import unused, remove that import too).

- [ ] **Step 4: Manual verification**

Run the mobile dev server (`cd quran-hifz-mobile && npx expo start`), open the teacher plan-form screen, and repeat Task 6 Step 3's verification on a device/simulator.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/app/\(portal\)/teacher/plan-form.tsx
git commit -m "feat: allow picking the same weekday for both plan segments in the builder (mobile)"
```

---

## Task 8: Web read-only "today's ward" banners → loop over `todayAssignments`

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx:293-301`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx:82, 190-196`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherSpecialTracks.tsx:98, 110-118`
- Modify: `quran-hifz/src/quran/pages/student/StudentSpecialTracks.tsx:179-219`
- Modify: `quran-hifz/src/quran/pages/admin/AdminSpecialTracks.tsx:832-872`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx:420, 1605, 1613-1622` (the read-only linked-plan banner **only** — not the per-student attendance/completion block, which is Task 12)

**Interfaces:**
- Consumes: `plan.todayAssignments` / `linkedPlan.todayAssignments` from Task 5.
- Produces: nothing new consumed elsewhere — these are leaf display components.

- [ ] **Step 1: `TeacherPlans.tsx` PlanCard**

Read lines 280-310 first to confirm current context. Replace the single-assignment block (originally ~293-301):
```tsx
background: plan.todayAssignment ? "var(--green-pale)" : "var(--cream)",
...
color: plan.todayAssignment ? "var(--green)" : "var(--text3)", marginBottom: plan.todayAssignment ? 4 : 0
الجزء المطلوب اليوم{plan.todayAssignment ? ` · ${plan.todayAssignment.type}` : ""}
{plan.todayAssignment ? (() => {
  const a = orientSlice(plan.todayAssignment, segmentReversed(plan, plan.todayAssignment.type));
  ...
})() : ...}
```
with a version keyed off `plan.todayAssignments` (array): background/color/marginBottom conditions become `plan.todayAssignments.length > 0`, the label loses its inline `· ${type}` suffix (now redundant once there can be more than one), and the body maps over `plan.todayAssignments`, rendering one `surahName(a.surahStart)}:{a.ayahStart} — {surahName(a.surahEnd)}:{a.ayahEnd}` line per entry, each prefixed with its own `entry.type` label (since with 0-2 entries the per-entry type label is now the useful signal, not a card-level suffix). Use `orientSlice(entry, segmentReversed(plan, entry.type))` per entry (unchanged helper, just called once per array item instead of once for the whole card).

- [ ] **Step 2: `TeacherPlanDetail.tsx`**

Read lines 70-200 first. Replace the single `reversed`/`plan.todayAssignment` computation and the "الجزء المطلوب اليوم" panel (originally lines 82, 190-196) with a `plan.todayAssignments.map(...)` render, one panel row per entry, each computing its own `orientSlice(entry, segmentReversed(plan, entry.type))` and showing its own `entry.type` as a small label since the panel is no longer only ever showing one type.

- [ ] **Step 3: `TeacherSpecialTracks.tsx`**

Read lines 85-125 first. Replace the `linkedPlan?.todayAssignment &&` conditional block (originally lines 98, 110-118) with `linkedPlan?.todayAssignments && linkedPlan.todayAssignments.length > 0 && (...)`, mapping over the array the same way as Step 2.

- [ ] **Step 4: `StudentSpecialTracks.tsx`**

Read lines 165-225 first. Replace the header-tint conditions (`linkedPlan.todayAssignment ? ... : ...`, originally lines 179, 185) with `linkedPlan.todayAssignments.length > 0 ? ... : ...`, and the "مقرَّر اليوم:" body (originally lines 212-219) with one line per `linkedPlan.todayAssignments` entry, each prefixed by its own type when there is more than one entry (e.g. only show the type prefix when `linkedPlan.todayAssignments.length > 1`, to keep the common single-type case unchanged visually).

- [ ] **Step 5: `AdminSpecialTracks.tsx`**

Read lines 820-880 first. Apply the identical change as Step 4 (same pattern, different file) at the originally-quoted lines 832, 838, 868-872.

- [ ] **Step 6: `TeacherTrackDetail.tsx` read-only linked-plan banner**

Read lines 1590-1630 and line 420 first, to distinguish this **read-only summary banner** from the per-student attendance/completion block (Task 12's target, a different section of this same very large file). Apply the same array-mapping pattern as Step 2 to the `linkedPlan.todayAssignment` references at lines 420 and 1605-1622 **only** — do not touch the per-student `assignment-banner`/`CompactSurahAyah` block in this task; that is Task 12.

- [ ] **Step 7: Typecheck**

Run: `cd quran-hifz && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification**

With the same overlapping-days plan created in Task 6's verification, open each of the six pages above (as the relevant role — admin/teacher/student) and confirm: a day with one type shows exactly as before (no visible regression), and a day with both types shows two lines/rows, each correctly labeled and ranged.

- [ ] **Step 9: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx quran-hifz/src/quran/pages/teacher/TeacherSpecialTracks.tsx quran-hifz/src/quran/pages/student/StudentSpecialTracks.tsx quran-hifz/src/quran/pages/admin/AdminSpecialTracks.tsx quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx
git commit -m "feat: render every segment due today, not just one, across web plan/track banners"
```

---

## Task 9: Mobile read-only "today's ward" banners → loop over `todayAssignments`

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plans.tsx:74-76, 151, 157`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plan-detail.tsx:73-74` (plus its render usage of `assignment`)
- Modify: `quran-hifz-mobile/app/(portal)/student/special_tracks.tsx:42-46, 119, 122-123`
- Modify: `quran-hifz-mobile/app/(portal)/admin/special_tracks.tsx:608-612, 688, 696-697`
- Modify: `quran-hifz-mobile/components/domain/TrackDetail.tsx:171, 341-350`

**Interfaces:**
- Consumes: `plan.todayAssignments` / `linkedPlan.todayAssignments` from Task 5.
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: `plans.tsx`**

Read lines 60-165 first. Replace the single `assignment` computation (originally lines 74-76):
```tsx
const assignment = plan.todayAssignment
  ? orientSlice(plan.todayAssignment, segmentReversed(plan, plan.todayAssignment.type))
  : null;
```
with:
```tsx
const assignments = plan.todayAssignments.map((a) => ({
  ...orientSlice(a, segmentReversed(plan, a.type)),
  type: a.type,
  reversed: segmentReversed(plan, a.type),
}));
```
and update the render (originally lines 151, 157, the "الجزء المطلوب اليوم" line and the "· بالعكس" suffix) to map over `assignments`, rendering one line per entry with its own type label and its own "· بالعكس" suffix (drawn from `entry.reversed`, not a card-level single value).

- [ ] **Step 2: `plan-detail.tsx`**

Read lines 60-90 first. Replace (originally lines 73-74):
```tsx
const reversed = segmentReversed(plan, plan.todayAssignment?.type);
const assignment = plan.todayAssignment ? orientSlice(plan.todayAssignment, reversed) : null;
```
with the same `assignments` array pattern as Step 1, and update whatever later JSX consumes `assignment`/`reversed` to map over `assignments` instead.

- [ ] **Step 3: `student/special_tracks.tsx`**

Read lines 30-130 first. Replace the `todayText`-building function (originally lines 42-46) which currently does:
```tsx
if (!linkedPlan?.todayAssignment) return 'لا يوجد جزء مخصص لليوم';
const a = orientSlice(linkedPlan.todayAssignment, segmentReversed(linkedPlan, linkedPlan.todayAssignment.type));
const pages = a.pageEnd !== a.pageStart ? `${a.pageStart} - ${a.pageEnd}` : `${a.pageStart}`;
return `مقرَّر اليوم: ${surahName(a.surahStart)} : ${a.ayahStart} — ${surahName(a.surahEnd)} : ${a.ayahEnd} (صفحة ${pages})`;
```
with a version that builds one such line per `linkedPlan?.todayAssignments` entry and joins them (e.g. with `\n`), returning `'لا يوجد جزء مخصص لليوم'` only when the array is empty. Update the tint conditions at lines 119, 122-123 from `linkedPlan.todayAssignment ?` to `linkedPlan.todayAssignments.length > 0 ?`.

- [ ] **Step 4: `admin/special_tracks.tsx`**

Read lines 595-700 first. Apply the identical change as Step 3 at the originally-quoted lines 608-612, 688, 696-697.

- [ ] **Step 5: `components/domain/TrackDetail.tsx`**

Read lines 160-355 first. Replace `planReversed` (originally line 171: `const planReversed = segmentReversed(linkedPlan, linkedPlan?.todayAssignment?.type);`) and the assignment box render (originally lines 341-350) with a version that maps over `linkedPlan.todayAssignments`, computing `orientSlice`/`segmentReversed` per entry (each entry may have a different reversed-ness, since each type can span a different, independently-reversed range), rendering one `<Text>` line per entry inside `s.assignmentBox`, falling back to the existing muted "لا يوجد جزء مخصص لليوم" text only when the array is empty.

- [ ] **Step 6: Typecheck**

Run: `cd quran-hifz-mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Repeat Task 8 Step 8's verification on the mobile app (device/simulator) for each of the five files above.

- [ ] **Step 8: Commit**

```bash
git add "quran-hifz-mobile/app/(portal)/teacher/plans.tsx" "quran-hifz-mobile/app/(portal)/teacher/plan-detail.tsx" "quran-hifz-mobile/app/(portal)/student/special_tracks.tsx" "quran-hifz-mobile/app/(portal)/admin/special_tracks.tsx" quran-hifz-mobile/components/domain/TrackDetail.tsx
git commit -m "feat: render every segment due today, not just one, across mobile plan/track banners"
```

---

## Task 10: Web `TeacherPlanDetail.tsx` full schedule table — type badge + per-row orientation

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx:82, 224-246`

**Interfaces:**
- Consumes: `plan.schedule: (ScheduleEntry & { type: PlanType })[]` (already exists, per `quran-hifz/src/quran/api/quran-plans.ts:50`).
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Fix the single global `reversed` flag (latent bug for mixed-direction segments)**

Read lines 75-250 first. The table currently computes one `reversed` for the whole table (line 82: `const reversed = segmentReversed(plan, plan.todayAssignment?.type);`) and applies it to every row regardless of that row's own `type` — wrong whenever the plan's two segments run in different directions. Remove this single `reversed` computation from being used inside the table's row-mapping (it may still be used elsewhere in the file for the top "today's ward" panel, which Task 8 Step 2 already made per-entry — if after Task 8 nothing else in the file uses the file-level `reversed` const, delete it entirely).

- [ ] **Step 2: Add a type column and per-row orientation**

Replace the header row (originally lines 224-231):
```tsx
<tr>
  <th>#</th><th>التاريخ</th><th>الجزء</th><th>من</th><th>إلى</th><th>الصفحات</th>
</tr>
```
with:
```tsx
<tr>
  <th>#</th><th>النوع</th><th>التاريخ</th><th>الجزء</th><th>من</th><th>إلى</th><th>الصفحات</th>
</tr>
```

Replace the row body (originally lines 234-246):
```tsx
{plan.schedule.map((s) => {
  const a = orientSlice(s, reversed);
  return (
  <tr key={s.occurrenceIndex}>
    <td>{s.occurrenceIndex}</td>
    <td>{fmtDate(s.date)}</td>
    <td><Badge tone="green">جزء {s.juz}</Badge></td>
    <td>{surahName(a.surahStart)} : {a.ayahStart}</td>
    <td>{surahName(a.surahEnd)} : {a.ayahEnd}</td>
    <td>{a.pageStart === a.pageEnd ? a.pageStart : `${a.pageStart} - ${a.pageEnd}`}</td>
  </tr>
  );
})}
```
with:
```tsx
{plan.schedule.map((s) => {
  const a = orientSlice(s, segmentReversed(plan, s.type));
  return (
  <tr key={`${s.type}-${s.occurrenceIndex}`}>
    <td>{s.occurrenceIndex}</td>
    <td><Badge tone={s.type === 'حفظ' ? 'green' : 'gold'}>{s.type}</Badge></td>
    <td>{fmtDate(s.date)}</td>
    <td><Badge tone="green">جزء {s.juz}</Badge></td>
    <td>{surahName(a.surahStart)} : {a.ayahStart}</td>
    <td>{surahName(a.surahEnd)} : {a.ayahEnd}</td>
    <td>{a.pageStart === a.pageEnd ? a.pageStart : `${a.pageStart} - ${a.pageEnd}`}</td>
  </tr>
  );
})}
```
(`key` changes from `s.occurrenceIndex` alone to `${s.type}-${s.occurrenceIndex}` because `occurrenceIndex` restarts at 1 within each segment — two rows can now legitimately share the same bare `occurrenceIndex`. Confirm `Badge`'s `tone` prop accepts `'gold'`, per `quran-hifz/src/quran/components/common/Badge.tsx` — the mobile `ScheduleSheet.tsx` already uses `variant="gold"` for exactly this type badge, per Task research, so the web `Badge` almost certainly has an equivalent tone; adjust the tone name to whatever that component actually exposes if `'gold'` isn't it.)

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Open the schedule modal/table on `TeacherPlanDetail.tsx` for the overlapping-days plan from Task 6; confirm two rows appear for each shared date (one حفظ, one مراجعة, correctly badged), and that a single-type plan's table looks unchanged aside from the new (now-redundant but harmless) type column.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx
git commit -m "feat: show a type badge and orient each row independently in the plan schedule table"
```

---

## Task 11: Web `TeacherAttendance.tsx` — dual per-type ward recording

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx:229-259, 264-265, 461-464, 468-524, 689, 715-757, 774-820, 390`

**Interfaces:**
- Consumes: `useStudentPlanProgressList` (unchanged, from `../../api/student-plan-progress`), `useRecordStudentOccurrence`/`recordOccurrence` mutation (unchanged signature: `{ planId, studentId, type?: PlanType, occurrenceIndex, status, completedThroughSurah?, completedThroughAyah? }`).
- Produces: nothing new consumed elsewhere — this is the terminal write path for حفظ/مراجعة ward completion on this screen.

- [ ] **Step 1: Read the current file section**

Read `quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx` lines 220-830 in full before editing — the line numbers below are from an earlier pass and may have drifted; use them as an anchor to locate the equivalent code, not as guaranteed-exact offsets.

- [ ] **Step 2: Make `assignmentByDate` plural**

Find the local `useMemo` building `assignmentByDate` (originally lines 229-259). It currently does a first-write-wins `if (!byDate.has(d)) byDate.set(d, e);` into a `Map<string, ScheduleEntry & { type?: PlanType }>`. Change the map's value type to an array and push instead of skip:
```ts
const byDate = new Map<string, (ScheduleEntry & { type: PlanType })[]>();
// ...inside the loop that iterates plans' schedule entries...
const list = byDate.get(d) ?? [];
list.push(e);
byDate.set(d, list);
```
(Keep everything else about how `d`/`e` are derived from the surrounding loop unchanged — only the write into `byDate` changes from overwrite-if-absent to append.)

- [ ] **Step 3: Replace the single `dayType` with a per-day array**

Replace (originally line 264):
```ts
const dayType = assignmentByDate.get(effectiveDate)?.type;
```
with:
```ts
const dayAssignments = assignmentByDate.get(effectiveDate) ?? [];
```
Find every other use of `dayType` in the file (there should be very few beyond what Step 4 touches) and adapt each: if a use only needs "is there a ward today at all", use `dayAssignments.length > 0`; if a use needs "the" reversed-ness for a page-level banner not tied to a specific student/type, that use itself likely needs to become per-entry (map over `dayAssignments`) rather than collapsed to one value — apply the same reasoning as Task 8.

- [ ] **Step 4: Replace `assignmentForStudent` (singular) with `assignmentsForStudent` (plural)**

Find (originally lines 461-464):
```ts
const assignmentForStudent = (studentId: string) =>
  progressByStudentId[studentId]?.effectiveSchedule.find((o) => toDateOnly(o.date) === effectiveDate);
```
Replace with:
```ts
const assignmentsForStudent = (studentId: string) =>
  (progressByStudentId[studentId]?.effectiveSchedule ?? []).filter((o) => toDateOnly(o.date) === effectiveDate);
```
Update the call site at (originally line 689):
```ts
const assignment = hasIndividualPlan ? assignmentForStudent(s._id) : undefined;
```
to:
```ts
const assignments = hasIndividualPlan ? assignmentsForStudent(s._id) : [];
```

- [ ] **Step 5: Make `completionOverrides` per-type**

Find the `completionOverrides` state declaration (originally around line 390) — it is `Record<string, RangePoint>` keyed by `studentId`. Change every read/write of this state to use a composite key `${studentId}::${type}` instead of bare `studentId`:
- Declaration stays `Record<string, RangePoint>` (composite string keys, no type change needed to the `Record` itself).
- Any setter (e.g. `setCompletedPoint(studentId, point)`) gains a `type: PlanType` parameter and keys with `` `${studentId}::${type}` ``.
- Any getter (e.g. `completedPointFor(studentId, assignment)`) becomes `completedPointFor(studentId, assignment: ScheduleEntry & { type: PlanType })` and reads `` completionOverrides[`${studentId}::${assignment.type}`] ``.

- [ ] **Step 6: Render one assignment-banner + one وصل-إلى picker per entry in `assignments`**

Replace the single-assignment banner block (originally lines 715-757, currently rendered once per student using `assignment`) with `assignments.map((assignment) => (<div key={assignment.type}>...same JSX body as before, referencing `assignment` as it always did.../* plus a small type label, e.g. a Badge showing assignment.type, since more than one block can now render per student */></div>))`. Do the same for the "وصل إلى" `CompactSurahAyah` block (originally lines 774-820/788-792): wrap it in the same `assignments.map(...)`, using `completedPointFor(s._id, assignment)` / `` setCompletedPoint(s._id, assignment.type, ...) `` per entry, and pass `bounds={reachedBounds(assignment, s._id)}` unchanged (that helper already takes an `assignment`, now just called once per array entry instead of once total). If `assignments.length === 0`, render nothing for this section (matches today's `assignment == null` behavior).

- [ ] **Step 7: `saveStudent` — one `recordOccurrence.mutate` call per assignment**

Find `saveStudent` (originally line 468). It currently resolves one `studentAssignment` and calls `recordOccurrence.mutate` once (full-completion path originally line 504; partial/absent/over path originally lines 516-524), passing `type: dayType`. Replace the single-assignment resolution with a loop over `assignmentsForStudent(studentId)`, and inside the loop, for each `assignment`, run the exact same status-derivation logic that exists today (حاضر/غائب from `overrides[studentId].attendanceStatus`, completed-point from `completedPointFor(studentId, assignment)`) and call `recordOccurrence.mutate({ planId: linkedPlan._id, studentId, type: assignment.type, occurrenceIndex: assignment.occurrenceIndex, status, ...(status !== 'absent' ? { completedThroughSurah, completedThroughAyah } : {}) })` once per loop iteration. A single-type day (the common case) now runs the loop body exactly once, identically to today's single call — this is a behavior-preserving generalization, not a special case for the multi-type day.

- [ ] **Step 8: Typecheck**

Run: `cd quran-hifz && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Manual verification**

On the overlapping-days plan from Task 6, open "الحضور والتقييم" for a day both types are due, confirm: two "وصل إلى" pickers appear per student, each bounded to its own type's range; recording one student's حفظ ward as partial and مراجعة ward as done and saving produces two separate `record` calls (check the network tab / server logs) each with the correct `type`; marking a student غائب produces two `record` calls with `status: 'absent'`, one per type. On a normal single-type day, confirm the screen renders and behaves exactly as before (one picker, one save call).

- [ ] **Step 10: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx
git commit -m "feat: record حفظ and مراجعة wards independently when both are due the same day (web attendance)"
```

---

## Task 12: Web `TeacherTrackDetail.tsx` — dual per-type ward recording (+ missing `type` param)

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx:542-567, 708, 748-753, 765-774, 877-882, 1202, 1236-1286, 1358-1365, 402`

**Interfaces:**
- Consumes: `useQuranPlans` (from `../../api/quran-plans`), `useRecordStudentOccurrence`/`useStudentPlanProgressList` (from `../../api/student-plan-progress`) — all unchanged imports/signatures; `recordOccurrence`'s mutation body shape is `{ planId: string; studentId: string; type?: PlanType; occurrenceIndex: number; status: 'done' | 'partial' | 'absent'; completedThroughSurah?: number; completedThroughAyah?: number }`.
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Read the current file section**

Read `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx` lines 400-900 and 1180-1400 in full before editing (this file is ~1940 lines; the ranges below are anchors from an earlier pass).

- [ ] **Step 2: Fix the schedule-map (bigger gap than Task 11 — no `type` at all today)**

Find the `byDate` map (originally lines 542-567): `const byDate = new Map<string, ScheduleEntry>();` sourced only from `linkedPlan?.schedule ?? []`, first-write-wins (`if (!byDate.has(d)) byDate.set(d, e);`), and the map's value type has **no `type` field**. Change:
```ts
const byDate = new Map<string, ScheduleEntry>();
```
to:
```ts
const byDate = new Map<string, (ScheduleEntry & { type: PlanType })[]>();
```
and change the write from first-write-wins-overwrite:
```ts
if (!byDate.has(d)) byDate.set(d, e);
```
to append:
```ts
const list = byDate.get(d) ?? [];
list.push(e);
byDate.set(d, list);
```
Every `e` pushed must already carry `type` — confirm `linkedPlan.schedule` entries do (they do, per `quran-plans.ts:50`).

- [ ] **Step 3: Pluralize `assignmentForStudent`**

Find (originally lines 877-882, same shape as `TeacherAttendance.tsx`'s equivalent):
```ts
const assignmentForStudent = (studentId: string) =>
  progressByStudentId[studentId]?.effectiveSchedule.find((o) => toDateOnly(o.date) === effectiveDate);
```
Replace with:
```ts
const assignmentsForStudent = (studentId: string) =>
  (progressByStudentId[studentId]?.effectiveSchedule ?? []).filter((o) => toDateOnly(o.date) === effectiveDate);
```
Update the call site (originally line 1202):
```ts
const assignment = hasIndividualPlan ? assignmentForStudent(id) : undefined;
```
to:
```ts
const assignments = hasIndividualPlan ? assignmentsForStudent(id) : [];
```

- [ ] **Step 4: Make `completionOverrides` per-type**

Find the `completionOverrides` state declaration (originally referenced near line 402) — `Record<string, RangePoint>` keyed by `studentId`. Change every read/write of this state to use a composite key `${studentId}::${type}` instead of bare `studentId`:
- Declaration stays `Record<string, RangePoint>` (composite string keys, no type change needed to the `Record` itself).
- Any setter (e.g. `setCompletedPoint(studentId, point)`) gains a `type: PlanType` parameter and keys with `` `${studentId}::${type}` ``.
- Any getter (e.g. `completedPointFor(studentId, assignment)`) becomes `completedPointFor(studentId, assignment: ScheduleEntry & { type: PlanType })` and reads `` completionOverrides[`${studentId}::${assignment.type}`] ``.

- [ ] **Step 5: Render one ward block per entry in `assignments`**

Replace the single-assignment banner block (originally lines 1236-1286, currently rendered once per student using `assignment`) with `assignments.map((assignment) => (<div key={assignment.type}>...same JSX body as before, referencing `assignment` as it always did.../* plus a small type label/Badge, since more than one block can now render per student */></div>))`. Do the same for the `CompactSurahAyah` block (originally lines 1358-1365):
```tsx
<CompactSurahAyah
  value={actualPoint}
  disabled={controlsLocked}
  bounds={reachedBounds(assignment, id)}
  onChange={(v) => setCompletedPoint(id, clampReached(v, assignment, id))}
/>
```
wrapped in the same `assignments.map((assignment) => ...)`, using `completedPointFor(id, assignment)` for `value` and `` setCompletedPoint(id, assignment.type, ...) `` in `onChange`. If `assignments.length === 0`, render nothing for this section (matches today's `assignment == null` behavior).

Also fix `rangeReversed` (originally line 420):
```ts
const rangeReversed = !!linkedPlan && segmentReversed(linkedPlan, linkedPlan?.todayAssignment?.type);
```
which is wrong today independent of this feature (it derives reversed-ness from the plan's *current* "today", not from `effectiveDate`/the specific occurrence being rendered) — since Step 5's `assignments.map(...)` now computes orientation per-entry via `orientSlice(assignment, segmentReversed(linkedPlan, assignment.type))` at each render site, this file-level `rangeReversed` becomes dead once every consumer is migrated; delete it and its declaration once confirmed unused (grep the file for `rangeReversed` after Step 5 to confirm no remaining reads).

- [ ] **Step 6: Add the missing `type` param to `recordOccurrence.mutate`, looping per assignment**

This file's `saveStudent` (originally line 708) currently resolves ONE `studentAssignment` and calls `recordOccurrence.mutate` **without a `type` field at all** (originally lines 748-753 and 765-774):
```ts
recordOccurrence.mutate({ planId: linkedPlan._id, studentId, occurrenceIndex: studentAssignment.occurrenceIndex, status });
```
and similarly at lines 765-774 for the partial/absent path — unlike `TeacherAttendance.tsx`, which already passes `type: dayType` today. Replace the single-assignment resolution with a loop over `assignmentsForStudent(studentId)` (from Step 3), and inside the loop, for each `assignment`, run the exact same status-derivation logic that exists today (حاضر/غائب from `overrides[studentId].attendanceStatus`, completed-point from `completedPointFor(studentId, assignment)` from Step 4) and call:
```ts
recordOccurrence.mutate({
  planId: linkedPlan._id, studentId, type: assignment.type,
  occurrenceIndex: assignment.occurrenceIndex, status,
  ...(status !== 'absent' ? { completedThroughSurah, completedThroughAyah } : {}),
});
```
once per loop iteration — a single-type day (today's only case) now runs the loop body exactly once, identically to today's single call.

- [ ] **Step 7: Typecheck**

Run: `cd quran-hifz && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Repeat Task 11 Step 9's verification, but on the "المسارات" (special track) teacher drill-down page instead of "الحضور والتقييم" — this file is the special-track equivalent of the same recording flow.

- [ ] **Step 9: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx
git commit -m "feat: record حفظ and مراجعة wards independently when both are due the same day (web track detail)"
```

---

## Task 13: Mobile `DaySlider.tsx` + `EvaluationRoster.tsx` — dual per-type ward recording

**Files:**
- Modify: `quran-hifz-mobile/components/domain/DaySlider.tsx:25, 44-50` (`useDaySchedule`'s `assignmentByDate`)
- Modify: `quran-hifz-mobile/components/domain/EvaluationRoster.tsx:93-94, 110-111, 159-170, 203-207, 209-271, 328-441, 470`

**Interfaces:**
- Consumes: `useRecordStudentOccurrence` mutation (`lib/queries/quranPlan.ts:232-245`, unchanged signature — already has optional `type?: PlanType`), `useStudentPlanProgressList` (unchanged), `SurahAyahPicker` (unchanged props — `value`, `onChange`, `bounds`, `disabled`).
- Produces: `DaySchedule.assignmentByDate: Map<string, (ScheduleEntry & { type: PlanType })[]>` (**changed from `Map<string, DayEntry>`**) — consumed by both `attendance.tsx` (line 63-64) and `EvaluationRoster.tsx`, and by mobile `TrackDetail.tsx` if it also consumes `useDaySchedule` (check; per existing scope cut it has no recording logic but may still read `assignmentByDate` for display — if so, it needs the same `.length > 0`/`.map(...)` adaptation pattern as Task 9's other files, using the array shape).

- [ ] **Step 1: Read the current sections**

Read `quran-hifz-mobile/components/domain/DaySlider.tsx` in full (it's a small, focused file per its anatomy entry, ~1948 tokens) and `quran-hifz-mobile/components/domain/EvaluationRoster.tsx` lines 1-280 and 320-475 before editing.

- [ ] **Step 2: `DaySlider.tsx` — pluralize `assignmentByDate`**

Change the type declaration (originally line 25) from:
```ts
assignmentByDate: Map<string, DayEntry>;
```
to:
```ts
assignmentByDate: Map<string, DayEntry[]>;
```
and the reducer building it (originally lines 44-50) from first-write-wins:
```ts
if (!byDate.has(d)) byDate.set(d, e);
```
to append:
```ts
const list = byDate.get(d) ?? [];
list.push(e);
byDate.set(d, list);
```
Check every other consumer of `useDaySchedule`'s returned `assignmentByDate` in this file itself (if any) and adapt.

- [ ] **Step 3: Every caller of `useDaySchedule` must adapt to the array shape**

Grep for `assignmentByDate` across `quran-hifz-mobile/app/(portal)/teacher/attendance.tsx`, `quran-hifz-mobile/components/domain/EvaluationRoster.tsx`, and `quran-hifz-mobile/components/domain/TrackDetail.tsx`. In each, any `.get(effectiveDate)?.type`-style single-value read becomes `.get(effectiveDate) ?? []` and downstream logic maps over the array (same reasoning as Task 11 Step 3).

- [ ] **Step 4: `EvaluationRoster.tsx` — pluralize `dayType`**

Replace (originally lines 93-94):
```ts
const dayType = assignmentByDate.get(effectiveDate)?.type;
const rangeReversed = segmentReversed(linkedPlan, dayType);
```
with:
```ts
const dayAssignments = assignmentByDate.get(effectiveDate) ?? [];
```
(`rangeReversed` at the roster level is no longer meaningful as a single value once orientation must be computed per-type inside the per-student render — delete it here, computing `segmentReversed(linkedPlan, assignment.type)` per entry at each render/save site instead, same reasoning as Task 12 Step 3.)

- [ ] **Step 5: `assignmentForStudent` → `assignmentsForStudent`**

Replace (originally lines 203-207):
```ts
const assignmentForStudent = (studentId: string) =>
  progressByStudentId[studentId]?.effectiveSchedule.find((o) => toDateOnly(o.date) === effectiveDate);
```
with:
```ts
const assignmentsForStudent = (studentId: string) =>
  (progressByStudentId[studentId]?.effectiveSchedule ?? []).filter((o) => toDateOnly(o.date) === effectiveDate);
```

- [ ] **Step 6: `completionOverrides` → composite-keyed by `${studentId}::${type}`**

`completionOverrides` (originally declared line 111) is `Record<string, RangePoint>` keyed by `studentId`. Change every read/write of this state to use a composite key `${studentId}::${type}` instead of bare `studentId`:
- Declaration stays `Record<string, RangePoint>` (composite string keys, no type change needed to the `Record` itself).
- The setter used inside the picker's `onChange` (originally `setCompletionOverrides((p) => ({ ...p, [st._id]: clampReached(v, assignment, st._id) }))`, line 415) gains the `type` in its key: `setCompletionOverrides((p) => ({ ...p, [`${st._id}::${assignment.type}`]: clampReached(v, assignment, st._id) }))`.
- Any getter (e.g. `completedPointFor(studentId, assignment)`) becomes `completedPointFor(studentId, assignment: ScheduleEntry & { type: PlanType })` and reads `` completionOverrides[`${studentId}::${assignment.type}`] ``.

- [ ] **Step 7: Render one ward block per entry (originally lines 328-441)**

Wrap the assignment-banner + `SurahAyahPicker` block (originally lines 328-363 and 400-441, both currently rendered once per student off a single `assignment`) in `assignmentsForStudent(st._id).map((assignment) => (...))`, referencing `assignment` inside exactly as today, keyed by `assignment.type`, adding a small type label/Badge since more than one block can render per student now. Update the `renderExtra?.(st, dayType)` call (originally line 470) — since `dayType` no longer exists as a single value, decide per the call site's actual need: if `renderExtra` is meant to run once per student regardless of type, pass something else meaningful (e.g. `dayAssignments.map(a => a.type)` or drop the second arg if unused by any current `renderExtra` implementation — grep call sites of the `renderExtra` prop across `attendance.tsx` and any other consumer of `EvaluationRoster` before deciding, since this prop is part of the component's public interface).

- [ ] **Step 8: `saveStudent` — one `recordOccurrence.mutate` call per assignment**

`saveStudent` (originally lines 209-271) currently resolves one `assignment` and calls `recordOccurrence.mutate({ planId: linkedPlan._id, studentId, type: dayType, occurrenceIndex: assignment.occurrenceIndex, status, ... })` once (line 239, and again for the partial/absent/over path at lines 243-250). Replace the single-assignment resolution with a loop over `assignmentsForStudent(studentId)` (from Step 5), and inside the loop, for each `assignment`, run the exact same status-derivation logic that exists today (حاضر/غائب from `overrides[studentId].attendanceStatus`, completed-point from `completedPointFor(studentId, assignment)` using the composite key from Step 6) and call:
```ts
recordOccurrence.mutate({
  planId: linkedPlan._id, studentId, type: assignment.type,
  occurrenceIndex: assignment.occurrenceIndex, status,
  ...(status !== 'absent' ? { completedThroughSurah, completedThroughAyah } : {}),
});
```
once per loop iteration — a single-type day (today's only case) now runs the loop body exactly once, identically to today's single call. `bulkEvaluate.mutate` (the attendance/score record) stays a single call per student per `saveStudent` invocation, unchanged — only occurrence recording loops.

- [ ] **Step 9: Typecheck and lint**

Run: `cd quran-hifz-mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Run the existing mobile test suite**

Run: `cd quran-hifz-mobile && npx jest`
Expected: PASS (no test in this repo currently covers `EvaluationRoster.tsx`/`DaySlider.tsx` directly per the anatomy scan, so this mainly guards `quranRange.test.ts` from Task 1 regressing).

- [ ] **Step 11: Manual verification**

Repeat Task 11 Step 9's verification on the mobile teacher attendance screen (device/simulator), including confirming `renderExtra`'s call sites (if any pass a second arg today) still render correctly after Step 7's change.

- [ ] **Step 12: Commit**

```bash
git add quran-hifz-mobile/components/domain/DaySlider.tsx quran-hifz-mobile/components/domain/EvaluationRoster.tsx
git commit -m "feat: record حفظ and مراجعة wards independently when both are due the same day (mobile attendance)"
```

---

## Task 14: End-to-end manual verification across all three apps

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Create an overlapping-days plan**

Via the web teacher portal (post-Task 6), create a `QuranPlan` targeting a real halqa with two segments: حفظ on السبت/الاثنين/الأربعاء and مراجعة on **the same three days plus الخميس**, `endType: 'activeDays'`, `activeDaysCount: 6`. Save, then "توليد التوزيع" (generate/freeze schedule).

- [ ] **Step 2: Confirm server-side counts**

Query the plan via `GET /api/quran-plans/:id` and confirm (per Task 3's corrected `segmentOccurrenceCounts` semantics): the number of distinct calendar days elapsed for `activeDaysCount: 6` matches expectations, and both segments' `schedule` arrays include entries on the three fully-shared weekdays while مراجعة alone additionally covers الخميس.

- [ ] **Step 3: Confirm the teacher attendance screen (web)**

Open "الحضور والتقييم" for one of the three shared days. Confirm every enrolled student shows two "وصل إلى" pickers (حفظ and مراجعة), each bounded to its own segment's range (per bug-319's `bounds` behavior, now applied per-type). Mark one student's حفظ ward "الورد كامل" and their مراجعة ward "partial" (pick a point short of the assigned end), save, and confirm via `GET /api/quran-plans/:id/students/:studentId/progress` that exactly two occurrences were updated (one `status: 'done'`, one `status: 'partial'` with the given `completedThroughSurah/Ayah`), and that the مراجعة shortfall reflowed only onto that student's **other مراجعة** days (not their حفظ days) — check `effectiveSchedule` entries with `type: 'مراجعة'` and `occurrenceIndex` greater than the recorded one show a shrunk/redistributed range, while the `type: 'حفظ'` entries are untouched.

- [ ] **Step 4: Confirm attendance stayed singular**

Confirm exactly one `Attendance` record and one `Evaluation` record exist for that student/date (query `GET /api/attendance` and `GET /api/evaluations` filtered by student+date) — not two, despite two occurrences having been recorded.

- [ ] **Step 5: Repeat Step 3 on mobile and on the special-track teacher drill-down (web)**

Confirm the same dual-picker behavior and reflow isolation on `quran-hifz-mobile`'s teacher attendance screen (Task 13's target) and on `TeacherTrackDetail.tsx` (Task 12's target, using a special track linked to a plan built the same way as Step 1).

- [ ] **Step 6: Regression check on a normal (non-overlapping) plan**

Open the attendance/completion flow on an existing single-type-per-day plan (any plan from before this feature) on web, web track-detail, and mobile. Confirm the screen looks and behaves exactly as before — one ward block per student, one save call, no visible "type" clutter beyond what Tasks 8-10 intentionally added to read-only banners/tables.

- [ ] **Step 7: Report findings**

If any step surfaces a discrepancy, fix it in the relevant task's file before considering this plan complete — do not proceed to a final commit/PR with a known-broken verification step.
