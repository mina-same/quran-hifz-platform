# Halqa Elimination / Track Restructure — Phase 1 (Server) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the server (`quran-hifz-server`) so `Halqa` is deleted entirely, `Masjid` gains a `gender` field and becomes the physical-location container, `SpecialTrack` is renamed to `Track` and becomes the real operating unit (belongs to a `Masjid`, has teachers/students/plans), and every model that referenced the old `halqa?`/`specialTrack?` XOR pair (`Student`, `Attendance`, `Evaluation`, `Homework`, `GroupHomework`, `LessonRecording`, `QuranPlan`) collapses to a single required `track` reference.

**Architecture:** This is a from-scratch schema change with **no data migration** — every document in the database is disposable test data (confirmed by the user). Each task changes one model + its controller (+ routes where renamed) together, so the app compiles and is internally consistent after every task, never left in a half-migrated state within a task boundary. `Student.track` (a required FK on Student, mirroring how `Student.halqa` worked before) becomes the **single source of truth** for track membership — `Track.enrolledStudents` (the old SpecialTrack's array-based membership) is **dropped entirely** to avoid two divergent membership mechanisms; "enroll"/"unenroll" on a track becomes "set/clear a student's `track` field" (a transfer), matching how a student's halqa used to be reassigned via `updateStudent`.

**Tech Stack:** Node/Express/Mongoose, Zod validation, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-05-halqa-track-restructure-design.md`

## Global Constraints

- **No data migration.** The database is wiped and reseeded after this phase — do not write conversion scripts for existing documents.
- **`Track.enrolledStudents` is dropped.** `Student.track` (required) is the only membership mechanism. This is a design call made during planning (not separately confirmed by the user in chat) that follows directly from their confirmed direction (single source of truth, no redundant fields) — flag it if you disagree, but implement it as specified unless told otherwise.
- **`Masjid.gender: 'male' | 'female'`** drives the جامع/دار display label on the client (phase 2/3 concern) — the server just stores and returns the raw enum value; it does not compute or return a display label itself.
- **`Masjid.name` stores the proper name only** (e.g. "الأمير متعب بن عبدالعزيز"), never prefixed with "جامع"/"دار".
- No change to `QuranPlan`'s segments/schedule/scheduling logic (`lib/quranRange.ts`, `lib/studentPlanReflow.ts`) — only `targetType`/`halqa`/`specialTrack` targeting fields change.
- `IndividualPlan.model.ts`, `HifzEntry.model.ts`, `Message.model.ts`, `KPI.model.ts`, `ParentStudent.model.ts`, `User.model.ts` are untouched except where a controller reads a `halqa`/`specialTrack` field on another model (e.g. `parent.controller.ts` reading `student.halqa`).
- Every zod validation error message and Arabic UI-facing string must stay Modern Standard Arabic (Fusha), matching existing convention.

---

## Task 1: `Masjid` model + controller — add `gender`, drop `Halqa` dependency

**Files:**
- Modify: `quran-hifz-server/src/models/Masjid.model.ts`
- Modify: `quran-hifz-server/src/controllers/masjid.controller.ts`

**Interfaces:**
- Produces: `IMasjid { name, location, gender: 'male' | 'female' }` — consumed by Task 2 (`Track.masjid` ref), Task 5 (`Student` no longer stores masjid directly, but controllers populate through `track.masjid`), Task 14 (seed scripts).

- [ ] **Step 1: Update the model**

Replace the full content of `quran-hifz-server/src/models/Masjid.model.ts`:

```ts
import { Schema, model, Document } from 'mongoose';

export type MasjidGender = 'male' | 'female';

export interface IMasjid extends Document {
  name: string;
  location: string;
  /** Drives the جامع (male) / دار (female) display label on the client —
   * the server stores and returns the raw value only. */
  gender: MasjidGender;
  createdAt: Date;
  updatedAt: Date;
}

const masjidSchema = new Schema<IMasjid>(
  {
    name:     { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    gender:   { type: String, enum: ['male', 'female'], required: true },
  },
  { timestamps: true },
);

export const Masjid = model<IMasjid>('Masjid', masjidSchema);
```

- [ ] **Step 2: Update the controller — add `gender` to validation, replace the `Halqa` lookup with `Track`**

Replace the full content of `quran-hifz-server/src/controllers/masjid.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { AppError } from '../middleware/error';

const masjidSchema = z.object({
  name:     z.string().min(2, 'اسم المسجد مطلوب'),
  location: z.string().min(2, 'الموقع مطلوب'),
  gender:   z.enum(['male', 'female'], { errorMap: () => ({ message: 'يجب تحديد جنس المسجد' }) }),
});

export async function getMasajid(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masajid = await Masjid.find().sort({ name: 1 });

    const enriched = await Promise.all(
      masajid.map(async (m) => {
        const tracks = await Track.find({ masjid: m._id })
          .populate('teachers', 'name')
          .select('title daysPerWeek timeSlot maxStudents status');
        return { ...m.toObject(), tracks };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) throw new AppError('المسجد غير موجود', 404);

    const tracks = await Track.find({ masjid: masjid._id }).populate('teachers', 'name specialty');
    res.json({ success: true, data: { ...masjid.toObject(), tracks } });
  } catch (err) {
    next(err);
  }
}

export async function createMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = masjidSchema.parse(req.body);
    const masjid = await Masjid.create(data);
    res.status(201).json({ success: true, data: masjid });
  } catch (err) {
    next(err);
  }
}

export async function updateMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = masjidSchema.partial().parse(req.body);
    const masjid = await Masjid.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!masjid) throw new AppError('المسجد غير موجود', 404);
    res.json({ success: true, data: masjid });
  } catch (err) {
    next(err);
  }
}

export async function deleteMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masjid = await Masjid.findByIdAndDelete(req.params.id);
    if (!masjid) throw new AppError('المسجد غير موجود', 404);
    res.json({ success: true, message: 'تم حذف المسجد بنجاح' });
  } catch (err) {
    next(err);
  }
}
```

This references `Track.model.ts`, which does not exist until Task 2 — that's fine, this task and Task 2 land in the same commit sequence (do Task 2 immediately after; the codebase will not typecheck between them, which is expected for this one adjacent pair only, unlike every other task boundary in this plan).

- [ ] **Step 3: Commit** (combine with Task 2's commit — see Task 2 Step 4)

---

## Task 2: `Track` model (renamed from `SpecialTrack`) — add `masjid`, drop `location` and `enrolledStudents`

**Files:**
- Create: `quran-hifz-server/src/models/Track.model.ts`
- Delete: `quran-hifz-server/src/models/SpecialTrack.model.ts`

**Interfaces:**
- Consumes: `Masjid` (Task 1).
- Produces: `ITrack { masjid, title, type, status, startDate, endDate, daysPerWeek, timeSlot, isOnline, meetLink?, teachers, maxStudents, notes? }`, exported as `Track` — consumed by every remaining task in this plan.

- [ ] **Step 1: Create the new model file**

Write `quran-hifz-server/src/models/Track.model.ts`:

```ts
import { Schema, model, Document } from 'mongoose';

export interface ITrack extends Document {
  masjid: Schema.Types.ObjectId;
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: Date;
  endDate: Date;
  daysPerWeek: string;
  timeSlot: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: Schema.Types.ObjectId[];
  maxStudents: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const trackSchema = new Schema<ITrack>(
  {
    masjid:           { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
    title:            { type: String, required: true, trim: true },
    type:             { type: String, required: true },
    status:           { type: String, enum: ['active', 'upcoming', 'ended'], default: 'upcoming' },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    daysPerWeek:      { type: String, required: true },
    timeSlot:         { type: String, required: true },
    isOnline:         { type: Boolean, default: false },
    meetLink:         { type: String },
    teachers:         [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    maxStudents:      { type: Number, required: true },
    notes:            { type: String },
  },
  { timestamps: true },
);

trackSchema.index({ masjid: 1 });

export const Track = model<ITrack>('Track', trackSchema);
```

Note: `enrolledStudents` is intentionally absent — membership lives on `Student.track` (Task 5). A track's roster is queried as `Student.find({ track: trackId })`, never stored as an array here.

- [ ] **Step 2: Delete the old model file**

Delete `quran-hifz-server/src/models/SpecialTrack.model.ts`.

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: errors in every file that still imports `SpecialTrack` (all of Tasks 3-14's targets) — this is expected at this point in the sequence; do not try to fix them all now, subsequent tasks resolve them one file at a time. Confirm specifically that `Masjid.model.ts`/`masjid.controller.ts` (Task 1) now resolve `Track` correctly with no error on that import.

- [ ] **Step 4: Commit** (Tasks 1 and 2 together, since Task 1 references `Track` before it exists)

```bash
git add quran-hifz-server/src/models/Masjid.model.ts quran-hifz-server/src/controllers/masjid.controller.ts quran-hifz-server/src/models/Track.model.ts
git rm quran-hifz-server/src/models/SpecialTrack.model.ts
git commit -m "feat: add Masjid.gender, introduce Track model (replaces SpecialTrack)"
```

---

## Task 3: `Track` controller + routes (renamed from `special-track.*`) — masjid-scoped, enroll/unenroll become transfer

**Files:**
- Create: `quran-hifz-server/src/controllers/track.controller.ts`
- Delete: `quran-hifz-server/src/controllers/special-track.controller.ts`
- Create: `quran-hifz-server/src/routes/track.routes.ts`
- Delete: `quran-hifz-server/src/routes/special-track.routes.ts`

**Interfaces:**
- Consumes: `Track` (Task 2), `Student` (still `Student.halqa`-shaped until Task 5 — this task's `enrollStudent`/`unenrollStudent` write to `Student.track`, which doesn't exist on the Student schema until Task 5; land Task 3 and Task 5 in the same sequence run, same caveat as Tasks 1+2).
- Produces: `getTracks`, `createTrack`, `updateTrack`, `assignStudent` (renamed from `enrollStudent`), `unassignStudent` (renamed from `unenrollStudent`), `deleteTrack` — consumed by Task 5 (routes wiring, no direct import) and `app.ts` (Task 4).

- [ ] **Step 1: Write the new controller**

Write `quran-hifz-server/src/controllers/track.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

const trackSchema = z.object({
  masjid:      z.string().min(1, 'المسجد مطلوب'),
  title:       z.string().min(1),
  type:        z.string().min(1),
  status:      z.enum(['active', 'upcoming', 'ended']).optional(),
  startDate:   z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  endDate:     z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  daysPerWeek: z.string().min(1),
  timeSlot:    z.string().min(1),
  isOnline:    z.boolean().optional(),
  meetLink:    z.string().url('رابط غير صالح').optional().or(z.literal('')),
  teachers:    z.array(z.string().min(1)).min(1, 'يجب اختيار معلم واحد على الأقل'),
  maxStudents: z.number().int().positive(),
  notes:       z.string().optional(),
});

export async function getTracks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, teacher, masjid } = req.query;
    const filter: Record<string, unknown> = {};
    if (status)  filter.status   = status;
    if (teacher) filter.teachers = teacher;          // element-in-array match
    if (masjid)  filter.masjid   = masjid;
    const tracks = await Track.find(filter)
      .populate('teachers', 'name')
      .populate('masjid', 'name location gender')
      .sort({ startDate: -1 });

    const enriched = await Promise.all(
      tracks.map(async (t) => {
        const studentCount = await Student.countDocuments({ track: t._id });
        return { ...t.toObject(), studentCount };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const track = await Track.findById(req.params.id)
      .populate('teachers', 'name specialty')
      .populate('masjid', 'name location gender');
    if (!track) throw new AppError('المسار غير موجود', 404);

    const students = await Student.find({ track: track._id }).select('name status progressPct attendancePct');
    res.json({ success: true, data: { ...track.toObject(), students } });
  } catch (err) {
    next(err);
  }
}

export async function createTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.parse(req.body);
    const track = await Track.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate:   new Date(data.endDate),
    });
    res.status(201).json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

export async function updateTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate)   update.endDate   = new Date(data.endDate);
    const track = await Track.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

/** Moves a student INTO this track — sets their `track` field, replacing
 * whatever track they were in before (a student always belongs to exactly
 * one track, so this is a transfer, not an add-to-a-set). Renamed from the
 * old `enrollStudent`, which pushed into an array of many possible tracks —
 * that array no longer exists (see Track.model.ts). */
export async function assignStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.body;
    const track = await Track.findById(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);

    const student = await Student.findByIdAndUpdate(studentId, { track: track._id }, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

/** There is no valid "no track" state (`Student.track` is required), so
 * unassigning only makes sense as part of a transfer to a DIFFERENT track —
 * this endpoint is kept only for API-shape continuity but now requires the
 * destination track explicitly. Callers should prefer `assignStudent` on
 * the destination track directly; this exists for a caller that only knows
 * "remove from track A" and a separate destination pick step. */
export async function unassignStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, toTrackId } = req.body;
    if (!toTrackId) throw new AppError('يجب تحديد المسار الجديد للطالب', 400);
    const destination = await Track.findById(toTrackId);
    if (!destination) throw new AppError('المسار الجديد غير موجود', 404);

    const student = await Student.findByIdAndUpdate(studentId, { track: destination._id }, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function deleteTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const remainingStudents = await Student.countDocuments({ track: req.params.id });
    if (remainingStudents > 0) {
      throw new AppError('لا يمكن حذف مسار به طلاب — انقل الطلاب إلى مسار آخر أولاً', 400);
    }
    const track = await Track.findByIdAndDelete(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
```

Note the new guard in `deleteTrack`: since a student's `track` is required (no fallback "unassigned" state), deleting a track that still has students would orphan them at the database level — this guard prevents that. This is new behavior versus the old `SpecialTrack` deletion (which had no such check, since a deleted halqa/track never left a student's own record dangling the same way before).

- [ ] **Step 2: Delete the old controller**

Delete `quran-hifz-server/src/controllers/special-track.controller.ts`.

- [ ] **Step 3: Write the new routes file**

Write `quran-hifz-server/src/routes/track.routes.ts`:

```ts
import { Router } from 'express';
import {
  getTracks, getTrack, createTrack, updateTrack, assignStudent, unassignStudent, deleteTrack,
} from '../controllers/track.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/role';

const router = Router();

router.use(authenticate);

router.get('/',              getTracks);
router.get('/:id',           getTrack);
router.post('/',             authorize('admin'), createTrack);
router.put('/:id',           authorize('admin'), updateTrack);
router.post('/:id/assign',   authorize('admin', 'teacher'), assignStudent);
router.post('/:id/unassign', authorize('admin', 'teacher'), unassignStudent);
router.delete('/:id',        authorize('admin'), deleteTrack);

export default router;
```

(`getTrack`, the single-track-by-id endpoint, is a new addition — the old `special-track.routes.ts` had no `GET /:id` at all; every consumer fetched the full list and filtered client-side. Adding it now matches the pattern every other resource in this API already follows, and phase 2/3 can adopt it or keep list-filtering, their choice.)

- [ ] **Step 4: Delete the old routes file**

Delete `quran-hifz-server/src/routes/special-track.routes.ts`.

- [ ] **Step 5: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: this file's own errors clear (once Task 5 lands `Student.track`); errors remain in every other not-yet-updated consumer of `SpecialTrack`/`Halqa`, expected at this point.

- [ ] **Step 6: Commit** (with Task 5 — see Task 5 Step 3, since `assignStudent`/`unassignStudent` write `Student.track`)

---

## Task 4: Delete `Halqa` entirely; update `app.ts` route registration

**Files:**
- Delete: `quran-hifz-server/src/models/Halqa.model.ts`
- Delete: `quran-hifz-server/src/controllers/halqa.controller.ts`
- Delete: `quran-hifz-server/src/routes/halqa.routes.ts`
- Modify: `quran-hifz-server/src/app.ts`

**Interfaces:**
- Produces: `/api/tracks` (renamed from `/api/special-tracks`), no `/api/halqat` route at all.

- [ ] **Step 1: Delete the three Halqa files**

```bash
git rm quran-hifz-server/src/models/Halqa.model.ts quran-hifz-server/src/controllers/halqa.controller.ts quran-hifz-server/src/routes/halqa.routes.ts
```

- [ ] **Step 2: Update `app.ts`**

Replace the import block (originally lines 10-27):
```ts
import authRoutes       from './routes/auth.routes';
import studentRoutes    from './routes/student.routes';
import teacherRoutes    from './routes/teacher.routes';
import halqaRoutes      from './routes/halqa.routes';
import masjidRoutes     from './routes/masjid.routes';
import attendanceRoutes from './routes/attendance.routes';
import evaluationRoutes from './routes/evaluation.routes';
import hifzRoutes       from './routes/hifz.routes';
import homeworkRoutes   from './routes/homework.routes';
import messageRoutes    from './routes/message.routes';
import kpiRoutes             from './routes/kpi.routes';
import statsRoutes           from './routes/stats.routes';
import parentRoutes          from './routes/parent.routes';
import specialTrackRoutes    from './routes/special-track.routes';
import lessonRecordingRoutes from './routes/lesson-recording.routes';
import groupHomeworkRoutes   from './routes/group-homework.routes';
import quranPlanRoutes       from './routes/quran-plan.routes';
import adminRoutes           from './routes/admin.routes';
```
with:
```ts
import authRoutes       from './routes/auth.routes';
import studentRoutes    from './routes/student.routes';
import teacherRoutes    from './routes/teacher.routes';
import masjidRoutes     from './routes/masjid.routes';
import attendanceRoutes from './routes/attendance.routes';
import evaluationRoutes from './routes/evaluation.routes';
import hifzRoutes       from './routes/hifz.routes';
import homeworkRoutes   from './routes/homework.routes';
import messageRoutes    from './routes/message.routes';
import kpiRoutes             from './routes/kpi.routes';
import statsRoutes           from './routes/stats.routes';
import parentRoutes          from './routes/parent.routes';
import trackRoutes           from './routes/track.routes';
import lessonRecordingRoutes from './routes/lesson-recording.routes';
import groupHomeworkRoutes   from './routes/group-homework.routes';
import quranPlanRoutes       from './routes/quran-plan.routes';
import adminRoutes           from './routes/admin.routes';
```

Replace the route registration block (originally lines 52-69):
```ts
app.use('/api/auth',       authRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/teachers',   teacherRoutes);
app.use('/api/halqat',     halqaRoutes);
app.use('/api/masajid',    masjidRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/hifz',       hifzRoutes);
app.use('/api/homework',   homeworkRoutes);
app.use('/api/messages',   messageRoutes);
app.use('/api/kpis',              kpiRoutes);
app.use('/api/stats',             statsRoutes);
app.use('/api/parent',            parentRoutes);
app.use('/api/special-tracks',    specialTrackRoutes);
app.use('/api/lesson-recordings', lessonRecordingRoutes);
app.use('/api/group-homework',    groupHomeworkRoutes);
app.use('/api/quran-plans',       quranPlanRoutes);
app.use('/api/admin',            adminRoutes);
```
with:
```ts
app.use('/api/auth',       authRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/teachers',   teacherRoutes);
app.use('/api/masajid',    masjidRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/hifz',       hifzRoutes);
app.use('/api/homework',   homeworkRoutes);
app.use('/api/messages',   messageRoutes);
app.use('/api/kpis',              kpiRoutes);
app.use('/api/stats',             statsRoutes);
app.use('/api/parent',            parentRoutes);
app.use('/api/tracks',            trackRoutes);
app.use('/api/lesson-recordings', lessonRecordingRoutes);
app.use('/api/group-homework',    groupHomeworkRoutes);
app.use('/api/quran-plans',       quranPlanRoutes);
app.use('/api/admin',            adminRoutes);
```

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: `app.ts` itself resolves cleanly; errors remain in files that still reference `Halqa`/`SpecialTrack` (Tasks 5-14), expected.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src/app.ts
git commit -m "feat: delete Halqa model entirely, wire /api/tracks route"
```

---

## Task 5: `Student` model + controller — `track` replaces `halqa`, `masjid` dropped

**Files:**
- Modify: `quran-hifz-server/src/models/Student.model.ts`
- Modify: `quran-hifz-server/src/controllers/student.controller.ts`

**Interfaces:**
- Consumes: `Track` (Task 2).
- Produces: `IStudent.track: ObjectId` (required) — consumed by Task 3's `assignStudent`/`unassignStudent` (land together), and every remaining task that queries students by their group.

- [ ] **Step 1: Update the model**

Replace `quran-hifz-server/src/models/Student.model.ts`'s interface and schema fields (keep `NATIONAL_ID_RE` and every other field as-is):

Change:
```ts
  halqa: Types.ObjectId;
  masjid: Types.ObjectId;
```
to:
```ts
  track: Types.ObjectId;
```
(in both the `IStudent` interface and the schema definition — the schema line changes from
```ts
    halqa:            { type: Schema.Types.ObjectId, ref: 'Halqa',  required: true },
    masjid:           { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
```
to:
```ts
    track:            { type: Schema.Types.ObjectId, ref: 'Track', required: true },
```
).

Change the index block from:
```ts
studentSchema.index({ halqa: 1 });
studentSchema.index({ masjid: 1 });
```
to:
```ts
studentSchema.index({ track: 1 });
```

- [ ] **Step 2: Update the controller**

Replace the full content of `quran-hifz-server/src/controllers/student.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Student, NATIONAL_ID_RE } from '../models/Student.model';
import { User } from '../models/User.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { AppError } from '../middleware/error';

const studentSchema = z.object({
  name:             z.string().min(2, 'الاسم مطلوب'),
  /** Empty string is normalised to undefined so a blank field clears rather
   *  than failing the 10-digit check. */
  nationalId:       z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(NATIONAL_ID_RE, 'رقم الهوية يجب أن يكون ١٠ أرقام ويبدأ بـ ١ أو ٢').optional(),
  ),
  path:             z.enum(['حفظ كامل', 'عشرون جزءاً', 'عشرة أجزاء', 'خمسة أجزاء']),
  track:            z.string().min(1, 'المسار مطلوب'),
  guardian:         z.string().optional(),
  guardianPhone:    z.string().optional(),
  lastMemorization: z.string().optional(),
  level:            z.coerce.number().int().min(1, 'المستوى بين ١ و١٠').max(10, 'المستوى بين ١ و١٠').optional(),
  totalPages:       z.number().optional(),
  status:           z.enum(['active', 'inactive', 'new']).optional(),
  email:            z.string().email('البريد الإلكتروني غير صحيح').optional(),
  password:         z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { track, masjid, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (track) {
      const ids = String(track).split(',').filter(Boolean);
      filter.track = ids.length > 1 ? { $in: ids } : ids[0];
    }
    if (status)  filter.status = status;
    if (search)  filter.name   = { $regex: search, $options: 'i' };

    // `masjid` filters by the student's track's masjid — Student itself no
    // longer stores masjid directly, so this needs a two-step resolve.
    if (masjid) {
      const { Track } = await import('../models/Track.model');
      const tracksAtMasjid = await Track.find({ masjid }).select('_id');
      const trackIds = tracksAtMasjid.map((t) => t._id);
      filter.track = filter.track
        ? { $in: trackIds, ...(filter.track as Record<string, unknown>) }
        : { $in: trackIds };
    }

    const students = await Student.find(filter)
      .populate({ path: 'track', select: 'title masjid', populate: { path: 'masjid', select: 'name location gender' } })
      .sort({ createdAt: -1 });

    const studentIds = students.map((s) => s._id);
    const userDocs = await User.find({ role: 'student', profileId: { $in: studentIds } }).select('profileId email');
    const emailMap = new Map(userDocs.map((u) => [String(u.profileId), u.email]));

    const links = await ParentStudent.find({ student: { $in: studentIds } }).select('parent student');
    const parentUserDocs = await User.find({ role: 'parent', _id: { $in: links.map((l) => l.parent) } }).select('name email');
    const parentUserMap = new Map(parentUserDocs.map((u) => [String(u._id), { name: u.name, email: u.email }]));
    const parentMap = new Map(
      links
        .map((l) => [String(l.student), parentUserMap.get(String(l.parent))] as const)
        .filter((pair): pair is [string, { name: string; email: string }] => !!pair[1]),
    );

    const enriched = students.map((s) => {
      const parent = parentMap.get(String(s._id));
      return {
        ...s.toObject(),
        email: emailMap.get(String(s._id)) ?? null,
        parentName: parent?.name ?? null,
        parentEmail: parent?.email ?? null,
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findById(req.params.id)
      .populate({ path: 'track', select: 'title daysPerWeek timeSlot masjid', populate: { path: 'masjid', select: 'name location gender' } });

    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...studentData } = studentSchema.parse(req.body);
    const student = await Student.create(studentData);

    let userCredentials: { email: string; password: string } | undefined;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Student.findByIdAndDelete(student._id);
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      }
      await User.create({ name: studentData.name, email, password, role: 'student', profileId: student._id });
      userCredentials = { email, password };
    }

    res.status(201).json({ success: true, data: student, credentials: userCredentials });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...studentData } = studentSchema.partial().parse(req.body);
    const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    if (email || password) {
      const userDoc = await User.findOne({ role: 'student', profileId: student._id });
      if (userDoc) {
        if (email && email !== userDoc.email) {
          const conflict = await User.findOne({ email, _id: { $ne: userDoc._id } });
          if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
          userDoc.email = email;
        }
        if (password) userDoc.password = password;
        await userDoc.save();
      } else if (email && password) {
        const existing = await User.findOne({ email });
        if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
        await User.create({ name: student.name, email, password, role: 'student', profileId: student._id });
      }
    }

    const userDoc = await User.findOne({ role: 'student', profileId: student._id }).select('email');
    res.json({ success: true, data: { ...student.toObject(), email: userDoc?.email ?? null } });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
  } catch (err) {
    next(err);
  }
}
```

Note on the `masjid` query filter in `getStudents`: it uses a dynamic `import('../models/Track.model')` purely to avoid this file needing an eager top-level `Track` import just for one optional filter branch — if the reviewer/implementer finds a top-level `import { Track } from '../models/Track.model';` reads more clearly (it does, and there's no real circular-import risk here), prefer that over the dynamic import; either works, but keep it consistent with this file's own style once decided.

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: `Student.model.ts`, `student.controller.ts`, `masjid.controller.ts` (Task 1), `Track.model.ts`/`track.controller.ts` (Tasks 2-3) all resolve cleanly against each other now. Errors remain in `validators/context.ts`'s consumers and everything not yet touched (Tasks 6-14) — expected.

- [ ] **Step 4: Commit** (Tasks 3 and 5 together, since they reference each other)

```bash
git add quran-hifz-server/src/controllers/track.controller.ts quran-hifz-server/src/routes/track.routes.ts quran-hifz-server/src/models/Student.model.ts quran-hifz-server/src/controllers/student.controller.ts
git commit -m "feat: rename SpecialTrack controller/routes to Track, Student.track replaces Student.halqa+masjid"
```

---

## Task 6: Remove `validators/context.ts` and its usage everywhere

**Files:**
- Delete: `quran-hifz-server/src/validators/context.ts`
- Modify: `quran-hifz-server/src/models/Attendance.model.ts`, `Homework.model.ts`, `GroupHomework.model.ts`, `LessonRecording.model.ts` (remove the `applyContextValidation(...)` call + its import)
- Modify: `quran-hifz-server/src/controllers/attendance.controller.ts`, `homework.controller.ts`, `group-homework.controller.ts`, `lesson-recording.controller.ts` (remove the `contextRefinement`/`.superRefine(contextRefinement)` usage + its import)

This task is a **pure removal** pass — it does NOT yet add the new `track` field to these five files (that's Tasks 7-11, one per model, done next). Its only job is deleting the now-meaningless XOR-validation machinery so those later tasks aren't also fighting a validator that assumes two mutually-exclusive optional fields.

**Interfaces:**
- Produces: nothing — this is a subtractive task. Tasks 7-11 each independently add the real `track: ObjectId, required` field and a plain Mongoose `required: true` (no custom validator needed) in its place.

- [ ] **Step 1: Delete the validator file**

```bash
git rm quran-hifz-server/src/validators/context.ts
```

- [ ] **Step 2: Remove `applyContextValidation` from the four models**

In each of `Attendance.model.ts`, `Homework.model.ts`, `GroupHomework.model.ts`, `LessonRecording.model.ts`:
- Remove the line `import { applyContextValidation } from '../validators/context';`
- Remove the line `applyContextValidation(<schemaName>);` (e.g. `applyContextValidation(attendanceSchema);`)

Leave the `halqa?`/`specialTrack?` fields themselves in place for now — Tasks 7-11 replace them with `track` as part of their own model rewrite; don't do a partial edit here that Tasks 7-11 would have to re-read around.

- [ ] **Step 3: Remove `contextRefinement` from the four controllers**

In each of `attendance.controller.ts`, `homework.controller.ts`, `group-homework.controller.ts`, `lesson-recording.controller.ts`:
- Remove the line `import { contextRefinement } from '../validators/context';`
- Remove the trailing `.superRefine(contextRefinement)` from whichever zod object(s) had it (e.g. `recordSchema`/`bulkSchema` in `attendance.controller.ts`; the single request schema in the other three).

Leave the schema's `halqa`/`specialTrack` field definitions themselves in place — Tasks 7-11 replace them.

- [ ] **Step 4: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: no new errors from removing the validator import/calls (the fields it validated are still there, just unvalidated for now — genuinely fine as an intermediate state since this whole plan lands as one deploy, not incrementally).

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-server/src/validators/ quran-hifz-server/src/models/Attendance.model.ts quran-hifz-server/src/models/Homework.model.ts quran-hifz-server/src/models/GroupHomework.model.ts quran-hifz-server/src/models/LessonRecording.model.ts quran-hifz-server/src/controllers/attendance.controller.ts quran-hifz-server/src/controllers/homework.controller.ts quran-hifz-server/src/controllers/group-homework.controller.ts quran-hifz-server/src/controllers/lesson-recording.controller.ts
git commit -m "refactor: remove the halqa/specialTrack XOR validator (single track field replaces it)"
```

---

## Task 7: `Attendance` model + controller — single `track` field

**Files:**
- Modify: `quran-hifz-server/src/models/Attendance.model.ts`
- Modify: `quran-hifz-server/src/controllers/attendance.controller.ts`

**Interfaces:**
- Consumes: `Track` (Task 2).
- Produces: `IAttendance.track: ObjectId` (required); `upsertAttendanceRecords(track: string, dateObj, records)` — **signature changes** from `(context: AttendanceContext, ...)` to a plain `track: string` — consumed by Task 8 (`evaluation.controller.ts` imports `upsertAttendanceRecords`).

- [ ] **Step 1: Update the model**

Replace `quran-hifz-server/src/models/Attendance.model.ts`:

```ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  student: Types.ObjectId;
  track: Types.ObjectId;
  date: Date;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    track:   { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    date:    { type: Date, required: true },
    day:     { type: String, required: true },
    time:    { type: String, required: true },
    status:  { type: String, enum: ['حاضر', 'غائب', 'متأخر'], required: true },
  },
  { timestamps: true },
);

attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ track: 1, date: -1 });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
```

- [ ] **Step 2: Update the controller**

Replace the full content of `quran-hifz-server/src/controllers/attendance.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';
import { notifyParents } from '../lib/notify';

const recordSchema = z.object({
  student: z.string().min(1),
  track:   z.string().min(1),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  status:  z.enum(['حاضر', 'غائب', 'متأخر']),
});

const bulkSchema = z.object({
  track:   z.string().min(1),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  records: z.array(z.object({
    student: z.string().min(1),
    status:  z.enum(['حاضر', 'غائب', 'متأخر']),
  })),
});

// The client only knows the calendar date it's marking attendance for — day-of-week
// and time-of-recording are derived here rather than trusted from the request body.
const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function deriveDayAndTime(date: Date): { day: string; time: string } {
  const now = new Date();
  return {
    day: ARABIC_WEEKDAYS[date.getDay()],
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
}

/**
 * Upserts one Attendance doc per {student, date} and recalculates each
 * student's attendancePct. Shared by the plain attendance bulk-save endpoint
 * and the merged evaluation bulk-save endpoint (which saves attendance status
 * alongside scores from the same "الحضور والتقييم" page in one request).
 */
export async function upsertAttendanceRecords(
  track: string,
  dateObj: Date,
  records: { student: string; status: 'حاضر' | 'غائب' | 'متأخر' }[],
): Promise<void> {
  const { day, time } = deriveDayAndTime(dateObj);
  const trackId = new Types.ObjectId(track);

  const ops = records.map(({ student, status }) => ({
    updateOne: {
      filter: { student: new Types.ObjectId(student), date: dateObj },
      update: { $set: { student: new Types.ObjectId(student), track: trackId, date: dateObj, day, time, status } },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  await Promise.all(records.map((r) => recalcAttendancePct(r.student)));
}

export async function getAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { student, track, from, to } = req.query;
    const filter: Record<string, unknown> = {};
    if (student) filter.student = student;
    if (track)   filter.track   = track;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to)   (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name')
      .populate('track', 'title')
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
}

export async function recordAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = recordSchema.parse(req.body);
    const dateObj = new Date(data.date);
    const existing = await Attendance.findOne({ student: data.student, date: dateObj });
    if (existing) {
      existing.status = data.status;
      await existing.save();
      res.json({ success: true, data: existing });
      return;
    }
    const { day, time } = deriveDayAndTime(dateObj);
    const record = await Attendance.create({ ...data, date: dateObj, day, time });
    await recalcAttendancePct(data.student);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function bulkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { track, date, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);

    await upsertAttendanceRecords(track, dateObj, records);

    const { notified, unnotified } = await notifyParents(
      records.filter((r) => r.status === 'غائب').map((r) => r.student),
      (name) => `الطالب ${name} غائب اليوم (${day}، ${date}).`,
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role },
    );

    res.json({ success: true, message: 'تم تسجيل الحضور بنجاح', notified, unnotified });
  } catch (err) {
    next(err);
  }
}

async function recalcAttendancePct(studentId: string): Promise<void> {
  const total   = await Attendance.countDocuments({ student: studentId });
  const present = await Attendance.countDocuments({ student: studentId, status: 'حاضر' });
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  await Student.findByIdAndUpdate(studentId, { attendancePct: pct });
}
```

Note: the exported `AttendanceContext` type is deleted entirely (no longer needed — there's only one context shape now, a plain string `track` id). Task 8 (`evaluation.controller.ts`) imports `upsertAttendanceRecords`/`deriveDayAndTime` from this file — update that import site in the same task-run as this one, or expect a typecheck error in `evaluation.controller.ts` until Task 8 lands (same "adjacent pair" caveat as Tasks 1-2 and 3+5).

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: this file resolves cleanly on its own terms; `evaluation.controller.ts` (not yet updated) now errors on its `AttendanceContext` import and its call to `upsertAttendanceRecords` with the old 3-arg-object signature — expected, resolved by Task 8.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src/models/Attendance.model.ts quran-hifz-server/src/controllers/attendance.controller.ts
git commit -m "feat: Attendance uses a single required track field"
```

---

## Task 8: `Evaluation` model + controller — single `track` field, simplified `resolveRubric`

**Files:**
- Modify: `quran-hifz-server/src/models/Evaluation.model.ts`
- Modify: `quran-hifz-server/src/controllers/evaluation.controller.ts`
- Modify: `quran-hifz-server/src/routes/evaluation.routes.ts` (no functional change expected — verify import names still match after the controller rewrite)

**Interfaces:**
- Consumes: `upsertAttendanceRecords(track: string, ...)`, `deriveDayAndTime` (Task 7, new signature).
- Produces: `IEvaluation.track: ObjectId` (required).

- [ ] **Step 1: Update the model**

In `quran-hifz-server/src/models/Evaluation.model.ts`, change:
```ts
  halqa?: Types.ObjectId;
  specialTrack?: Types.ObjectId;
```
(in the `IEvaluation` interface) to:
```ts
  track: Types.ObjectId;
```

And in the schema definition, change:
```ts
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
```
to:
```ts
    track: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
```

Remove the `import { applyContextValidation } from '../validators/context';` line and the `applyContextValidation(evaluationSchema);` call if still present (Task 6 should already have removed these — if this model wasn't in Task 6's four-model list, remove them now; check — `Evaluation.model.ts` does NOT appear in Task 6's file list above, since at planning time it wasn't confirmed to use `applyContextValidation`. **Read the live file first**: if it does call `applyContextValidation`, remove that import/call as part of this step instead of assuming Task 6 handled it.)

Update the index block — replace any `evaluationSchema.index({ halqa: ... })`/`evaluationSchema.index({ specialTrack: ... })` lines with:
```ts
evaluationSchema.index({ track: 1, date: -1 });
```

- [ ] **Step 2: Update the controller**

Replace the full content of `quran-hifz-server/src/controllers/evaluation.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Evaluation, type IEvaluationCriterion } from '../models/Evaluation.model';
import { QuranPlan, DEFAULT_GRADE_RUBRIC, type IGradeCriterion } from '../models/QuranPlan.model';
import { notifyParents } from '../lib/notify';
import { deriveDayAndTime, upsertAttendanceRecords } from './attendance.controller';

/**
 * The rubric is no longer platform-wide — each plan carries its own
 * `gradeRubric`. `MAX_SCORES` remains only as the DEFAULT split so that a
 * session with no resolvable plan grades exactly as it always did.
 */
export const MAX_SCORES = { attendance: 3, hifz: 4, tajweed: 2, talawah: 1 } as const;

const LEGACY_KEYS = ['attendance', 'hifz', 'tajweed', 'talawah'] as const;

/**
 * Which plan's rubric governs a given session.
 *
 * Evaluations are keyed by (track, date) while rubrics live on plans, and
 * one track can own several plans — so the caller may name the plan
 * explicitly. Falling back: a single active plan for that track wins; if
 * ambiguous or empty we grade against the default split rather than
 * guessing, which keeps totals comparable with historical records.
 */
export async function resolveRubric(
  ctx: { track?: string; plan?: string },
): Promise<{ rubric: IGradeCriterion[]; planId?: string; ambiguous: boolean }> {
  if (ctx.plan) {
    const plan = await QuranPlan.findById(ctx.plan).select('gradeRubric');
    if (plan?.gradeRubric?.length) {
      return { rubric: plan.gradeRubric, planId: String(plan._id), ambiguous: false };
    }
  }

  if (ctx.track) {
    const plans = await QuranPlan.find({ track: new Types.ObjectId(ctx.track), status: 'نشطة' }).select('gradeRubric');
    if (plans.length === 1 && plans[0].gradeRubric?.length) {
      return { rubric: plans[0].gradeRubric, planId: String(plans[0]._id), ambiguous: false };
    }
    if (plans.length > 1) {
      return { rubric: DEFAULT_GRADE_RUBRIC, ambiguous: true };
    }
  }

  return { rubric: DEFAULT_GRADE_RUBRIC, ambiguous: false };
}

const recordSchema = z.object({
  student:          z.string().min(1),
  attendanceStatus: z.enum(['حاضر', 'غائب']),
  /** Keyed by rubric criterion key. Bounds are checked against the resolved
   *  rubric in `bulkEvaluate` — they are per plan, so not expressible here. */
  scores:  z.record(z.string(), z.number().int().min(0)).optional(),
  note:    z.string().optional(),
});

const bulkSchema = z.object({
  teacher: z.string().min(1),
  track:   z.string().min(1),
  plan:    z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  records: z.array(recordSchema),
});

/** GET /api/evaluations/rubric — what the evaluation screen should render. */
export async function getRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { track, plan } = req.query as Record<string, string | undefined>;
    const { rubric, planId, ambiguous } = await resolveRubric({ track, plan });

    // When several plans could apply, hand the client the choices so the
    // teacher picks instead of silently grading against the default.
    const choices = track
      ? await QuranPlan.find({ track: new Types.ObjectId(track), status: 'نشطة' }).select('name gradeRubric')
      : [];

    res.json({
      success: true,
      data: {
        rubric,
        planId,
        ambiguous,
        totalMax: rubric.reduce((a, c) => a + c.max, 0),
        plans: choices.map((p) => ({ _id: String(p._id), name: p.name, gradeRubric: p.gradeRubric })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { student, track, from, to } = req.query;
    const filter: Record<string, unknown> = {};
    if (student) filter.student = student;
    if (track) {
      const ids = String(track).split(',').filter(Boolean);
      filter.track = ids.length > 1 ? { $in: ids } : ids[0];
    }
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to)   (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }

    const records = await Evaluation.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('track', 'title')
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
}

export async function bulkEvaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacher, track, plan, date, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);
    const trackId = new Types.ObjectId(track);

    const { rubric, planId } = await resolveRubric({ track, plan });
    const totalMax = rubric.reduce((a, c) => a + c.max, 0);

    // Reject out-of-range input against THIS plan's rubric before writing.
    for (const r of records) {
      for (const [key, value] of Object.entries(r.scores ?? {})) {
        const criterion = rubric.find((c) => c.key === key);
        if (!criterion) {
          res.status(400).json({ success: false, message: `بند غير معروف في التقييم: ${key}` });
          return;
        }
        if (value > criterion.max) {
          res.status(400).json({
            success: false,
            message: `الدرجة المدخلة لبند «${criterion.label}» تتجاوز الحد الأقصى (${criterion.max})`,
          });
          return;
        }
      }
    }

    // Server never trusts client-computed scores for an absent student — every
    // criterion is forced to zero. `auto` criteria (حضور) are awarded in full
    // on presence rather than typed by the teacher.
    const scored = records.map((r) => {
      const isPresent = r.attendanceStatus === 'حاضر';
      const criteria: IEvaluationCriterion[] = rubric.map((c) => ({
        key: c.key,
        label: c.label,
        max: c.max,
        value: !isPresent ? 0 : c.auto ? c.max : Math.min(r.scores?.[c.key] ?? 0, c.max),
      }));
      const total = criteria.reduce((a, c) => a + c.value, 0);

      // Mirror into the legacy fixed shape when the rubric still uses the four
      // original keys, so existing reports and CSV exports keep working.
      const byKey = new Map(criteria.map((c) => [c.key, c.value]));
      const legacy = LEGACY_KEYS.every((k) => byKey.has(k))
        ? {
            attendance: byKey.get('attendance')!,
            hifz:       byKey.get('hifz')!,
            tajweed:    byKey.get('tajweed')!,
            talawah:    byKey.get('talawah')!,
          }
        : undefined;

      return { ...r, criteria, scores: legacy, total, totalMax };
    });

    const ops = scored.map(({ student, attendanceStatus, criteria, scores, total, note }) => ({
      updateOne: {
        filter: { student: new Types.ObjectId(student), date: dateObj },
        update: {
          $set: {
            student: new Types.ObjectId(student),
            teacher: new Types.ObjectId(teacher),
            track: trackId,
            ...(planId ? { plan: new Types.ObjectId(planId) } : {}),
            date: dateObj,
            attendanceStatus,
            criteria,
            scores,
            total,
            totalMax,
            note,
          },
        },
        upsert: true,
      },
    }));
    await Evaluation.bulkWrite(ops);

    // The same "الحضور والتقييم" save also drives the Attendance collection
    // (attendancePct, absence tracking, ParentAttendance) — one Save button,
    // both records kept in sync.
    await upsertAttendanceRecords(
      track,
      dateObj,
      records.map((r) => ({ student: r.student, status: r.attendanceStatus })),
    );

    const scoredByStudentId = new Map(scored.map((r) => [r.student, r]));
    const { notified, unnotified } = await notifyParents(
      scored.map((r) => r.student),
      (name, studentId) => {
        const r = scoredByStudentId.get(studentId)!;
        if (r.attendanceStatus === 'غائب') return `الطالب ${name} غائب اليوم (${day}، ${date}) — المجموع: ${r.total}/${r.totalMax}.`;
        const breakdown = r.criteria.map((c) => `${c.label} ${c.value}/${c.max}`).join('، ');
        return `تقييم اليوم لـ ${name}: ${r.total}/${r.totalMax} (${breakdown}).`;
      },
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role },
    );

    res.json({ success: true, message: 'تم حفظ الحضور والتقييم بنجاح', notified, unnotified });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Verify `evaluation.routes.ts` needs no change**

Read `quran-hifz-server/src/routes/evaluation.routes.ts` — it only imports `getEvaluations`, `bulkEvaluate`, `getRubric` by name, none of which were renamed. Confirm no edit is actually needed; if the file somehow references `halqa`/`specialTrack` directly (it shouldn't, per the version read during planning), fix it here.

- [ ] **Step 4: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: `Evaluation.model.ts`, `evaluation.controller.ts` resolve cleanly, including their now-matching call into `attendance.controller.ts`'s Task-7 signature.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-server/src/models/Evaluation.model.ts quran-hifz-server/src/controllers/evaluation.controller.ts
git commit -m "feat: Evaluation uses a single required track field, simplified resolveRubric"
```

---

## Task 9: `Homework`, `GroupHomework`, `LessonRecording` — single `track` field (batched)

These three models/controllers get the identical mechanical transformation (drop `halqa?`/`specialTrack?`, add `track: required`), so this is one batched task per the "batch small same-shape work" convention.

**Files:**
- Modify: `quran-hifz-server/src/models/Homework.model.ts`, `quran-hifz-server/src/controllers/homework.controller.ts`
- Modify: `quran-hifz-server/src/models/GroupHomework.model.ts`, `quran-hifz-server/src/controllers/group-homework.controller.ts`
- Modify: `quran-hifz-server/src/models/LessonRecording.model.ts`, `quran-hifz-server/src/controllers/lesson-recording.controller.ts`

**Interfaces:**
- Consumes: `Track` (Task 2).
- Produces: `IHomework.track`, `IGroupHomework.track`, `ILessonRecording.track` (all required `ObjectId`) — consumed by Task 13 (`parent.controller.ts`).

- [ ] **Step 1: `Homework.model.ts`**

Change the interface fields:
```ts
  halqa?: Types.ObjectId;
  specialTrack?: Types.ObjectId;
```
to:
```ts
  track: Types.ObjectId;
```
Change the schema fields:
```ts
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
```
to:
```ts
    track: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
```
Change the index line `homeworkSchema.index({ specialTrack: 1, dueDate: -1 });` to `homeworkSchema.index({ track: 1, dueDate: -1 });` (keep the other existing `student`/`teacher` indexes unchanged).

- [ ] **Step 2: `homework.controller.ts`**

Change the `homeworkSchema` zod object's fields:
```ts
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
```
to:
```ts
  track: z.string().min(1, 'المسار مطلوب'),
```
In `getHomework`, change:
```ts
    const { student, teacher, halqa, specialTrack, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (student)      filter.student      = student;
    if (teacher)      filter.teacher      = teacher;
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    if (status)       filter.status       = status;

    const homework = await Homework.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('specialTrack', 'title')
      .sort({ dueDate: -1 });
```
to:
```ts
    const { student, teacher, track, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (student) filter.student = student;
    if (teacher) filter.teacher = teacher;
    if (track)   filter.track   = track;
    if (status)  filter.status  = status;

    const homework = await Homework.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('track', 'title')
      .sort({ dueDate: -1 });
```

- [ ] **Step 3: `GroupHomework.model.ts`**

Change interface fields:
```ts
  halqa?: Schema.Types.ObjectId;
  specialTrack?: Schema.Types.ObjectId;
```
to:
```ts
  track: Schema.Types.ObjectId;
```
Change schema fields:
```ts
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
```
to:
```ts
    track: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
```
Change `groupHomeworkSchema.index({ specialTrack: 1, dueDate: -1 });` to `groupHomeworkSchema.index({ track: 1, dueDate: -1 });`.

- [ ] **Step 4: `group-homework.controller.ts`**

Change the `groupHomeworkSchema` zod object's fields:
```ts
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
```
to:
```ts
  track: z.string().min(1, 'المسار مطلوب'),
```
In `getGroupHomework`, change:
```ts
    const { halqa, specialTrack, teacher } = req.query;
    const filter: Record<string, unknown> = {};
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    if (teacher)       filter.teacher      = teacher;
    const hw = await GroupHomework.find(filter)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('specialTrack', 'title')
      .sort({ dueDate: -1 });
```
to:
```ts
    const { track, teacher } = req.query;
    const filter: Record<string, unknown> = {};
    if (track)   filter.track   = track;
    if (teacher) filter.teacher = teacher;
    const hw = await GroupHomework.find(filter)
      .populate('teacher', 'name')
      .populate('track', 'title')
      .sort({ dueDate: -1 });
```

- [ ] **Step 5: `LessonRecording.model.ts`**

Change interface fields:
```ts
  halqa?: Schema.Types.ObjectId;
  specialTrack?: Schema.Types.ObjectId;
```
to:
```ts
  track: Schema.Types.ObjectId;
```
Change schema fields:
```ts
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
```
to:
```ts
    track: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
```
Change `lessonRecordingSchema.index({ specialTrack: 1, recordedAt: -1 });` to `lessonRecordingSchema.index({ track: 1, recordedAt: -1 });`.

- [ ] **Step 6: `lesson-recording.controller.ts`**

Change the `recordingSchema` zod object's fields:
```ts
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
```
to:
```ts
  track: z.string().min(1, 'المسار مطلوب'),
```
In `getRecordings`, change:
```ts
    const { student, teacher, halqa, specialTrack } = req.query;
    const filter: Record<string, unknown> = {};
    if (student)      filter.student      = student;
    if (teacher)      filter.teacher      = teacher;
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    const recordings = await LessonRecording.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('specialTrack', 'title')
      .sort({ recordedAt: -1 });
```
to:
```ts
    const { student, teacher, track } = req.query;
    const filter: Record<string, unknown> = {};
    if (student) filter.student = student;
    if (teacher) filter.teacher = teacher;
    if (track)   filter.track   = track;
    const recordings = await LessonRecording.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('track', 'title')
      .sort({ recordedAt: -1 });
```

- [ ] **Step 7: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: all six files resolve cleanly against `Track`.

- [ ] **Step 8: Commit**

```bash
git add quran-hifz-server/src/models/Homework.model.ts quran-hifz-server/src/controllers/homework.controller.ts quran-hifz-server/src/models/GroupHomework.model.ts quran-hifz-server/src/controllers/group-homework.controller.ts quran-hifz-server/src/models/LessonRecording.model.ts quran-hifz-server/src/controllers/lesson-recording.controller.ts
git commit -m "feat: Homework, GroupHomework, LessonRecording use a single required track field"
```

---

## Task 10: `QuranPlan` model + controller — `targetType` drops `'halqa'`, `specialTrack` renamed to `track`

**Files:**
- Modify: `quran-hifz-server/src/models/QuranPlan.model.ts`
- Modify: `quran-hifz-server/src/controllers/quran-plan.controller.ts`
- Modify: `quran-hifz-server/src/lib/planStudents.ts`

**Interfaces:**
- Consumes: `Track` (Task 2), `Student.track` (Task 5).
- Produces: `IQuranPlan.targetType: 'track' | 'students'`, `IQuranPlan.track?: ObjectId` (renamed from `specialTrack`) — consumed by Task 11 (`parent.controller.ts`, `stats.controller.ts`), Task 14 (seed scripts).

- [ ] **Step 1: Read the live `QuranPlan.model.ts` and `quran-plan.controller.ts` first**

These two files were extensively modified by the earlier same-day-segments plan this session — read their CURRENT full content before editing (do not assume the pre-segments shape). Locate:
- The `targetType` field definition (interface + schema `enum`).
- The `halqa?`/`students?`/`specialTrack?` field trio (interface + schema).
- Every `if (data.targetType === 'halqa') ...` / `'specialTrack'` branch in the create-schema's `superRefine` and in `withPlanComputed`/`getPlans`'s query filter.

- [ ] **Step 2: Update the model**

In `IQuranPlan`, change:
```ts
  targetType: 'halqa' | 'students' | 'specialTrack';
  halqa?: Types.ObjectId;
  students?: Types.ObjectId[];
  specialTrack?: Types.ObjectId;
```
to:
```ts
  targetType: 'track' | 'students';
  students?: Types.ObjectId[];
  track?: Types.ObjectId;
```
In the schema, change:
```ts
    targetType:   { type: String, enum: ['halqa', 'students', 'specialTrack'], required: true },
    halqa?:       { type: Schema.Types.ObjectId, ref: 'Halqa' },
    students?:    [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    specialTrack?: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
```
(exact original field names/formatting may differ slightly — match the live file's style) to:
```ts
    targetType: { type: String, enum: ['track', 'students'], required: true },
    students:   [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    track:      { type: Schema.Types.ObjectId, ref: 'Track' },
```
Update the indexes: replace `quranPlanSchema.index({ halqa: 1 });` with nothing (no replacement needed — `track` doesn't need its own dedicated index unless the live file's query patterns show otherwise; check `getPlans`'s filter usage) and rename `quranPlanSchema.index({ specialTrack: 1 });` to `quranPlanSchema.index({ track: 1 });` if such indexes exist in the live file.

- [ ] **Step 3: Update the controller**

In `quran-hifz-server/src/controllers/quran-plan.controller.ts`:
- `quranPlanSchema` (zod): remove `halqa: z.string().min(1).optional()`; rename `specialTrack: z.string().min(1).optional()` to `track: z.string().min(1).optional()`; update `targetType: z.enum(['halqa', 'students', 'specialTrack'])` to `targetType: z.enum(['track', 'students'])`.
- `quranPlanCreateSchema`'s `superRefine`: remove the `if (data.targetType === 'halqa' && !data.halqa) { ... }` branch entirely; rename the `if (data.targetType === 'specialTrack' && !data.specialTrack) { ... }` branch's field references from `specialTrack` to `track` (both the check and the zod issue `path`).
- `getPlans`: remove `if (halqa) filter.halqa = halqa;`; rename `if (specialTrack) filter.specialTrack = specialTrack;` to `if (track) filter.track = track;` (and the destructured query param name).
- `getPlans`/`getPlan`/`createPlan`/`updatePlan`/`generateSchedule`/`updateScheduleEntry`: every `.populate('halqa', ...)` call is removed; every `.populate('specialTrack', ...)` call is renamed to `.populate('track', ...)`.
- Any remaining reference to `plan.halqa`/`plan.specialTrack` (e.g. inside `withPlanComputed`'s rollup shaping, if it reads these fields at all — check the live file) is updated the same way: `halqa` branches removed, `specialTrack` renamed to `track`.

Because this file was heavily reworked by the prior plan and its exact current shape must be read live rather than assumed, this step is deliberately described by transformation rule rather than a full pasted replacement — apply the same "remove halqa, rename specialTrack→track" rule everywhere it appears in the file, and confirm via `grep -n "halqa\|specialTrack" quran-hifz-server/src/controllers/quran-plan.controller.ts` that nothing is missed before moving on.

- [ ] **Step 4: Update `lib/planStudents.ts`**

Replace the full content of `quran-hifz-server/src/lib/planStudents.ts`:

```ts
import { Types } from 'mongoose';
import { IQuranPlan } from '../models/QuranPlan.model';
import { Student } from '../models/Student.model';

/** Resolves which students are covered by a plan, branching on `targetType`:
 * an explicit list on the plan itself, or every student whose `track` field
 * points at the plan's target track. */
export async function getPlanStudentIds(plan: IQuranPlan): Promise<Types.ObjectId[]> {
  if (plan.targetType === 'students') {
    return (plan.students ?? []) as Types.ObjectId[];
  }
  const students = await Student.find({ track: plan.track }, '_id');
  return students.map((s) => s._id as Types.ObjectId);
}

export async function isStudentInPlan(plan: IQuranPlan, studentId: string): Promise<boolean> {
  const ids = await getPlanStudentIds(plan);
  return ids.some((id) => id.toString() === studentId);
}
```

This is dramatically simpler than the original — the old version's `'specialTrack'` branch unioned two enrollment mechanisms (`track.enrolledStudents` array + a reverse `Halqa`→`Student` lookup) purely to cope with the real-data-import quirk where a track's roster lived on its halaqat instead of its own array. With `Halqa` deleted and `Track.enrolledStudents` dropped (Task 2), `Student.track` is the only membership signal, so both former special-cases collapse to one `Student.find({ track })` query, matching exactly how the old `'halqa'` branch worked.

- [ ] **Step 5: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: `QuranPlan.model.ts`, `quran-plan.controller.ts`, `lib/planStudents.ts` resolve cleanly. `studentPlanReflow.ts` (imports from `planStudents.ts`? check — per this session's earlier reading, `studentPlanReflow.ts` does NOT import `planStudents.ts`, only `quran-plan.controller.ts` and `student-plan-progress.controller.ts` do) should be unaffected; confirm via `grep -rn "planStudents" quran-hifz-server/src` that every caller still matches the new exports (`getPlanStudentIds`, `isStudentInPlan` — both names unchanged, only internals changed, so callers need no edits).

- [ ] **Step 6: Commit**

```bash
git add quran-hifz-server/src/models/QuranPlan.model.ts quran-hifz-server/src/controllers/quran-plan.controller.ts quran-hifz-server/src/lib/planStudents.ts
git commit -m "feat: QuranPlan targets a track (not halqa), planStudents.ts simplified"
```

---

## Task 11: `parent.controller.ts` and `stats.controller.ts` — final `halqa`/`specialTrack` cleanup

**Files:**
- Modify: `quran-hifz-server/src/controllers/parent.controller.ts`
- Modify: `quran-hifz-server/src/controllers/stats.controller.ts`

**Interfaces:**
- Consumes: `Track`, `Student.track` (Tasks 2, 5).

- [ ] **Step 1: `parent.controller.ts`**

In `getChildren` (originally around line 15-17), change the populate select list from:
```ts
.populate('student', 'name path juz halqa attendancePct progressPct progressPages');
```
to:
```ts
.populate('student', 'name path juz track attendancePct progressPct progressPages');
```

In `getChildHomework` (originally lines 48-65), replace:
```ts
    const student = await Student.findById(req.params.studentId).select('halqa');
    if (!student) throw new AppError('الطالب غير موجود', 404);

    const tracks = await SpecialTrack.find({ enrolledStudents: req.params.studentId }).select('_id');
    const trackIds = tracks.map((t) => t._id);

    const [individual, group] = await Promise.all([
      Homework.find({ student: req.params.studentId }).sort({ dueDate: -1 }),
      GroupHomework.find({ $or: [{ halqa: student.halqa }, { specialTrack: { $in: trackIds } }] }).sort({ dueDate: -1 }),
    ]);
```
with:
```ts
    const student = await Student.findById(req.params.studentId).select('track');
    if (!student) throw new AppError('الطالب غير موجود', 404);

    const [individual, group] = await Promise.all([
      Homework.find({ student: req.params.studentId }).sort({ dueDate: -1 }),
      GroupHomework.find({ track: student.track }).sort({ dueDate: -1 }),
    ]);
```
(A student now belongs to exactly one track, so the old two-source `$or` — a homework group tied to their halqa OR any track they're separately enrolled in — collapses to the single track they belong to.)

Remove the now-unused `import { SpecialTrack } from '../models/SpecialTrack.model';` line at the top of the file.

- [ ] **Step 2: `stats.controller.ts`**

Replace:
```ts
import { Halqa } from '../models/Halqa.model';
import { Masjid } from '../models/Masjid.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
```
with:
```ts
import { Masjid } from '../models/Masjid.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { Track } from '../models/Track.model';
```
Replace the `Promise.all` destructuring and its array:
```ts
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalHalqat,
      totalSpecialTracks,
      totalMasajid,
      pendingHomework,
      lateHomework,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' }),
      Halqa.countDocuments(),
      SpecialTrack.countDocuments(),
      Masjid.countDocuments(),
      Homework.countDocuments({ status: 'معلق' }),
      Homework.countDocuments({ status: 'متأخر' }),
    ]);
```
with:
```ts
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalTracks,
      totalMasajid,
      pendingHomework,
      lateHomework,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' }),
      Track.countDocuments(),
      Masjid.countDocuments(),
      Homework.countDocuments({ status: 'معلق' }),
      Homework.countDocuments({ status: 'متأخر' }),
    ]);
```
And in the response object, replace:
```ts
        totalHalqat,
        totalSpecialTracks,
```
with:
```ts
        totalTracks,
```
(the response's field NAME changes from `totalHalqat`/`totalSpecialTracks` to a single `totalTracks` — this is a wire-format change that phase 2/3's dashboard consumers must pick up; note it prominently in the phase-1 handoff since it's a silent-breakage risk for any web/mobile code still reading `data.totalHalqat`).

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: both files resolve cleanly. Run a final full-project sweep: `grep -rn "Halqa\|SpecialTrack\|specialTrack" quran-hifz-server/src --include="*.ts" | grep -v "seeds/"` (seed scripts are Task 14) — this should now return **zero results** outside the seeds directory. If anything remains, it was missed by this plan's task list — fix it here as an addendum to this task, and note what was missed for the final review.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src/controllers/parent.controller.ts quran-hifz-server/src/controllers/stats.controller.ts
git commit -m "feat: parent and stats controllers use Track/Student.track (final non-seed cleanup)"
```

---

## Task 12: Rewrite `seed.ts`

**Files:**
- Modify: `quran-hifz-server/src/seeds/seed.ts`

**Interfaces:**
- Consumes: every model from Tasks 1-11.
- Produces: fresh seed data matching the new schema, including at least one masjid of each gender and a same-day حفظ+مراجعة demo plan (mirroring what was hand-added to the pre-restructure seed this session — re-add it here in the new shape).

- [ ] **Step 1: Read the current live `seed.ts` in full** (it was modified earlier this session to add a demo same-day-segments plan and a second teacher account — read the actual current file, don't assume the version quoted earlier in this conversation is still exactly current).

- [ ] **Step 2: Rewrite the seed data to the new shape**

Apply these transformations to the live file:
- Remove the `Halqa` import; import `Track` instead of `SpecialTrack`.
- The `masajid` seed array: add `gender: 'male'` or `gender: 'female'` to each entry, and rename entries to real proper names without a جامع/دار prefix (e.g. `{ name: 'الفاروق', location: 'حي العماير الشمالي', gender: 'male' }` instead of `{ name: 'مسجد الفاروق', ... }` — drop the "مسجد" prefix from `name` too, matching the same "label derived from gender, not stored in name" rule Masjid now follows. Add at least one `gender: 'female'` masjid so both display labels are exercised in fresh seed data (the current seed has zero female masajid — add one, e.g. "خديجة" per the user's own real example).
- Remove the `halqat` seed array (`Halqa.insertMany([...])`) entirely.
- Add a `tracks` seed array (`Track.insertMany([...])`) — each track needs `masjid` (pick from the masajid array), `title`, `type`, `status`, `startDate`, `endDate`, `daysPerWeek`, `timeSlot`, `isOnline`, `teachers` (array of teacher `_id`s), `maxStudents`. No `enrolledStudents` field (dropped). No `location` field (dropped). Create at least 3-5 tracks spread across a mix of male and female masajid, matching the spirit of the original 5 halqat this replaces.
- Every `Student.insertMany([...])` entry: remove `halqa`/`masjid` fields, add `track` (pointing at one of the new track `_id`s).
- Every place a `hOmar`/`hAbuBakr`/etc. (halqa) variable was destructured and referenced (attendance seed, homework seed, group homework seed, lesson recording seed, the demo QuranPlan) — replace with the equivalent track variable and field name (`track: tSomeTrack._id` instead of `halqa: hOmar._id`).
- The `QuranPlan.insertMany([...])` array: every entry's `targetType: 'halqa'` becomes `targetType: 'track'` with a `track` field (not `halqa`); every `targetType: 'specialTrack'` becomes `targetType: 'track'` too (rename the field, `specialTrack` → `track`) — note this MERGES what were two different targetType values into one, so a plan that used to target a `specialTrack` and one that used to target a `halqa` are now indistinguishable by shape, only by which track they point at. The demo same-day حفظ+مراجعة plan (added earlier this session, targeting `hAli`/`tFaisal`) must be re-pointed at one of the new tracks instead of a halqa.
- `Attendance.insertMany([...])`/`Homework.insertMany([...])`/`GroupHomework.insertMany([...])`/`LessonRecording.insertMany([...])` seed entries: replace `halqa`/`specialTrack` fields with `track`.
- The `SpecialTrack.insertMany([...])` call (the Ramadan intensive track) becomes a `Track.insertMany([...])` entry like every other track — it's no longer a structurally different kind of thing, just another track (this was the whole point of the merge). Fold it into the unified `tracks` array from this step rather than keeping it as a separate insert call.
- Add a second teacher `User` login (this session already added `faisal@quran-hifz.sa`/`teacher123` for the demo plan's teacher — keep that addition, re-pointed at whichever track now carries the demo plan) if the live file still has it; if not, skip (not this task's job to re-add something already removed intentionally).
- Update every `console.log` count message that mentions "حلقة"/"halqat" to mention "مسار"/tracks instead, and update the final printed login-credentials block if any new/changed accounts were introduced.

- [ ] **Step 3: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: `seed.ts` resolves cleanly.

- [ ] **Step 4: Commit**

```bash
git add quran-hifz-server/src/seeds/seed.ts
git commit -m "feat: rewrite seed.ts for the Track/Masjid restructure"
```

---

## Task 13: Rewrite `wipe-all.ts`, `backfillPlans.ts`, `import-real-halaqat.ts`

**Files:**
- Modify: `quran-hifz-server/src/seeds/wipe-all.ts`
- Modify: `quran-hifz-server/src/seeds/backfillPlans.ts`
- Modify: `quran-hifz-server/src/seeds/import-real-halaqat.ts`

- [ ] **Step 1: `wipe-all.ts`**

Change the import block:
```ts
import { Attendance } from '../models/Attendance.model';
import { Evaluation } from '../models/Evaluation.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { Halqa } from '../models/Halqa.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Homework } from '../models/Homework.model';
import { IndividualPlan } from '../models/IndividualPlan.model';
import { KPI } from '../models/KPI.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { Masjid } from '../models/Masjid.model';
import { Message } from '../models/Message.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { Student } from '../models/Student.model';
import { StudentPlanProgress } from '../models/StudentPlanProgress.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';

const MODELS: mongoose.Model<any>[] = [
  Attendance, Evaluation, GroupHomework, Halqa, HifzEntry, Homework,
  IndividualPlan, KPI, LessonRecording, Masjid, Message, ParentStudent,
  QuranPlan, SpecialTrack, Student, StudentPlanProgress, Teacher, User,
];
```
to:
```ts
import { Attendance } from '../models/Attendance.model';
import { Evaluation } from '../models/Evaluation.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Homework } from '../models/Homework.model';
import { IndividualPlan } from '../models/IndividualPlan.model';
import { KPI } from '../models/KPI.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { Masjid } from '../models/Masjid.model';
import { Message } from '../models/Message.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { StudentPlanProgress } from '../models/StudentPlanProgress.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';

const MODELS: mongoose.Model<any>[] = [
  Attendance, Evaluation, GroupHomework, HifzEntry, Homework,
  IndividualPlan, KPI, LessonRecording, Masjid, Message, ParentStudent,
  QuranPlan, Track, Student, StudentPlanProgress, Teacher, User,
];
```

- [ ] **Step 2: `backfillPlans.ts`**

Replace the full content of `quran-hifz-server/src/seeds/backfillPlans.ts`:

```ts
/**
 * Additive-only script — for every Track that has no QuranPlan producing a
 * "today" assignment, creates one so the merged "الحضور والتقييم" page
 * always has something to show. Never deletes or modifies existing data
 * (unlike seed.ts, which wipes the database — do NOT use that for this).
 * Run:  npx ts-node src/seeds/backfillPlans.ts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { Track } from '../models/Track.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { WEEK_DAYS, computeMultiTodayAssignments, pageRangeOfAyahRange } from '../lib/quranRange';

// A modest, multi-page starting range (Al-Fatiha + most of Al-Baqarah's first
// juz') so the day's assignment banner has something meaningful to show.
const DEFAULT_RANGE = {
  rangeStart: { surahNumber: 1, ayah: 1 },
  rangeEnd:   { surahNumber: 2, ayah: 141 },
};
// sliceForOccurrence divides by whole mushaf pages, not ayahs — activeDaysCount
// must not exceed the range's page count, or every non-final day gets nothing
// assigned (dailyPages floors to 0). One page/day keeps every day non-empty.
const DEFAULT_ACTIVE_DAYS = pageRangeOfAyahRange(DEFAULT_RANGE.rangeStart, DEFAULT_RANGE.rangeEnd).pageCount;

async function backfill(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const [tracks, existingPlans] = await Promise.all([
    Track.find({}).select('title teachers'),
    QuranPlan.find({}).select('track segments days startDate endType activeDaysCount endDate rangeStart rangeEnd type'),
  ]);

  const today = new Date();
  let created = 0;

  /** Whether a plan has a ward due today, reading through its segments and
   * migrating a legacy single-track document on the fly (mirrors
   * normalizePlanSegments in quran-plan.controller.ts). */
  const hasWardToday = (p: typeof existingPlans[number]) => {
    const segments = (p.segments && p.segments.length > 0)
      ? p.segments.map((s) => ({ type: s.type, days: s.days, rangeStart: s.rangeStart, rangeEnd: s.rangeEnd }))
      : (p.type && p.days && p.rangeStart && p.rangeEnd)
        ? [{ type: p.type, days: p.days, rangeStart: p.rangeStart, rangeEnd: p.rangeEnd }]
        : [];
    if (segments.length === 0) return false;
    return computeMultiTodayAssignments({
      startDate: p.startDate, holidays: p.holidays,
      endType: p.endType, activeDaysCount: p.activeDaysCount, endDate: p.endDate,
      segments,
    }, today).length > 0;
  };

  for (const track of tracks) {
    if (!track.teachers || track.teachers.length === 0) continue;
    const hasToday = existingPlans
      .filter((p) => p.track && String(p.track) === String(track._id))
      .some(hasWardToday);
    if (hasToday) continue;

    await QuranPlan.create({
      name: `خطة حفظ يومية — ${track.title}`,
      description: 'خطة تلقائية لضمان وجود مقرر يومي (تمت إضافتها تلقائيًا، لا تحذف البيانات الأخرى).',
      teacher: track.teachers[0],
      targetType: 'track',
      track: track._id,
      // One segment: these auto-plans exist only to guarantee a daily ward.
      segments: [{ type: 'حفظ', days: [...WEEK_DAYS], ...DEFAULT_RANGE, schedule: [] }],
      startDate: today,
      pointsEnabled: false,
      pointRules: [],
      endType: 'activeDays',
      activeDaysCount: DEFAULT_ACTIVE_DAYS,
      status: 'نشطة',
    });
    created++;
    console.log(`  + خطة جديدة لمسار "${track.title}"`);
  }

  console.log(`\n✅  اكتمل — تمت إضافة ${created} خطة جديدة (لم يُحذف أي شيء).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: `import-real-halaqat.ts`**

This script imports a one-off real dataset (`all_6_halaqat_complete_data.json`) shaped around the OLD `course → halaqat → students` hierarchy — every `RawCourse`/`RawHalqa` maps directly onto a `Track`/nothing (no intermediate level), since the new model has no halqa layer at all. Replace the full content of `quran-hifz-server/src/seeds/import-real-halaqat.ts`:

```ts
/**
 * One-time import of real track/teacher/student data.
 * Run:  npm run import-real-data
 *
 * Expects an EMPTY database — this script only inserts, it does not
 * upsert or wipe first. Re-running it against a non-empty database
 * will duplicate everything.
 */
import fs from 'fs';
import mongoose, { Schema } from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';

const DATA_PATH = '/Volumes/Data/work/quran hifz platform/all_6_halaqat_complete_data.json';

// Only 2 courses in this dataset — hardcoding their masjid/gender beats
// fragile regex-parsing of the Arabic track name for a one-off script.
const COURSE_MASJID: Record<string, { name: string; gender: 'male' | 'female' }> = {
  'rawad-itqan-boys':   { name: 'الأمير متعب بن عبد العزيز', gender: 'male' },
  'raidat-itqan-girls': { name: 'مركز العماير', gender: 'female' },
};

const EMAIL_DOMAIN = 'tahfeez.com';
const ROLE_PASSWORD: Record<'teacher' | 'student', string> = {
  teacher: 'teacher@123',
  student: 'student@123',
};

// Source dataset has no admin account — seed one so the imported DB is usable.
const ADMIN_ACCOUNT = {
  name:     'مدير النظام',
  email:    `admin@${EMAIL_DOMAIN}`,
  password: 'admin@123',
};

function toNewEmail(originalEmail: string): string {
  const localPart = originalEmail.split('@')[0];
  return `${localPart}@${EMAIL_DOMAIN}`;
}

interface RawAccount {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  mustChangePassword?: boolean;
}

interface RawStudent extends RawAccount {
  level: number;
}

interface RawHalqa {
  id: string;
  name: string;
  teacher: RawAccount;
  students: RawStudent[];
  totals: { students: number; teachers: number; accounts: number };
}

interface RawCourse {
  id: string;
  name: string;
  type: 'boys' | 'girls';
  halaqat: RawHalqa[];
}

interface RawData {
  generatedAt: string;
  courses: RawCourse[];
  totals: { courses: number; halaqat: number; students: number; teachers: number; accounts: number };
}

async function importData(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const data: RawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const generatedDate = new Date(data.generatedAt);

  let trackCount = 0;
  let teacherCount = 0;
  let studentCount = 0;
  let userCount = 0;

  await new User({
    name:     ADMIN_ACCOUNT.name,
    email:    ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
    role:     'admin',
    isActive: true,
  }).save();
  userCount++;
  console.log(`👤  Seeded admin account: ${ADMIN_ACCOUNT.email}`);

  for (const courseJson of data.courses) {
    const masjidInfo = COURSE_MASJID[courseJson.id] ?? { name: courseJson.name, gender: 'male' as const };
    const masjid = await Masjid.create({ name: masjidInfo.name, location: masjidInfo.name, gender: masjidInfo.gender });

    // The old data had one Track per course with several Halqat underneath
    // sharing it; the new model has no halqa layer, so this becomes ONE
    // track per original halqa instead (each keeps its own teacher and
    // roster) rather than one track per course with several sub-groups.
    for (const halqaJson of courseJson.halaqat) {
      const teacherDoc = await Teacher.create({ name: halqaJson.teacher.name });
      teacherCount++;

      await new User({
        name:               halqaJson.teacher.name,
        email:              toNewEmail(halqaJson.teacher.email),
        password:           ROLE_PASSWORD.teacher,
        role:               'teacher',
        profileId:          teacherDoc._id,
        mustChangePassword: halqaJson.teacher.mustChangePassword ?? true,
      }).save();
      userCount++;

      // startDate/endDate/daysPerWeek/timeSlot are not in the source data —
      // placeholder values, same "لم يُحدَّد" convention as before.
      const track = await Track.create({
        masjid:      masjid._id,
        title:       halqaJson.name,
        type:        courseJson.type,
        status:      'active',
        startDate:   generatedDate,
        endDate:     generatedDate,
        daysPerWeek: 'لم يُحدَّد',
        timeSlot:    'لم يُحدَّد',
        isOnline:    false,
        teachers:    [teacherDoc._id as unknown as Schema.Types.ObjectId],
        maxStudents: halqaJson.totals.students,
      });
      trackCount++;

      for (const studentJson of halqaJson.students) {
        const studentDoc = await Student.create({
          name:  studentJson.name,
          track: track._id,
          level: studentJson.level,
        });
        studentCount++;

        await new User({
          name:               studentJson.name,
          email:              toNewEmail(studentJson.email),
          password:           ROLE_PASSWORD.student,
          role:               'student',
          profileId:          studentDoc._id,
          mustChangePassword: studentJson.mustChangePassword ?? true,
        }).save();
        userCount++;
      }
    }
  }

  console.log(`📚  Tracks:   ${trackCount} (expected ${data.totals.halaqat})`);
  console.log(`👨‍🏫  Teachers: ${teacherCount} (expected ${data.totals.teachers})`);
  console.log(`🧑‍🎓  Students: ${studentCount} (expected ${data.totals.students})`);
  console.log(`👤  Users:    ${userCount} (expected ${data.totals.accounts + 1} — includes 1 admin)`);

  await mongoose.disconnect();
  console.log('✅  Import complete — database disconnected');
}

importData().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
```

Note the structural decision made here: the old model had `course → several halaqat → students`, with the course itself becoming a `SpecialTrack` and each halqa becoming a `Halqa` pointing at it. Since there's no halqa layer any more, this script now makes **each original halqa its own `Track`** (keeping its own teacher and roster intact), rather than trying to collapse all of a course's halaqat into one combined track (which would merge multiple teachers/rosters that were previously kept separate). This is a judgment call specific to this one-off import script — flag it in the final review if the real dataset's structure makes a different choice more appropriate once someone actually re-runs this against real data.

- [ ] **Step 4: Typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: all three files resolve cleanly. Run the final full sweep again: `grep -rn "Halqa\|SpecialTrack\|specialTrack" quran-hifz-server/src --include="*.ts"` — expect **zero results** anywhere in the server now.

- [ ] **Step 5: Commit**

```bash
git add quran-hifz-server/src/seeds/wipe-all.ts quran-hifz-server/src/seeds/backfillPlans.ts quran-hifz-server/src/seeds/import-real-halaqat.ts
git commit -m "feat: rewrite wipe-all/backfillPlans/import-real-halaqat for the Track restructure"
```

---

## Task 14: End-to-end verification — wipe, reseed, smoke-test the API

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `cd quran-hifz-server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Wipe and reseed**

```bash
cd quran-hifz-server
npx ts-node --transpile-only src/seeds/wipe-all.ts
npx ts-node --transpile-only src/seeds/seed.ts
```
Expected: both scripts complete without throwing, and the seed script's final log shows tracks/masajid/students created with no reference to "حلقة"/halqat anywhere in its output.

- [ ] **Step 3: Start the dev server and smoke-test key endpoints**

Run: `npx ts-node-dev --transpile-only src/server.ts` (or the project's established dev-server command), then in another shell, log in as a seeded teacher and confirm:
- `GET /api/masajid` returns masajid with a `gender` field and a nested `tracks` list, no `halqat` field anywhere in the response.
- `GET /api/tracks` returns tracks each with a populated `masjid` (including `gender`), no `location` field, no `enrolledStudents` field.
- `GET /api/students?track=<id>` returns only students whose `track` matches.
- `GET /api/quran-plans` returns plans with `targetType: 'track'` or `'students'` only — confirm the same-day حفظ+مراجعة demo plan (re-seeded in Task 12) still resolves `todayAssignments` correctly (this exercises that the earlier same-day-segments feature is genuinely unaffected by this restructure, per the spec's non-goals).
- `POST /api/attendance/bulk` and `POST /api/evaluations/bulk` with a `track` id (no `halqa`/`specialTrack`) succeed and each produce exactly one `Attendance`/`Evaluation` document per student per date.

If a real MongoDB connection or long-lived dev server isn't feasible in the execution environment, substitute careful code-tracing of the same scenarios against the final committed source, and say so explicitly in the report rather than silently skipping verification.

- [ ] **Step 4: Report any discrepancy**

If any check in Steps 2-3 fails or behaves unexpectedly, do not fix it silently as part of "verification" — report it clearly with file:line evidence, the same way Task 14 of the prior same-day-segments plan did, so the controller (or a fresh chat session picking this plan up) can triage it explicitly.
