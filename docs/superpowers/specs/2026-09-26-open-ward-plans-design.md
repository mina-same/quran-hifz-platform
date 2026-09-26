# Open-ward plans (خطة بدون مقطع محدد) — design

**Date:** 2026-09-26
**Status:** approved in chat, pending written-spec review

## Problem

Every Quran plan today has a fixed range per type (حفظ / مراجعة / ختمة): a
`rangeStart → rangeEnd` stretch of the mushaf that the server slices into a
day-by-day ward. Some halaqat do not work that way: the student memorizes at
their own pace, and in class the teacher simply asks "what did you memorize
today, from where to where?", writes it down, and grades it.

## Goal

A plan-level option **«بدون مقطع محدد»**. When chosen at creation:

- The plan keeps everything else unchanged: types (حفظ and/or مراجعة),
  weekdays, start date, end (active days or date), holidays, grading rubric,
  points, target (track or students).
- There is no range and no daily slice.
- On every due day, for every present student and every type due that day,
  the teacher records the actual range memorized (surah:ayah → surah:ayah) or
  marks «لم يُسمِّع اليوم». Grading uses the plan's rubric exactly as today.

## Decisions (from the user)

| Question | Answer |
|---|---|
| Scope of the option | The whole plan (not per segment). |
| Is recording the range mandatory for a present student? | Yes — a range, or an explicit «لم يُسمِّع اليوم». Saving is blocked otherwise. |
| Who records | Teacher (and admin, who shares the teacher screens). Students only view. |
| Range validation | Anywhere in the mushaf; `from` must not be after `to`; ayah must exist in its surah. |

Further decisions made in the design:

- **ختمة is not allowed** on an open-ward plan (a ختمة is by definition a fixed range).
- **Absent student:** no ward entry is written; the evaluation already records the absence.
- **Duplicate range:** a non-blocking warning if the same student already has an entry that overlaps the new range for the same type.
- **Re-saving a day** overwrites that day's entry (upsert).
- **`openWard` is immutable after creation.** Converting fixed ↔ open would orphan either the frozen schedule / per-student overlays or the logged entries. The update endpoint rejects any attempt to change it.

## Data model (server)

### `QuranPlan`

- New field `openWard: boolean`, default `false`.
- `planSegmentSchema.rangeStart` / `rangeEnd` become **not required at the
  schema level**. The controller enforces: required when `openWard` is false,
  forbidden when it is true.
- `schedule` stays on the segment but is never frozen for an open plan.

### New model `OpenWardEntry` (`models/OpenWardEntry.model.ts`)

```ts
{
  plan:       ObjectId → QuranPlan  (required)
  student:    ObjectId → Student    (required)
  type:       'حفظ' | 'مراجعة'      (required)
  date:       string 'YYYY-MM-DD'   (required — a calendar day, same reason as plan.holidays)
  status:     'recorded' | 'none'   (required; 'none' = «لم يُسمِّع اليوم»)
  from?:      { surahNumber, ayah } (required when status = 'recorded')
  to?:        { surahNumber, ayah } (required when status = 'recorded')
  pageStart?, pageEnd?, pages?, ayahs?: number  (derived server-side on save)
  recordedBy: ObjectId → User
  timestamps
}
unique index { plan, student, type, date }
index        { student, date: -1 }
```

`from` is stored ≤ `to` in mushaf order (validated, not auto-swapped).

## API (server)

All under the existing `quran-plan.routes.ts`, behind `authenticate`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| `PUT` | `/quran-plans/:id/students/:studentId/open-ward` | teacher, admin | Upsert one day's entry. Body: `{ type, date, status, from?, to? }`. |
| `GET` | `/quran-plans/:id/open-ward?student=&from=&to=` | any authenticated | List entries for the plan (optionally one student / a date window), sorted by date desc. |
| `DELETE` | `/quran-plans/:id/students/:studentId/open-ward?type=&date=` | teacher, admin | Remove a mistaken entry. |

Upsert validation (zod + controller):

- the plan exists and `openWard === true`, else 400 «هذه الخطة ليست بدون مقطع محدد»;
- the student is covered by the plan (`isStudentInPlan`);
- `type` is one of the plan's segment types;
- `date` matches `YYYY-MM-DD` and is not in the future;
- for `recorded`: both points present, ayah ≤ surah's `ayahCount`, `toFlatIndex(from) ≤ toFlatIndex(to)`;
- the response includes `overlapWarning: boolean` (another entry for this student and type overlaps the range).

Changes to existing endpoints:

- `quranPlanSchema`: add `openWard: z.boolean().optional()`; the segment
  schema's `rangeStart` / `rangeEnd` become `.optional()`. The create
  `superRefine` requires ranges when not open, forbids ranges and `ختمة` when
  open.
- `updatePlan`: reject a body whose `openWard` differs from the stored value;
  apply the same open/fixed segment rules to incoming `segments`.
- `withPlanComputed`: for an open plan each segment exposes
  `rangeStart/rangeEnd: null`, `pageRange: null`, `juzProgress: null`,
  `todayAssignment: { type, open: true } | null` (non-null only on a due day),
  and `schedule` = date-only entries `{ occurrenceIndex, date, type, open: true }`
  built by a new `computeOpenScheduleDates()` in `lib/quranRange.ts` (same
  weekday / holiday / end-window walk as `computeScheduleBreakdown`, no slice
  or page truncation). Plan-level day `progress` keeps working from those dates.
  The plan-level `pageRange` / `juzProgress` rollups become `null`.
- `generateSchedule`, `updateScheduleEntry`, and every
  `student-plan-progress` write route (`record`, schedule edit, `reflow`,
  `init`) return 400 for an open plan. `getStudentProgress` returns
  `{ effectiveSchedule: [], progressIsPersisted: false, overflowPages: 0, openWard: true }`.
- `deletePlan` also deletes the plan's `OpenWardEntry` documents.

## Clients (web `quran-hifz` + mobile `quran-hifz-mobile`, kept in parity)

Types: `QuranPlan.openWard`, nullable segment ranges, `OpenWardEntry`, and
`ScheduleEntry` gaining an optional `open` flag, in `api/quran-plans.ts` (web)
and `lib/queries/quranPlan.ts` (mobile). New hooks `useOpenWardEntries(planId, filters)`,
`useUpsertOpenWard()`, `useDeleteOpenWard()`.

| Screen (web / mobile) | Change |
|---|---|
| `TeacherPlanForm.tsx` / `teacher/plan-form.tsx` | Toggle «بدون مقطع محدد — يُسجَّل ما حفظه الطالب يومياً» at the top, create-mode only (shown read-only on edit). When on: hide ختمة, hide each segment's من/إلى, range summary and reverse note; preview shows dates + type only; submit sends no ranges. |
| `TeacherPlans.tsx` / `teacher/plans.tsx` | «ورد حر» badge; range lines replaced by «يُسجَّل ما حفظه الطالب في الحلقة»; juz' progress hidden, day progress kept. |
| `TeacherPlanDetail.tsx` / `teacher/plan-detail.tsx` | Schedule table replaced by a log table (date, student, type, من, إلى, pages) from `useOpenWardEntries`, newest first; «لم يُسمِّع» rows shown muted. Mobile: log as a bottom sheet of compact cards (per the mobile no-wide-table rule). |
| `TeacherAttendance.tsx`, `TeacherTrackDetail.tsx` / `teacher/attendance.tsx`, `EvaluationRoster.tsx`, `TrackDetail.tsx` | For an open plan, for each present student × each type due on the selected date: an unbounded من/إلى `CompactSurahAyah` pair (prefilled from that student's latest entry's `to` + 1 ayah for convenience) and a «لم يُسمِّع اليوم» toggle. Save blocked with a message until each is filled or toggled. After the evaluation save succeeds, one upsert per type; overlap warning shown as a toast. Absent students skip the ward. Existing entries for the date load back into the pickers. |
| `IndividualPlanPanel.tsx` (both) | For an open plan: that student's log (same columns) instead of the per-student schedule overlay; no reflow / edit controls. |
| `StudentReportPanel.tsx` (both) | For an open plan, juz' coverage and page totals come from the student's `recorded` entries (union of flat-index ranges), not the plan range. |
| `StudentTracks.tsx`, `AdminTracks.tsx`, `TeacherTracks.tsx` / `student/tracks.tsx`, `admin/tracks.tsx` | Where today's ward is shown: «ورد حر — يُسجَّل في الحلقة» instead of من/إلى. |

Shared helpers added to each client's `quranRange.ts`: `isOpenPlan(plan)`,
`typesDueOn(plan, dateISO)` (from the date-only schedule), and
`coveredFlatRanges(entries)` for the report.

All UI text in Modern Standard Arabic. Digit convention follows each sibling file.

## Error handling

- Server: `AppError` with Arabic messages as above; zod errors flow through the existing error middleware.
- Client: save-blocking validation happens before `bulkEvaluate`; a failed upsert after a successful evaluation save shows an error toast naming the student and type, and leaves the pickers populated so the teacher can retry.

## Testing

- Server has no test runner: verify with a throwaway `src/_verify_open_ward.ts`
  script (deleted after, existing convention) for `computeOpenScheduleDates`
  and the upsert validation, plus `npm run build` (tsc).
- Mobile: extend `lib/quranRange.test.ts` for `typesDueOn` and `coveredFlatRanges`.
- Web: `tsc` / build.
- Manual end-to-end: create an open plan → record حفظ + مراجعة for two
  students on a shared weekday → see them in plan detail, individual panel
  and report, on web and mobile.

## Out of scope

- Student self-reporting.
- Converting an existing plan between fixed and open.
- Auto-suggesting the next range beyond the "continue from last `to`" prefill.
