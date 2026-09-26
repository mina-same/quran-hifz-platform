# Open-ward Plans (خطة بدون مقطع محدد) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher create a plan with no fixed range, where each class they record what the student actually memorized (surah:ayah → surah:ayah) and grade it as usual, on server, web and mobile.

**Architecture:** A plan-level `openWard` flag on `QuranPlan` makes segment ranges optional and turns the computed schedule into date-only entries. A new `OpenWardEntry` collection (one doc per plan × student × type × date) stores what was recorded, behind three new routes on the quran-plans router. Both clients branch on `plan.openWard` in the plan form, plan list/detail, attendance/grading, individual panel, report and track cards.

**Tech Stack:** Express + Mongoose + zod (server, TypeScript, no test runner), Vite + React + TanStack Query (web), Expo / React Native + TanStack Query + jest (mobile).

**Spec:** `docs/superpowers/specs/2026-09-26-open-ward-plans-design.md`

## Global Constraints

- All UI text is Modern Standard Arabic (فصحى), never colloquial.
- Digits: match the sibling file's convention (web `toAr()` where the file already uses it; mobile API-backed screens use Western digits).
- `PlanType` stays `'حفظ' | 'مراجعة' | 'ختمة'`; open-ward plans only allow `حفظ` and `مراجعة`.
- Dates for open-ward entries are `YYYY-MM-DD` strings (calendar days), never `Date` objects.
- Never spread a Mongoose subdocument directly; call `.toObject()` on the parent first (cerebrum Do-Not-Repeat).
- `openWard` is immutable after creation.
- Mobile: no wide tables. Logs go in a bottom sheet of compact cards (pattern: `components/domain/ScheduleSheet.tsx`).
- Web ↔ mobile parity: every web screen change has a matching mobile change.
- Roles: writes are `authorize('teacher', 'admin')`; reads are any authenticated user.

## Review Focus

1. **Plan whose due-day list is empty on the selected date** (off day / holiday): the attendance screen must not demand a ward. Pinned by the `typesDueOn` tests (Tasks 5 and 10).
2. **A range where from > to, or an ayah past the surah's end**: the server must reject it with an Arabic 400, even if a client lets it through. Pinned by the verify script in Task 2.
3. **An open plan reaching the old fixed-range code paths** (reflow `record`, `generateSchedule`, `IndividualPlanPanel` edit controls): these must return 400 or hide, never 500 on a `null` range. Pinned by the verify script in Task 4.
4. **Re-saving the same student/day/type twice**: the second save must update, not duplicate (unique index plus upsert). Pinned by the verify script in Task 2.
5. **Timezone drift on the date-only schedule** (a UTC+ server shifting a day back): open schedule dates are built from the local calendar key, not `toISOString()` of local midnight. Pinned by the verify script in Task 1.

---

## File Map

**Server (`quran-hifz-server/src`)**
- Modify `lib/quranRange.ts`: add `computeOpenScheduleDates`, export `dateKey`; `PlanSegmentInput` ranges become optional.
- Modify `models/QuranPlan.model.ts`: `openWard` field; segment ranges not required.
- Create `models/OpenWardEntry.model.ts`.
- Create `controllers/open-ward.controller.ts`.
- Modify `routes/quran-plan.routes.ts`: three routes.
- Modify `controllers/quran-plan.controller.ts`: schema, refine, update guard, `withPlanComputed` open branch, generate/edit guard, delete cascade.
- Modify `controllers/student-plan-progress.controller.ts`: open-plan guards.

**Web (`quran-hifz/src/quran`)**
- Modify `lib/quranRange.ts`: `typesDueOn`, `coveredFlatRanges`, `nextPointAfter`.
- Modify `api/quran-plans.ts`: types plus `isOpenPlan`.
- Create `api/open-ward.ts`: hooks.
- Create `components/common/OpenWardLog.tsx`: log table.
- Create `components/common/OpenWardPicker.tsx`: من/إلى + «لم يُسمِّع».
- Modify `pages/teacher/TeacherPlanForm.tsx`, `TeacherPlans.tsx`, `TeacherPlanDetail.tsx`, `TeacherAttendance.tsx`, `TeacherTrackDetail.tsx`, `TeacherTracks.tsx`, `pages/student/StudentTracks.tsx`, `pages/admin/AdminTracks.tsx`, `components/common/IndividualPlanPanel.tsx`, `components/common/StudentReportPanel.tsx`.

**Mobile (`quran-hifz-mobile`)**
- Modify `lib/quranRange.ts` plus `lib/quranRange.test.ts`: the same three helpers, with tests.
- Modify `lib/queries/quranPlan.ts`: types, `isOpenPlan`, hooks.
- Create `components/domain/OpenWardLogSheet.tsx`, `components/domain/OpenWardPicker.tsx`.
- Modify `app/(portal)/teacher/plan-form.tsx`, `plans.tsx`, `plan-detail.tsx`, `attendance.tsx`, `components/domain/EvaluationRoster.tsx`, `TrackDetail.tsx`, `IndividualPlanPanel.tsx`, `StudentReportPanel.tsx`, `app/(portal)/student/tracks.tsx`, `app/(portal)/admin/tracks.tsx`.

---

### Task 1: Server — date-only schedule for open plans

**Files:**
- Modify: `quran-hifz-server/src/lib/quranRange.ts`
- Test: `quran-hifz-server/src/_verify_open_ward.ts` (throwaway; deleted in Task 15)

**Interfaces:**
- Produces: `export function dateKey(d: Date): string` (was private); `export type OpenScheduleEntry = { occurrenceIndex: number; date: string; type: PlanType; open: true }`; `export function computeOpenScheduleDates(plan: MultiPlanInput): OpenScheduleEntry[]`. `PlanSegmentInput.rangeStart/rangeEnd` become optional (`RangePoint | undefined`).

- [ ] **Step 1: Write the failing verify script**

```ts
// src/_verify_open_ward.ts — throwaway, run with: npx ts-node src/_verify_open_ward.ts
import assert from 'node:assert/strict';
import { computeOpenScheduleDates } from './lib/quranRange';

// 2026-09-26 is a Saturday (السبت).
const plan = {
  startDate: new Date(2026, 8, 26),
  endType: 'activeDays' as const,
  activeDaysCount: 3,
  holidays: ['2026-09-27'],
  segments: [
    { type: 'حفظ' as const,    days: ['السبت', 'الأحد', 'الاثنين'] },
    { type: 'مراجعة' as const, days: ['الاثنين'] },
  ],
};
const out = computeOpenScheduleDates(plan);
// Sat 26 (حفظ), Sun 27 holiday, Mon 28 (حفظ + مراجعة), Sat Oct 3 (حفظ) → 3 active days
assert.deepEqual(out.map((e) => `${e.date.slice(0, 10)} ${e.type} ${e.occurrenceIndex}`), [
  '2026-09-26 حفظ 1',
  '2026-09-28 حفظ 2',
  '2026-09-28 مراجعة 1',
  '2026-10-03 حفظ 3',
]);
assert.ok(out.every((e) => e.open === true));
// Timezone guard: the date string must carry the LOCAL calendar day.
assert.equal(out[0].date, '2026-09-26T00:00:00.000Z');
console.log('Task 1 OK');
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd quran-hifz-server && npx ts-node src/_verify_open_ward.ts`
Expected: a compile error: `computeOpenScheduleDates` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/quranRange.ts`:
- Change `function dateKey(` to `export function dateKey(`.
- Make the ranges in `PlanSegmentInput` optional:

```ts
export type PlanSegmentInput = {
  type: PlanType;
  days: string[];
  /** Absent on an open-ward plan (`QuranPlan.openWard`). */
  rangeStart?: RangePoint;
  rangeEnd?: RangePoint;
};
```

- In `segmentAsScheduleInput`, `computeMultiScheduleBreakdown` and `computeMultiTodayAssignments`, skip segments without a range: add `if (!seg.rangeStart || !seg.rangeEnd) continue;` at the top of each loop body. In `segmentAsScheduleInput`, use `rangeStart: seg.rangeStart!, rangeEnd: seg.rangeEnd!`; callers now guarantee both are set.
- Append:

```ts
export type OpenScheduleEntry = { occurrenceIndex: number; date: string; type: PlanType; open: true };

/**
 * An open-ward plan's calendar: which types are due on which days, with no
 * slice. Uses the same shared window and weekday/holiday rules as
 * computeMultiScheduleBreakdown, so day progress counts identically.
 *
 * `date` is the LOCAL calendar key suffixed with a UTC midnight, never
 * `toISOString()` of local midnight — that shifts a day back on any UTC+ host,
 * and every client reads the day as `date.slice(0, 10)`.
 */
export function computeOpenScheduleDates(plan: MultiPlanInput): OpenScheduleEntry[] {
  const counts = segmentOccurrenceCounts(plan);
  const holidays = plan.holidays && plan.holidays.length > 0 ? new Set(plan.holidays) : NO_HOLIDAYS;
  const out: OpenScheduleEntry[] = [];
  for (const seg of plan.segments) {
    const target = counts.get(seg.type) ?? 0;
    const cursor = dateOnly(plan.startDate);
    let n = 0;
    let walked = 0;
    while (n < target && walked < SCHEDULE_WALK_LIMIT_DAYS) {
      if (isOccurrenceDay(cursor, seg.days, holidays)) {
        n++;
        out.push({ occurrenceIndex: n, date: `${dateKey(cursor)}T00:00:00.000Z`, type: seg.type, open: true });
      }
      cursor.setDate(cursor.getDate() + 1);
      walked++;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}
```

- [ ] **Step 4: Run the script and the build**

Run: `npx ts-node src/_verify_open_ward.ts && npm run build`
Expected: `Task 1 OK`, and tsc exits 0. If tsc flags `seg.rangeStart` possibly undefined in `quran-plan.controller.ts` or `studentPlanReflow.ts`, add a `!` there for now; Task 3 replaces those call sites.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-server/src/lib/quranRange.ts
git commit -m "feat(server): date-only schedule for open-ward plans"
```

---

### Task 2: Server — OpenWardEntry model, controller, routes

**Files:**
- Modify: `quran-hifz-server/src/models/QuranPlan.model.ts`
- Create: `quran-hifz-server/src/models/OpenWardEntry.model.ts`
- Create: `quran-hifz-server/src/controllers/open-ward.controller.ts`
- Modify: `quran-hifz-server/src/routes/quran-plan.routes.ts`
- Test: `quran-hifz-server/src/_verify_open_ward.ts` (extend)

**Interfaces:**
- Consumes: `toFlatIndex`, `pageRangeOfAyahRange`, `countRangeAyahs` from `lib/quranRange`; `isStudentInPlan` from `lib/planStudents`.
- Produces:
  - `IQuranPlan.openWard: boolean`.
  - `OpenWardEntry` model.
  - `export function validateOpenWardBody(body: unknown, plan: { openWard: boolean; segmentTypes: string[] }, today: string): OpenWardBody` (pure; throws `AppError`).
  - Handlers `upsertOpenWard`, `listOpenWard`, `deleteOpenWard`.
  - Wire shape of an entry: `{ _id, plan, student: {_id,name} | string, type, date, status, from?, to?, pageStart?, pageEnd?, pages?, ayahs?, recordedBy, createdAt, updatedAt }`.
  - Upsert response: `{ success: true, data: entry, overlapWarning: boolean }`.

- [ ] **Step 1: Extend the verify script (failing)**

Append to `src/_verify_open_ward.ts`:

```ts
import { validateOpenWardBody } from './controllers/open-ward.controller';

const planInfo = { openWard: true, segmentTypes: ['حفظ', 'مراجعة'] };
const today = '2026-09-26';
const ok = validateOpenWardBody(
  { type: 'حفظ', date: '2026-09-26', status: 'recorded', from: { surahNumber: 2, ayah: 1 }, to: { surahNumber: 2, ayah: 20 } },
  planInfo, today,
);
assert.equal(ok.status, 'recorded');
const bad = (body: unknown, msg: RegExp, info = planInfo) =>
  assert.throws(() => validateOpenWardBody(body, info, today), msg);
bad({ type: 'حفظ', date: '2026-09-26', status: 'recorded', from: { surahNumber: 2, ayah: 20 }, to: { surahNumber: 2, ayah: 1 } }, /قبل/);
bad({ type: 'حفظ', date: '2026-09-26', status: 'recorded', from: { surahNumber: 1, ayah: 1 }, to: { surahNumber: 1, ayah: 9 } }, /7 آية/);
bad({ type: 'حفظ', date: '2026-09-27', status: 'none' }, /المستقبل/);
// A type the plan doesn't have (ختمة never reaches here — the zod enum rejects it first).
bad({ type: 'مراجعة', date: '2026-09-26', status: 'none' }, /ليس ضمن/, { openWard: true, segmentTypes: ['حفظ'] });
bad({ type: 'حفظ', date: '2026-09-26', status: 'none' }, /ليست بدون مقطع/, { openWard: false, segmentTypes: ['حفظ'] });
bad({ type: 'حفظ', date: '2026-09-26', status: 'recorded' }, /من.*إلى/);
const none = validateOpenWardBody({ type: 'مراجعة', date: '2026-09-25', status: 'none', from: { surahNumber: 2, ayah: 1 } }, planInfo, today);
assert.equal(none.from, undefined); // stripped for 'none'
console.log('Task 2 OK');
```

Run: `npx ts-node src/_verify_open_ward.ts`. Expected: FAIL, the module is not found.

- [ ] **Step 2: Update the QuranPlan model**

In `models/QuranPlan.model.ts`:
- Add to `IQuranPlan`, after `segments`:

```ts
  /** No fixed range: the teacher records each day what the student actually
   * memorized (OpenWardEntry). Immutable after creation. */
  openWard: boolean;
```

- Make `IPlanSegment.rangeStart/rangeEnd` optional (`rangeStart?: IRangePoint; rangeEnd?: IRangePoint;`), and in `planSegmentSchema` change both to `{ type: rangePointSchema, required: false }`, with the comment `// Required unless the plan is openWard — enforced in quran-plan.controller.ts.`
- In `quranPlanSchema` add `openWard: { type: Boolean, default: false },` after `segments`.

- [ ] **Step 3: Create the model**

`src/models/OpenWardEntry.model.ts`:

```ts
import { Schema, model, Document, Types } from 'mongoose';

export type OpenWardType = 'حفظ' | 'مراجعة';
export type OpenWardStatus = 'recorded' | 'none';

export interface IOpenWardPoint { surahNumber: number; ayah: number }

/**
 * What a student actually memorized on one day of an open-ward plan
 * (QuranPlan.openWard). One document per (plan, student, type, date); re-saving
 * the day overwrites it. `status: 'none'` is the teacher's explicit
 * «لم يُسمِّع اليوم» — distinct from "not recorded yet" (no document).
 */
export interface IOpenWardEntry extends Document {
  plan: Types.ObjectId;
  student: Types.ObjectId;
  type: OpenWardType;
  /** Calendar day YYYY-MM-DD — a string for the same reason as QuranPlan.holidays. */
  date: string;
  status: OpenWardStatus;
  from?: IOpenWardPoint;
  to?: IOpenWardPoint;
  pageStart?: number;
  pageEnd?: number;
  pages?: number;
  ayahs?: number;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema<IOpenWardPoint>(
  {
    surahNumber: { type: Number, required: true, min: 1, max: 114 },
    ayah:        { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const openWardEntrySchema = new Schema<IOpenWardEntry>(
  {
    plan:       { type: Schema.Types.ObjectId, ref: 'QuranPlan', required: true },
    student:    { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    type:       { type: String, enum: ['حفظ', 'مراجعة'], required: true },
    date:       { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status:     { type: String, enum: ['recorded', 'none'], required: true },
    from:       { type: pointSchema },
    to:         { type: pointSchema },
    pageStart:  { type: Number },
    pageEnd:    { type: Number },
    pages:      { type: Number },
    ayahs:      { type: Number },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

openWardEntrySchema.index({ plan: 1, student: 1, type: 1, date: 1 }, { unique: true });
openWardEntrySchema.index({ student: 1, date: -1 });

export const OpenWardEntry = model<IOpenWardEntry>('OpenWardEntry', openWardEntrySchema);
```

- [ ] **Step 4: Create the controller**

`src/controllers/open-ward.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuranPlan } from '../models/QuranPlan.model';
import { OpenWardEntry } from '../models/OpenWardEntry.model';
import { AppError } from '../middleware/error';
import { SURAHS } from '../data/surahs';
import { isStudentInPlan } from '../lib/planStudents';
import { toFlatIndex, pageRangeOfAyahRange, countRangeAyahs, dateKey } from '../lib/quranRange';

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

const pointSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayah:        z.number().int().min(1),
});

const openWardSchema = z.object({
  type:   z.enum(['حفظ', 'مراجعة']),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح'),
  status: z.enum(['recorded', 'none']),
  from:   pointSchema.optional(),
  to:     pointSchema.optional(),
});

export type OpenWardBody = z.infer<typeof openWardSchema>;

/** Pure validation — exported for src/_verify_open_ward.ts. */
export function validateOpenWardBody(
  body: unknown,
  plan: { openWard: boolean; segmentTypes: string[] },
  today: string,
): OpenWardBody {
  if (!plan.openWard) throw new AppError('هذه الخطة ليست بدون مقطع محدد', 400);
  const data = openWardSchema.parse(body);
  if (!plan.segmentTypes.includes(data.type)) {
    throw new AppError(`النوع "${data.type}" ليس ضمن أنواع هذه الخطة`, 400);
  }
  if (data.date > today) throw new AppError('لا يمكن التسجيل ليوم في المستقبل', 400);

  if (data.status === 'none') return { type: data.type, date: data.date, status: 'none' };

  if (!data.from || !data.to) throw new AppError('يجب تحديد من أين وإلى أين حفظ الطالب', 400);
  for (const p of [data.from, data.to]) {
    const surah = SURAH_BY_NUMBER.get(p.surahNumber);
    if (surah && p.ayah > surah.ayahCount) {
      throw new AppError(`سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, 400);
    }
  }
  if (toFlatIndex(data.from) > toFlatIndex(data.to)) {
    throw new AppError('بداية المقطع يجب أن تكون قبل نهايته في ترتيب المصحف', 400);
  }
  return data;
}

async function loadOpenPlan(planId: string) {
  const plan = await QuranPlan.findById(planId);
  if (!plan) throw new AppError('الخطة غير موجودة', 404);
  return plan;
}

export async function upsertOpenWard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const plan = await loadOpenPlan(planId);
    const segmentTypes = plan.toObject().segments.map((s: { type: string }) => s.type);
    const data = validateOpenWardBody(req.body, { openWard: Boolean(plan.openWard), segmentTypes }, dateKey(new Date()));
    if (!(await isStudentInPlan(plan, studentId))) {
      throw new AppError('هذا الطالب غير مشمول بهذه الخطة', 404);
    }

    const derived = data.status === 'recorded'
      ? (() => {
          const pr = pageRangeOfAyahRange(data.from!, data.to!);
          return { pageStart: pr.pageStart, pageEnd: pr.pageEnd, pages: pr.pageCount, ayahs: countRangeAyahs(data.from!, data.to!) };
        })()
      : {};

    const key = { plan: planId, student: studentId, type: data.type, date: data.date };
    const update = data.status === 'recorded'
      ? { $set: { ...key, status: data.status, from: data.from, to: data.to, ...derived, recordedBy: req.user!.id } }
      : { $set: { ...key, status: data.status, recordedBy: req.user!.id },
          $unset: { from: 1, to: 1, pageStart: 1, pageEnd: 1, pages: 1, ayahs: 1 } };
    const entry = await OpenWardEntry.findOneAndUpdate(key, update, { upsert: true, new: true, runValidators: true });

    let overlapWarning = false;
    if (data.status === 'recorded') {
      const lo = toFlatIndex(data.from!);
      const hi = toFlatIndex(data.to!);
      const others = await OpenWardEntry.find({
        plan: planId, student: studentId, type: data.type, status: 'recorded', date: { $ne: data.date },
      }).lean();
      overlapWarning = others.some((o) =>
        o.from && o.to && toFlatIndex(o.from) <= hi && toFlatIndex(o.to) >= lo);
    }

    res.json({ success: true, data: entry, overlapWarning });
  } catch (err) {
    next(err);
  }
}

export async function listOpenWard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId } = req.params;
    const { student, from, to } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = { plan: planId };
    if (student) filter.student = student;
    if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const entries = await OpenWardEntry.find(filter)
      .populate('student', 'name')
      .sort({ date: -1, type: 1 });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function deleteOpenWard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const { type, date } = req.query as Record<string, string | undefined>;
    if (!type || !date) throw new AppError('يجب تحديد النوع والتاريخ', 400);
    const result = await OpenWardEntry.deleteOne({ plan: planId, student: studentId, type, date });
    if (result.deletedCount === 0) throw new AppError('لا يوجد تسجيل لهذا اليوم', 404);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
```

(If `AppError` is not exported from `../middleware/error` under that name, match the import used in `student-plan-progress.controller.ts`: it is `import { AppError } from '../middleware/error';`, so it is.)

- [ ] **Step 5: Register routes**

In `routes/quran-plan.routes.ts`, add the import and, before `export default router;`:

```ts
import { upsertOpenWard, listOpenWard, deleteOpenWard } from '../controllers/open-ward.controller';
// ...
// Open-ward plans (plan.openWard): what each student actually memorized per day.
router.get('/:id/open-ward',                             listOpenWard);
router.put('/:id/students/:studentId/open-ward',         authorize('teacher', 'admin'), upsertOpenWard);
router.delete('/:id/students/:studentId/open-ward',      authorize('teacher', 'admin'), deleteOpenWard);
```

- [ ] **Step 6: Verify**

Run: `npx ts-node src/_verify_open_ward.ts && npm run build`
Expected: `Task 1 OK`, `Task 2 OK`, and tsc exits 0.

Manual upsert/duplicate check (needs `npm run dev` and a teacher token in `$T`, plan id `$P`, student id `$S`):

```bash
for i in 1 2; do curl -s -X PUT localhost:5000/api/quran-plans/$P/students/$S/open-ward \
  -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"type":"حفظ","date":"2026-09-26","status":"recorded","from":{"surahNumber":2,"ayah":1},"to":{"surahNumber":2,"ayah":5}}'; echo; done
curl -s "localhost:5000/api/quran-plans/$P/open-ward?student=$S" -H "Authorization: Bearer $T" | grep -o '"count":[0-9]*'
```

Expected: `"count":1`.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-server/src/models quran-hifz-server/src/controllers/open-ward.controller.ts quran-hifz-server/src/routes/quran-plan.routes.ts
git commit -m "feat(server): OpenWardEntry model and open-ward routes"
```

---

### Task 3: Server — plan controller supports openWard

**Files:**
- Modify: `quran-hifz-server/src/controllers/quran-plan.controller.ts`

**Interfaces:**
- Consumes: `computeOpenScheduleDates`, `OpenScheduleEntry` (Task 1); `OpenWardEntry` (Task 2).
- Produces: plan wire shape additions: `openWard: boolean`. For open plans each segment has `rangeStart: null, rangeEnd: null, pageRange: null, juzProgress: null, todayAssignment: { type, open: true } | null, schedule: OpenScheduleEntry[]`; the plan-level `pageRange` and `juzProgress` are `null`; `todayAssignments` holds `{ type, open: true }` items.

- [ ] **Step 1: Schema**

Replace `planSegmentSchema` and add `openWard` to `quranPlanSchema`:

```ts
const planSegmentSchema = z.object({
  type:       z.enum(['حفظ', 'مراجعة', 'ختمة']),
  days:       z.array(z.enum(WEEK_DAYS)).min(1),
  // Required unless the plan is openWard — enforced by checkSegmentRanges().
  rangeStart: rangePointSchema.optional(),
  rangeEnd:   rangePointSchema.optional(),
});
```

In `quranPlanSchema`, after `segments`: `openWard: z.boolean().optional(),`

- [ ] **Step 2: Shared range rule**

Above `quranPlanCreateSchema`, add:

```ts
type SegmentBody = z.infer<typeof planSegmentSchema>;

/** Open plans carry no range and no ختمة; fixed plans need both points. */
function checkSegmentRanges(segments: SegmentBody[], openWard: boolean): string | null {
  for (const seg of segments) {
    if (openWard) {
      if (seg.type === 'ختمة') return 'لا يمكن استخدام "ختمة" في خطة بدون مقطع محدد';
      if (seg.rangeStart || seg.rangeEnd) return 'الخطة بدون مقطع محدد لا تحتوي على بداية أو نهاية';
    } else if (!seg.rangeStart || !seg.rangeEnd) {
      return `حدد من أين وإلى أين لنوع "${seg.type}"`;
    }
  }
  return null;
}
```

In `quranPlanCreateSchema`'s `superRefine`, after the `validateSegmentDays` block:

```ts
  const rangeError = checkSegmentRanges(data.segments, data.openWard === true);
  if (rangeError) ctx.addIssue({ code: 'custom', message: rangeError, path: ['segments'] });
```

and change the per-point ayah loop to skip missing points: `for (const [key, point] of [['rangeStart', seg.rangeStart], ['rangeEnd', seg.rangeEnd]] as const) { if (!point) continue; ...`.

- [ ] **Step 3: updatePlan guards**

In `updatePlan`, after `if (!existing) ...`:

```ts
    if (data.openWard !== undefined && data.openWard !== Boolean(existing.openWard)) {
      throw new AppError('لا يمكن تغيير نوع الخطة (بمقطع / بدون مقطع) بعد إنشائها', 400);
    }
    if (data.segments) {
      const rangeError = checkSegmentRanges(data.segments, Boolean(existing.openWard));
      if (rangeError) throw new AppError(rangeError, 400);
    }
    delete (data as { openWard?: boolean }).openWard;
```

- [ ] **Step 4: withPlanComputed open branch**

At the top of `withPlanComputed`, right after `const segments = normalizePlanSegments(obj);` and the `window` const, insert an early return:

```ts
  if (obj.openWard) {
    const segmentInputs: PlanSegmentInput[] = segments.map((s) => ({ type: s.type, days: s.days }));
    const openSchedule = computeOpenScheduleDates({ ...window, segments: segmentInputs });
    const todayKey = dateKey(new Date());
    const shaped = segments.map((seg) => {
      const schedule = openSchedule.filter((e) => e.type === seg.type);
      const done = schedule.filter((e) => e.date.slice(0, 10) <= todayKey).length;
      return {
        type: seg.type,
        days: seg.days,
        rangeStart: null,
        rangeEnd: null,
        todayAssignment: schedule.some((e) => e.date.slice(0, 10) === todayKey)
          ? { type: seg.type, open: true as const } : null,
        progress: schedule.length > 0
          ? { completed: done, total: schedule.length, percent: Math.round((done / schedule.length) * 100) }
          : null,
        juzProgress: null,
        pageRange: null,
        schedule,
        scheduleIsPersisted: false,
      };
    });
    const todayAssignments = shaped.map((s) => s.todayAssignment).filter((a): a is NonNullable<typeof a> => a != null);
    const dates = Array.from(new Set(openSchedule.map((e) => e.date))).sort();
    const completedDays = dates.filter((d) => d.slice(0, 10) <= todayKey).length;
    return {
      ...obj,
      openWard: true,
      segments: shaped,
      types: shaped.map((s) => s.type),
      type: todayAssignments[0]?.type ?? shaped[0]?.type ?? plan.type,
      days: unionDays(segmentInputs),
      todayAssignment: todayAssignments[0] ?? null,
      todayAssignments,
      progress: dates.length > 0
        ? { completed: completedDays, total: dates.length, percent: Math.round((completedDays / dates.length) * 100) }
        : null,
      juzProgress: null,
      pageRange: null,
      schedule: openSchedule,
      scheduleIsPersisted: false,
    };
  }
```

Add `computeOpenScheduleDates, dateKey` to the existing `../lib/quranRange` import. In the fixed (non-open) path, change `rangeStart: s.rangeStart, rangeEnd: s.rangeEnd` to `rangeStart: s.rangeStart!, rangeEnd: s.rangeEnd!` where tsc requires it, and add `openWard: false,` to its returned object.

- [ ] **Step 5: Guard freeze/edit, cascade delete**

At the top of `generateSchedule` and `updateScheduleEntry`, right after the plan is loaded and null-checked:

```ts
    if (plan.openWard) throw new AppError('الخطة بدون مقطع محدد لا تحتوي على تقسيمة يومية', 400);
```

In `deletePlan`, after the plan is deleted, add `await OpenWardEntry.deleteMany({ plan: req.params.id });` (import `OpenWardEntry` from `../models/OpenWardEntry.model`).

- [ ] **Step 6: Verify**

Extend `src/_verify_open_ward.ts` with a schema check. Temporarily export `quranPlanCreateSchema` as `export const __test_createSchema = quranPlanCreateSchema;` at the bottom of the controller (remove it in Task 15):

```ts
import { __test_createSchema } from './controllers/quran-plan.controller';
const base = { name: 'x', teacher: 't', targetType: 'track', track: 'k', endType: 'activeDays', activeDaysCount: 5 };
assert.ok(__test_createSchema.safeParse({ ...base, openWard: true, segments: [{ type: 'حفظ', days: ['السبت'] }] }).success);
assert.ok(!__test_createSchema.safeParse({ ...base, openWard: true, segments: [{ type: 'ختمة', days: ['السبت'] }] }).success);
assert.ok(!__test_createSchema.safeParse({ ...base, segments: [{ type: 'حفظ', days: ['السبت'] }] }).success);
console.log('Task 3 OK');
```

Run: `npx ts-node src/_verify_open_ward.ts && npm run build`. Expected: Tasks 1–3 OK, tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz-server/src/controllers/quran-plan.controller.ts
git commit -m "feat(server): quran plans accept openWard, date-only computed shape"
```

---

### Task 4: Server — fixed-range progress routes refuse open plans

**Files:**
- Modify: `quran-hifz-server/src/controllers/student-plan-progress.controller.ts`
- Modify: `quran-hifz-server/src/lib/studentPlanReflow.ts` (only if tsc flags optional ranges)

**Interfaces:**
- Produces: `getStudentProgress` on an open plan → `{ effectiveSchedule: [], progressIsPersisted: false, overflowPages: 0, openWard: true }`; `record`/schedule edit/`reflow`/`init` → 400 `الخطة بدون مقطع محدد — سجّل ما حفظه الطالب من شاشة الحضور`.

- [ ] **Step 1: Add the guard helper**

```ts
const OPEN_WARD_REFUSAL = 'الخطة بدون مقطع محدد — سجّل ما حفظه الطالب من شاشة الحضور';

/** Exported for src/_verify_open_ward.ts. */
export function assertFixedPlan(plan: { openWard?: boolean }): void {
  if (plan.openWard) throw new AppError(OPEN_WARD_REFUSAL, 400);
}
```

- [ ] **Step 2: Apply it**

- In `getStudentProgress`, after `loadPlanAndValidateStudent`:

```ts
    if (plan.openWard) {
      res.json({ success: true, data: { effectiveSchedule: [], progressIsPersisted: false, overflowPages: 0, openWard: true } });
      return;
    }
```

- In `recordOccurrence`, `updateStudentScheduleEntry`, `initStudentProgress` and `reflowNow`: call `assertFixedPlan(plan);` right after the plan is loaded, **before** `getOrInitProgress` (which would otherwise call `initStudentOccurrences` on range-less segments).

- [ ] **Step 3: Verify**

Append to the verify script:

```ts
import { assertFixedPlan } from './controllers/student-plan-progress.controller';
assert.throws(() => assertFixedPlan({ openWard: true }), /بدون مقطع/);
assert.doesNotThrow(() => assertFixedPlan({ openWard: false }));
console.log('Task 4 OK');
```

Run: `npx ts-node src/_verify_open_ward.ts && npm run build`. Expected: OK and exit 0.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src
git commit -m "feat(server): per-student reflow routes refuse open-ward plans"
```

---

### Task 5: Web — types, helpers, hooks

**Files:**
- Modify: `quran-hifz/src/quran/lib/quranRange.ts`
- Modify: `quran-hifz/src/quran/api/quran-plans.ts`
- Create: `quran-hifz/src/quran/api/open-ward.ts`

**Interfaces:**
- Produces (web `lib/quranRange.ts`):
  - `typesDueOn(schedule: { date: string; type: PlanType }[], dateKey: string): PlanType[]`
  - `coveredFlatRanges(entries: { status: string; from?: RangePoint; to?: RangePoint }[]): [number, number][]` (merged, sorted, inclusive)
  - `nextPointAfter(p: RangePoint): RangePoint` (clamps at 114:6)
- Produces (`api/quran-plans.ts`): `QuranPlan.openWard: boolean`; `PlanSegment.rangeStart/rangeEnd: RangePoint | null`; `PlanSegment.pageRange: PageRange | null`; `OpenAssignment = { type: PlanType; open: true }`; `todayAssignment(s)` typed `(TodayAssignment & { type: PlanType }) | OpenAssignment`; `ScheduleEntry` gains `open?: true` with slice fields optional when open; `isOpenPlan(plan?: QuranPlan): boolean`; `isSlice(a): a is TodayAssignment & { type: PlanType }`.
- Produces (`api/open-ward.ts`): `OpenWardEntry` type; `useOpenWardEntries(planId?: string, filters?: { student?: string; from?: string; to?: string })`; `useUpsertOpenWard()` taking `{ planId, studentId, type, date, status, from?, to? }` and returning `{ data: OpenWardEntry; overlapWarning: boolean }`; `useDeleteOpenWard()` taking `{ planId, studentId, type, date }`.

- [ ] **Step 1: Helpers** (append to `lib/quranRange.ts`)

```ts
/** Types due on a calendar day, read from a plan's (open or fixed) schedule. */
export function typesDueOn(schedule: { date: string; type: PlanType }[], dateKey: string): PlanType[] {
  return Array.from(new Set(schedule.filter((e) => String(e.date).slice(0, 10) === dateKey).map((e) => e.type)));
}

/** Union of recorded open-ward ranges as merged inclusive flat-index spans. */
export function coveredFlatRanges(
  entries: { status: string; from?: RangePoint; to?: RangePoint }[],
): [number, number][] {
  const spans = entries
    .filter((e) => e.status === "recorded" && e.from && e.to)
    .map((e) => [toFlatIndex(e.from!), toFlatIndex(e.to!)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [lo, hi] of spans) {
    const last = out[out.length - 1];
    if (last && lo <= last[1] + 1) last[1] = Math.max(last[1], hi);
    else out.push([lo, hi]);
  }
  return out;
}

/** The ayah right after `p` — the natural "من" for the next open-ward day. */
export function nextPointAfter(p: RangePoint): RangePoint {
  const last = toFlatIndex({ surahNumber: 114, ayah: 6 });
  return fromFlatIndex(Math.min(last, toFlatIndex(p) + 1));
}
```

- [ ] **Step 2: Plan types** (`api/quran-plans.ts`)

- Add `openWard: boolean;` to `QuranPlan` with the doc comment `/** No fixed range — see api/open-ward.ts. Immutable after creation. */`.
- Add `export type OpenAssignment = { type: PlanType; open: true };`.
- Change `PlanSegment` to `rangeStart: RangePoint | null; rangeEnd: RangePoint | null; pageRange: PageRange | null; todayAssignment: (TodayAssignment & { type: PlanType }) | OpenAssignment | null;` and the same union for `QuranPlan.todayAssignment` / `todayAssignments`.
- Change `ScheduleEntry` to `TodayAssignment & { occurrenceIndex: number; date: string; juz: number; open?: undefined } | ({ occurrenceIndex: number; date: string; open: true } & Partial<TodayAssignment> & { juz?: number })`.
- Add:

```ts
export function isOpenPlan(plan?: QuranPlan | null): boolean {
  return Boolean(plan?.openWard);
}
export function isSlice<T extends { open?: true }>(a: T | null | undefined): a is Exclude<T, { open: true }> {
  return Boolean(a) && !(a as { open?: true }).open;
}
```

- In `segmentReversed`, return `false` when `!seg.rangeStart || !seg.rangeEnd`.

- [ ] **Step 3: Hooks** (create `api/open-ward.ts`)

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, del } from "../../lib/api";
import type { PlanType, RangePoint } from "./quran-plans";

export type OpenWardStatus = "recorded" | "none";
export type OpenWardEntry = {
  _id: string;
  plan: string;
  student: { _id: string; name: string } | string;
  type: Exclude<PlanType, "ختمة">;
  date: string;
  status: OpenWardStatus;
  from?: RangePoint;
  to?: RangePoint;
  pageStart?: number;
  pageEnd?: number;
  pages?: number;
  ayahs?: number;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { success: boolean; count: number; data: OpenWardEntry[] };
type UpsertResponse = { success: boolean; data: OpenWardEntry; overlapWarning: boolean };

const key = (planId?: string, f?: { student?: string; from?: string; to?: string }) =>
  ["open-ward", planId ?? "", f?.student ?? "", f?.from ?? "", f?.to ?? ""];

export function useOpenWardEntries(planId?: string, filters?: { student?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters?.student) params.set("student", filters.student);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString() ? `?${params}` : "";
  return useQuery({
    queryKey: key(planId, filters),
    queryFn: () => get<ListResponse>(`/quran-plans/${planId}/open-ward${qs}`).then((r) => r.data),
    enabled: Boolean(planId),
  });
}

export function useUpsertOpenWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, ...body }: {
      planId: string; studentId: string; type: OpenWardEntry["type"]; date: string;
      status: OpenWardStatus; from?: RangePoint; to?: RangePoint;
    }) => put<UpsertResponse>(`/quran-plans/${planId}/students/${studentId}/open-ward`, body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["open-ward", v.planId] }),
  });
}

export function useDeleteOpenWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, studentId, type, date }: { planId: string; studentId: string; type: string; date: string }) =>
      del(`/quran-plans/${planId}/students/${studentId}/open-ward?type=${encodeURIComponent(type)}&date=${date}`),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["open-ward", v.planId] }),
  });
}
```

(Check `RangePoint` is exported from `api/quran-plans.ts`; it is, as `export type RangePoint`.)

- [ ] **Step 4: Type-check**

Run: `cd quran-hifz && npx tsc --noEmit -p .`
Expected: new errors only in the screens that read `seg.rangeStart` or `todayAssignment.surahStart` without a guard. List them; Tasks 6–9 fix each. Do not silence them with `!` here.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz/src/quran/lib/quranRange.ts quran-hifz/src/quran/api
git commit -m "feat(web): open-ward types, helpers and hooks"
```

---

### Task 6: Web — plan form toggle

**Files:**
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx`

**Interfaces:**
- Consumes: `QuranPlan.openWard` (Task 5).

- [ ] **Step 1: Form state**

Add `openWard: boolean` to `FormFields`, `openWard: false` to `EMPTY`, and `openWard: Boolean(plan.openWard)` in `fieldsFromPlan`. In `fieldsFromPlan`'s segment mapping, default null ranges: `rangeStart: seg.rangeStart ?? { surahNumber: 1, ayah: 1 }, rangeEnd: seg.rangeEnd ?? { surahNumber: 1, ayah: 7 }`.

- [ ] **Step 2: Toggle UI**

Directly above the type picker (the block that maps `PLAN_TYPES` at ~line 397), add a card:

```tsx
<div className="card" style={{ marginBottom: 12 }}>
  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: isEdit ? "not-allowed" : "pointer" }}>
    <input
      type="checkbox"
      checked={form.openWard}
      disabled={isEdit}
      onChange={(e) => {
        const openWard = e.target.checked;
        setForm((p) => ({
          ...p,
          openWard,
          // ختمة is a fixed range by definition — drop it when going open.
          segments: openWard
            ? (p.segments.filter((sg) => sg.type !== "ختمة").length > 0
                ? p.segments.filter((sg) => sg.type !== "ختمة")
                : [emptySegment("حفظ")])
            : p.segments,
        }));
      }}
    />
    <span style={{ fontWeight: 600 }}>بدون مقطع محدد</span>
  </label>
  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
    لا يُحدَّد ورد مسبقاً؛ يُسجِّل المعلم في كل حلقة ما حفظه الطالب من أين إلى أين، ثم يقيّمه.
    {isEdit && " (لا يمكن تغيير هذا الخيار بعد إنشاء الخطة)"}
  </div>
</div>
```

Use the file's existing edit-mode flag; if it is named differently from `isEdit` (e.g. `mode === "edit"`), use that name.

- [ ] **Step 3: Hide range UI when open**

- In the type buttons map, skip `ختمة` when `form.openWard`: `PLAN_TYPES.filter((t) => !form.openWard || t.value !== "ختمة")`.
- In the per-segment card (`form.segments.map((seg) => ...)` at ~line 428), wrap the two `SurahPointFields`, the «عدد الآيات… عدد الصفحات» line and the reverse note in `{!form.openWard && (...)}`.
- In the submit body (~line 273), send `openWard: form.openWard` and map segments: `segments: form.segments.map((sg) => form.openWard ? { type: sg.type, days: sg.days } : sg)`. In edit mode, do not send `openWard`.
- In the preview `useMemo` (~line 309): when `form.openWard`, return entries from a date-only walk. Use the existing `computeMultiScheduleBreakdown` input minus ranges; since the web lib has no `computeOpenScheduleDates`, derive the dates with `segmentOccurrenceCounts` plus a weekday walk, or port `computeOpenScheduleDates` from Task 1 verbatim into `lib/quranRange.ts` (prefer the port, and keep the same doc comment). In the preview table, render only the date and type columns when `form.openWard`, and replace the من/إلى/الصفحات cells with a single cell «يُسجَّل في الحلقة».
- Skip the «عدد الأيام المطلوب أكبر من عدد الصفحات» warning when `form.openWard`.

- [ ] **Step 4: Verify in the browser**

Run: `cd quran-hifz && npx tsc --noEmit -p . && npm run dev` (server running from Task 3).
Create a plan with «بدون مقطع محدد» on, حفظ on السبت/الاثنين and مراجعة on الاثنين. Expected:
- no من/إلى fields;
- ختمة is hidden;
- the preview lists dates with types;
- the save succeeds;
- reopening it for edit shows the toggle checked and disabled.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz/src/quran/pages/teacher/TeacherPlanForm.tsx quran-hifz/src/quran/lib/quranRange.ts
git commit -m "feat(web): open-ward toggle in plan form"
```

---

### Task 7: Web — plan list, plan detail, log component

**Files:**
- Create: `quran-hifz/src/quran/components/common/OpenWardLog.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx`

**Interfaces:**
- Consumes: `useOpenWardEntries`, `OpenWardEntry` (Task 5); `surahName` from `lib/quranRange`.
- Produces: `<OpenWardLog planId: string; studentId?: string; showStudent?: boolean />`.

- [ ] **Step 1: Log component**

```tsx
import { useOpenWardEntries, type OpenWardEntry } from "../../api/open-ward";
import { surahName } from "../../lib/quranRange";

function point(p?: { surahNumber: number; ayah: number }) {
  return p ? `${surahName(p.surahNumber)} ${p.ayah}` : "—";
}
function studentName(e: OpenWardEntry) {
  return typeof e.student === "string" ? "" : e.student.name;
}

/** What students actually memorized on an open-ward plan, newest first. */
export function OpenWardLog({ planId, studentId, showStudent = true }: {
  planId: string; studentId?: string; showStudent?: boolean;
}) {
  const { data = [], isLoading } = useOpenWardEntries(planId, studentId ? { student: studentId } : undefined);
  if (isLoading) return <div className="muted">جارٍ التحميل…</div>;
  if (data.length === 0) return <div className="muted">لم يُسجَّل أي ورد بعد.</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>التاريخ</th>
          {showStudent && <th>الطالب</th>}
          <th>النوع</th><th>من</th><th>إلى</th><th>الصفحات</th>
        </tr>
      </thead>
      <tbody>
        {data.map((e) => (
          <tr key={e._id} style={e.status === "none" ? { opacity: 0.55 } : undefined}>
            <td>{e.date}</td>
            {showStudent && <td>{studentName(e)}</td>}
            <td>{e.type}</td>
            {e.status === "none"
              ? <td colSpan={3}>لم يُسمِّع</td>
              : <><td>{point(e.from)}</td><td>{point(e.to)}</td><td>{e.pages ?? "—"}</td></>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Match the table class and date formatting used by `TeacherPlanDetail.tsx`'s schedule table (`.tbl`, `fmtDate`); if that file formats dates with a local `fmtDate`, pass it in or copy it here.

- [ ] **Step 2: TeacherPlans card**

In `PlanCard`:
- when `isOpenPlan(plan)`, render a `Badge` «ورد حر» next to the type badge;
- replace the من/إلى `InfoRow`s with a single `InfoRow` «الورد»: «يُسجَّل ما حفظه الطالب في الحلقة»;
- hide the `X / Y جزء` headline and show the day progress as the headline;
- hide the «تقسيم الأجزاء على الأيام» button.

Guard any `todayAssignment.surahStart` read with `isSlice(plan.todayAssignment)`; for an open assignment, render «ورد اليوم: حر».

- [ ] **Step 3: TeacherPlanDetail**

When `isOpenPlan(plan)`:
- render `<OpenWardLog planId={plan._id} />` under the heading «سجل الورد» instead of the schedule table;
- hide the generate/freeze and edit-schedule controls;
- show the range cards as «بدون مقطع محدد».

- [ ] **Step 4: Verify**

Run `npx tsc --noEmit -p .`. It should show no errors from these three files. In the browser, the open plan from Task 6 shows the badge, the log says «لم يُسجَّل أي ورد بعد», and a fixed plan looks unchanged.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz/src/quran/components/common/OpenWardLog.tsx quran-hifz/src/quran/pages/teacher/TeacherPlans.tsx quran-hifz/src/quran/pages/teacher/TeacherPlanDetail.tsx
git commit -m "feat(web): open-ward plan list badge and detail log"
```

---

### Task 8: Web — record the ward in attendance and grading

**Files:**
- Create: `quran-hifz/src/quran/components/common/OpenWardPicker.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx`

**Interfaces:**
- Consumes: `typesDueOn`, `nextPointAfter` (Task 5); `useOpenWardEntries`, `useUpsertOpenWard` (Task 5).
- Produces: `OpenWardValue = { status: "recorded"; from: RangePoint; to: RangePoint } | { status: "none" }`; `<OpenWardPicker type value onChange SurahAyah />`; `openWardComplete(v?: OpenWardValue): boolean`.

- [ ] **Step 1: Picker component**

Both pages keep their own `CompactSurahAyah` copy (file convention), so the picker takes it as a prop:

```tsx
import type { ComponentType } from "react";
import type { RangePoint } from "../../api/quran-plans";
import { toFlatIndex } from "../../lib/quranRange";

export type OpenWardValue =
  | { status: "recorded"; from: RangePoint; to: RangePoint }
  | { status: "none" };

export function openWardComplete(v?: OpenWardValue): boolean {
  if (!v) return false;
  return v.status === "none" || toFlatIndex(v.from) <= toFlatIndex(v.to);
}

type SurahAyahProps = { value: RangePoint; onChange: (p: RangePoint) => void };

/** «ماذا حفظ اليوم؟» for one type on an open-ward plan. */
export function OpenWardPicker({ type, value, suggestedFrom, onChange, SurahAyah }: {
  type: string;
  value?: OpenWardValue;
  suggestedFrom: RangePoint;
  onChange: (v: OpenWardValue) => void;
  SurahAyah: ComponentType<SurahAyahProps>;
}) {
  const recorded = value?.status === "recorded" ? value : null;
  const from = recorded?.from ?? suggestedFrom;
  const to = recorded?.to ?? suggestedFrom;
  const invalid = recorded && toFlatIndex(recorded.from) > toFlatIndex(recorded.to);
  return (
    <div className="open-ward-picker">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{type} — ماذا حفظ اليوم؟</div>
      {value?.status === "none" ? (
        <div className="muted">لم يُسمِّع اليوم</div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span>من</span>
          <SurahAyah value={from} onChange={(p) => onChange({ status: "recorded", from: p, to })} />
          <span>إلى</span>
          <SurahAyah value={to} onChange={(p) => onChange({ status: "recorded", from, to: p })} />
        </div>
      )}
      {invalid && <div className="text-danger" style={{ fontSize: 12 }}>البداية بعد النهاية في ترتيب المصحف</div>}
      <button
        type="button"
        className="btn-ghost"
        style={{ marginTop: 6 }}
        onClick={() => onChange(value?.status === "none"
          ? { status: "recorded", from: suggestedFrom, to: suggestedFrom }
          : { status: "none" })}
      >
        {value?.status === "none" ? "تسجيل مقطع" : "لم يُسمِّع اليوم"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: TeacherAttendance state and prefill**

In `TeacherAttendance`:

```ts
const openPlan = isOpenPlan(linkedPlan);
const openTypes = openPlan && linkedPlan ? typesDueOn(linkedPlan.schedule, effectiveDate) : [];
const { data: openEntries = [] } = useOpenWardEntries(openPlan ? linkedPlan?._id : undefined);
const upsertOpenWard = useUpsertOpenWard();
const [openWardEdits, setOpenWardEdits] = useState<Record<string, OpenWardValue>>({});

/** Saved value for this day, else the teacher's unsaved edit. */
function openWardFor(studentId: string, type: PlanType): OpenWardValue | undefined {
  const k = `${studentId}::${type}`;
  if (openWardEdits[k]) return openWardEdits[k];
  const saved = openEntries.find((e) =>
    (typeof e.student === "string" ? e.student : e.student._id) === studentId && e.type === type && e.date === effectiveDate);
  if (!saved) return undefined;
  return saved.status === "none" ? { status: "none" } : { status: "recorded", from: saved.from!, to: saved.to! };
}

/** Continue from where this student last stopped, for this type. */
function suggestedFromFor(studentId: string, type: PlanType): RangePoint {
  const last = openEntries.find((e) =>
    (typeof e.student === "string" ? e.student : e.student._id) === studentId
    && e.type === type && e.status === "recorded" && e.date < effectiveDate);
  return last?.to ? nextPointAfter(last.to) : { surahNumber: 1, ayah: 1 };
}
```

(`openEntries` comes back sorted date-desc, so `find` returns the latest.) Reset `openWardEdits` wherever `setOverrides({})` is called.

- [ ] **Step 3: Render the picker**

In the student row, where the «الورد الفعلي» `CompactSurahAyah` is rendered for fixed plans, add a sibling branch: when `openPlan && evalFor(id).attendanceStatus !== "غائب"`, render one `OpenWardPicker` per `openTypes` entry, with `SurahAyah={CompactSurahAyah}` (unbounded, no `bounds`), `suggestedFrom={suggestedFromFor(id, t)}`, `value={openWardFor(id, t)}`, and `onChange={(v) => setOpenWardEdits((p) => ({ ...p, [`${id}::${t}`]: v }))}`. The fixed-plan branch stays as-is when `!openPlan`.

- [ ] **Step 4: Block and save**

At the top of `saveStudent`, after the `isFutureDay` guard:

```ts
    if (openPlan && e.attendanceStatus !== "غائب") {
      const missing = openTypes.filter((t) => !openWardComplete(openWardFor(studentId, t)));
      if (missing.length > 0) {
        toast.error(`حدد ما حفظه ${studentName} (${missing.join("، ")}) أو اختر «لم يُسمِّع اليوم»`);
        return;
      }
    }
```

In `bulkEvaluate`'s `onSuccess`, before the existing fixed-plan branch:

```ts
          if (openPlan && linkedPlan) {
            if (e.attendanceStatus === "غائب" || openTypes.length === 0) {
              toast.success("تم الحفظ بنجاح", { id: toastId });
              return;
            }
            (async () => {
              for (const t of openTypes) {
                const v = openWardFor(studentId, t)!;
                try {
                  const res = await upsertOpenWard.mutateAsync({
                    planId: linkedPlan._id, studentId, type: t as "حفظ" | "مراجعة", date: effectiveDate,
                    status: v.status, ...(v.status === "recorded" ? { from: v.from, to: v.to } : {}),
                  });
                  if (res.overlapWarning) toast.warning(`${t}: هذا المقطع مسجَّل من قبل لـ ${studentName}`);
                } catch (err) {
                  toast.error(`${t} — ${studentName}: ${(err as Error).message}`, { id: toastId });
                  return;
                }
              }
              setOpenWardEdits((p) => {
                const n = { ...p };
                for (const t of openTypes) delete n[`${studentId}::${t}`];
                return n;
              });
              toast.success("تم حفظ الحضور والتقييم والورد", { id: toastId });
            })();
            return;
          }
```

- [ ] **Step 5: TeacherTrackDetail**

`TeacherTrackDetail.tsx` has its own evaluation/save flow with the same `recordOccurrence` pattern (see `grep -n recordOccurrence`). Apply Steps 2–4 there with the same names: `openPlan`, `openTypes`, `openWardFor`, `suggestedFromFor`, the save guard and the upsert loop. Also, where it shows the per-student «ورد اليوم» banner or the linked plan's `todayAssignment`, guard with `isSlice(...)` and render «ورد حر — يُسجَّل في الحلقة» otherwise, and hide the schedule table and «تجميد» controls for open plans (show `<OpenWardLog planId=... />` instead).

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit -p .`. It should show no errors in these files. In the browser, on the open plan's track and a due day:
- saving a present student with nothing entered → an error toast, nothing saved;
- enter البقرة 1 → البقرة 20 → saved; the plan detail log shows the row;
- re-save the same day with البقرة 1 → 25 → still one row, updated;
- a different day starting inside 1–25 → an overlap warning toast;
- «لم يُسمِّع اليوم» → a muted row;
- an absent student → no row.

- [ ] **Step 7: Commit**

```bash
git add quran-hifz/src/quran/components/common/OpenWardPicker.tsx quran-hifz/src/quran/pages/teacher/TeacherAttendance.tsx quran-hifz/src/quran/pages/teacher/TeacherTrackDetail.tsx
git commit -m "feat(web): record open-ward range during attendance and grading"
```

---

### Task 9: Web — individual panel, report, track cards

**Files:**
- Modify: `quran-hifz/src/quran/components/common/IndividualPlanPanel.tsx`
- Modify: `quran-hifz/src/quran/components/common/StudentReportPanel.tsx`
- Modify: `quran-hifz/src/quran/pages/teacher/TeacherTracks.tsx`, `pages/student/StudentTracks.tsx`, `pages/admin/AdminTracks.tsx`

**Interfaces:**
- Consumes: `OpenWardLog` (Task 7); `coveredFlatRanges`, `juzFlatRange` (existing) from `lib/quranRange`; `useOpenWardEntries`.

- [ ] **Step 1: IndividualPlanPanel**

At the top of the component body, after the plan is resolved:

```tsx
if (isOpenPlan(plan)) {
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>خطة بدون مقطع محدد — هذا سجل ما حفظه الطالب.</div>
      <OpenWardLog planId={plan._id} studentId={studentId} showStudent={false} />
    </div>
  );
}
```

Place it before any hook call that is conditional-unsafe; if hooks follow, move the early return below them.

- [ ] **Step 2: StudentReportPanel**

For each of the student's plans where `isOpenPlan(plan)`, fetch entries with `useOpenWardEntries(plan._id, { student: studentId })` (one hook per open plan; if the component loops over plans, extract a `<OpenPlanCoverage plan studentId onSpans />` child or use `useQueries`). Merge the spans with `coveredFlatRanges(entries)`. For per-juz' coverage, for juz' `j` with `{start,end} = juzFlatRange(j)`, covered ayahs = the sum over spans of `max(0, min(end, hi) - max(start, lo) + 1)`, and the percent = covered / (end − start + 1). Add those to the existing per-juz' aggregation instead of the plan-range-derived numbers. Pages memorized = the sum of `entry.pages` over `recorded` entries.

- [ ] **Step 3: Track cards**

In `TeacherTracks.tsx`, `StudentTracks.tsx` and `AdminTracks.tsx`, every place that renders `todayAssignment`/`todayAssignments` من/إلى: wrap with `isSlice(a) ? <existing JSX/> : <span>ورد حر — يُسجَّل في الحلقة</span>`. Any place that renders `rangeStart`/`rangeEnd`/`pageRange`/`juzProgress` must null-guard and hide when null.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p . && npm run build`
Expected: both succeed with **zero** remaining errors from Task 5's list. In the browser: the student track card shows «ورد حر»; the individual panel shows the log; the student report shows the juz' of البقرة partly covered.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz/src/quran
git commit -m "feat(web): open-ward log in individual panel, report and track cards"
```

---

### Task 10: Mobile — helpers with tests, types, hooks

**Files:**
- Modify: `quran-hifz-mobile/lib/quranRange.ts`
- Modify: `quran-hifz-mobile/lib/quranRange.test.ts`
- Modify: `quran-hifz-mobile/lib/queries/quranPlan.ts`

**Interfaces:**
- Produces: the same `typesDueOn`, `coveredFlatRanges`, `nextPointAfter`, `computeOpenScheduleDates` (ported from Task 1, returning `date` as `YYYY-MM-DDT00:00:00.000Z`) in `lib/quranRange.ts`; in `lib/queries/quranPlan.ts`, the same type changes as Task 5 Step 2 plus `isOpenPlan`, `isSlice`, `OpenWardEntry`, `useOpenWardEntries`, `useUpsertOpenWard`, `useDeleteOpenWard` with identical signatures and query keys (`['open-ward', planId, ...]`).

- [ ] **Step 1: Failing tests** (append to `lib/quranRange.test.ts`, and add the four names to its import list)

```ts
describe('open-ward helpers', () => {
  it('typesDueOn picks every type scheduled on that calendar day', () => {
    const schedule = [
      { date: '2026-09-28T00:00:00.000Z', type: 'حفظ' as const },
      { date: '2026-09-28T00:00:00.000Z', type: 'مراجعة' as const },
      { date: '2026-09-26T00:00:00.000Z', type: 'حفظ' as const },
    ];
    expect(typesDueOn(schedule, '2026-09-28')).toEqual(['حفظ', 'مراجعة']);
    expect(typesDueOn(schedule, '2026-09-27')).toEqual([]);
  });

  it('coveredFlatRanges merges overlapping and adjacent spans and ignores "none"', () => {
    const e = (s: number, a: number, s2: number, a2: number) =>
      ({ status: 'recorded', from: { surahNumber: s, ayah: a }, to: { surahNumber: s2, ayah: a2 } });
    const spans = coveredFlatRanges([e(2, 1, 2, 10), e(2, 11, 2, 20), e(2, 5, 2, 8), { status: 'none' }, e(3, 1, 3, 2)]);
    expect(spans).toEqual([
      [toFlatIndex({ surahNumber: 2, ayah: 1 }), toFlatIndex({ surahNumber: 2, ayah: 20 })],
      [toFlatIndex({ surahNumber: 3, ayah: 1 }), toFlatIndex({ surahNumber: 3, ayah: 2 })],
    ]);
  });

  it('nextPointAfter crosses surah boundaries and clamps at the end', () => {
    expect(nextPointAfter({ surahNumber: 1, ayah: 7 })).toEqual({ surahNumber: 2, ayah: 1 });
    expect(nextPointAfter({ surahNumber: 114, ayah: 6 })).toEqual({ surahNumber: 114, ayah: 6 });
  });

  it('computeOpenScheduleDates walks the shared window with holidays and local calendar keys', () => {
    const out = computeOpenScheduleDates({
      startDate: new Date(2026, 8, 26), endType: 'activeDays', activeDaysCount: 3, holidays: ['2026-09-27'],
      segments: [{ type: 'حفظ', days: ['السبت', 'الأحد', 'الاثنين'] }, { type: 'مراجعة', days: ['الاثنين'] }],
    });
    expect(out.map((x) => `${x.date.slice(0, 10)} ${x.type}`)).toEqual([
      '2026-09-26 حفظ', '2026-09-28 حفظ', '2026-09-28 مراجعة', '2026-10-03 حفظ',
    ]);
  });
});
```

Run: `cd quran-hifz-mobile && npx jest lib/quranRange.test.ts -t open-ward`
Expected: FAIL, the functions are not exported.

- [ ] **Step 2: Implement** by porting the code from Task 1 Step 3 (`computeOpenScheduleDates`, `OpenScheduleEntry`; export the mobile file's own `dateKey`, or add one with the same body if the mobile copy lacks it) and Task 5 Step 1 (`typesDueOn`, `coveredFlatRanges`, `nextPointAfter`) into `lib/quranRange.ts`, and make `PlanSegmentInput.rangeStart/rangeEnd` optional with the same `continue` guards as Task 1.

- [ ] **Step 3: Run the tests**

Run: `npx jest lib/quranRange.test.ts`
Expected: all pass, including the pre-existing tests.

- [ ] **Step 4: Types and hooks** in `lib/queries/quranPlan.ts`: apply Task 5 Step 2 verbatim (types, `isOpenPlan`, `isSlice`, the `segmentReversed` null-guard), and append the hooks from Task 5 Step 3 verbatim, changing the import line to `import { get, put, del } from '@/lib/api';` and using single quotes to match the file.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`. List the new errors; Tasks 11–14 own them.

- [ ] **Step 6: Commit**

```bash
git add quran-hifz-mobile/lib
git commit -m "feat(mobile): open-ward helpers, types and hooks"
```

---

### Task 11: Mobile — plan form toggle

**Files:**
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx`

- [ ] **Step 1:** Mirror Task 6 exactly: the `openWard` form field, the defaults for null ranges in the edit prefill, dropping ختمة when turned on, hiding the من/إلى pickers and summary per segment, the submit body shape, and the edit-mode-disabled state. Use the file's existing toggle row component for booleans (e.g. the one used for `pointsEnabled`; grep `pointsEnabled` in the file and copy that row's markup), with the label «بدون مقطع محدد» and the helper text «لا يُحدَّد ورد مسبقاً؛ يُسجِّل المعلم في كل حلقة ما حفظه الطالب من أين إلى أين، ثم يقيّمه.».
- [ ] **Step 2:** The preview section: when `form.openWard`, feed `computeOpenScheduleDates` (Task 10) and render date + type cards with «يُسجَّل في الحلقة» in place of من/إلى.
- [ ] **Step 3: Verify** with `npx tsc --noEmit`, then `npx expo start` → create an open plan on the device or simulator. Expected: the same behavior as Task 6 Step 4.
- [ ] **Step 4: Commit**

```bash
git add "quran-hifz-mobile/app/(portal)/teacher/plan-form.tsx"
git commit -m "feat(mobile): open-ward toggle in plan form"
```

---

### Task 12: Mobile — plans list, plan detail, log sheet

**Files:**
- Create: `quran-hifz-mobile/components/domain/OpenWardLogSheet.tsx`
- Modify: `quran-hifz-mobile/app/(portal)/teacher/plans.tsx`, `plan-detail.tsx`

**Interfaces:**
- Produces: `<OpenWardLogSheet planId: string; studentId?: string; showStudent?: boolean />`: a `SheetTriggerRow` labeled «سجل الورد (N)» that opens a bottom sheet of compact cards, following `components/domain/ScheduleSheet.tsx`'s structure and styling.

- [ ] **Step 1: Create the sheet** by copying `ScheduleSheet.tsx`'s sheet scaffold (trigger row plus sheet plus list). Each card has line 1: `date · type` (+ the student name when `showStudent`); line 2: `من {surahName(from.surahNumber)} {from.ayah} إلى {surahName(to.surahNumber)} {to.ayah} · {pages} ص`, or «لم يُسمِّع» in the muted color for `status === 'none'`. The empty state is «لم يُسجَّل أي ورد بعد.». Data comes from `useOpenWardEntries(planId, studentId ? { student: studentId } : undefined)`.
- [ ] **Step 2:** In `plans.tsx`, mirror Task 7 Step 2 (the «ورد حر» badge, the range row replaced, juz' hidden, `isSlice` guards).
- [ ] **Step 3:** In `plan-detail.tsx`, mirror Task 7 Step 3, using `<OpenWardLogSheet planId={plan._id} />` in place of the `ScheduleSheet`, and hide the freeze/edit controls.
- [ ] **Step 4: Verify** with `npx tsc --noEmit`, then on the device: the badge shows and the sheet opens with an empty state.
- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/components/domain/OpenWardLogSheet.tsx "quran-hifz-mobile/app/(portal)/teacher"
git commit -m "feat(mobile): open-ward badge and log sheet"
```

---

### Task 13: Mobile — record the ward in attendance and grading

**Files:**
- Create: `quran-hifz-mobile/components/domain/OpenWardPicker.tsx`
- Modify: `quran-hifz-mobile/components/domain/EvaluationRoster.tsx`, `quran-hifz-mobile/app/(portal)/teacher/attendance.tsx`, `quran-hifz-mobile/components/domain/TrackDetail.tsx`

**Interfaces:**
- Produces: the same `OpenWardValue`, `openWardComplete`, and `OpenWardPicker` props as Task 8 Step 1, rendered with RN primitives. The من/إلى pickers reuse whatever surah+ayah picker `EvaluationRoster.tsx` already uses for «الورد الفعلي» (grep `completedThrough\|SurahAyah` in it), without bounds; the «لم يُسمِّع اليوم» control is a pressable chip with the selection haptic the other pickers use.

- [ ] **Step 1:** Create `OpenWardPicker.tsx` (RN port of Task 8 Step 1: same props and the same Arabic strings; the invalid-order hint uses the theme's danger color).
- [ ] **Step 2:** In `EvaluationRoster.tsx`, mirror Task 8 Steps 2–4: `openPlan`, `openTypes = typesDueOn(plan.schedule, date)`, `openWardFor`, `suggestedFromFor`, a picker per due type for present students, the save guard with the same toast/alert text, and the sequential upsert loop after the evaluation save with the overlap warning. Fixed plans are unchanged.
- [ ] **Step 3:** In `attendance.tsx` and `TrackDetail.tsx`: pass the plan and date through to `EvaluationRoster` if they are not already; guard every `todayAssignment` من/إلى render with `isSlice`, showing «ورد حر — يُسجَّل في الحلقة» otherwise; replace the schedule sheet with `OpenWardLogSheet` for open plans.
- [ ] **Step 4: Verify** with `npx tsc --noEmit && npx jest`, then the device checks from Task 8 Step 6, repeated on mobile. Confirm a web-saved day loads back into the mobile pickers.
- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile/components/domain "quran-hifz-mobile/app/(portal)/teacher/attendance.tsx"
git commit -m "feat(mobile): record open-ward range during grading"
```

---

### Task 14: Mobile — individual panel, report, track cards

**Files:**
- Modify: `quran-hifz-mobile/components/domain/IndividualPlanPanel.tsx`, `StudentReportPanel.tsx`, `app/(portal)/student/tracks.tsx`, `app/(portal)/admin/tracks.tsx`

- [ ] **Step 1:** In `IndividualPlanPanel.tsx`, mirror Task 9 Step 1 with `<OpenWardLogSheet planId studentId showStudent={false} />` plus the muted note «خطة بدون مقطع محدد — هذا سجل ما حفظه الطالب.».
- [ ] **Step 2:** In `StudentReportPanel.tsx`, mirror Task 9 Step 2 (the same coverage formula, using `coveredFlatRanges` and `juzFlatRange`).
- [ ] **Step 3:** In `student/tracks.tsx` and `admin/tracks.tsx`, mirror Task 9 Step 3.
- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx jest`
Expected: zero type errors (Task 10's list is empty) and all tests pass. The device matches the web behavior.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-mobile
git commit -m "feat(mobile): open-ward log in individual panel, report and track cards"
```

---

### Task 15: Cleanup, end-to-end check, project memory

**Files:**
- Delete: `quran-hifz-server/src/_verify_open_ward.ts`
- Modify: `quran-hifz-server/src/controllers/quran-plan.controller.ts` (remove `__test_createSchema`)
- Modify: `.wolf/anatomy.md`, `.wolf/cerebrum.md`, `.wolf/memory.md`

- [ ] **Step 1:** Run the verify script one last time (`npx ts-node src/_verify_open_ward.ts` → Tasks 1–4 OK), then delete it and remove the `__test_createSchema` export. Run `npm run build` → exit 0.
- [ ] **Step 2: End-to-end check.** With the server, web and mobile running:
  1. create an open plan (حفظ السبت/الاثنين, مراجعة الاثنين) on web;
  2. on a Monday, record حفظ + مراجعة for two students on mobile;
  3. see both in the web plan detail log, the individual panel and the student report;
  4. edit one on web and confirm mobile reloads it;
  5. confirm a fixed plan still records «الورد الفعلي» and reflows exactly as before.
- [ ] **Step 3: Project memory.**
  - `anatomy.md`: add entries for `OpenWardEntry.model.ts`, `open-ward.controller.ts`, `api/open-ward.ts`, `OpenWardLog.tsx`, `OpenWardPicker.tsx` (web and mobile), and `OpenWardLogSheet.tsx`.
  - `cerebrum.md` Key Learnings: "`QuranPlan.openWard` (2026-09-26): plan-level, immutable; segments carry no range; schedule is date-only (`computeOpenScheduleDates`, dates are local calendar key + `T00:00:00.000Z`); daily records live in `OpenWardEntry` (unique plan+student+type+date), never in `StudentPlanProgress`; every fixed-range consumer must guard with `isOpenPlan`/`isSlice`."
  - `memory.md`: a one-line session entry.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: open-ward plans cleanup and project memory"
```
