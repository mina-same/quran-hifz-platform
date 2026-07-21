import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuranPlan } from '../models/QuranPlan.model';
import { StudentPlanProgress } from '../models/StudentPlanProgress.model';
import { AppError } from '../middleware/error';
import { SURAHS } from '../data/surahs';
import { isStudentInPlan } from '../lib/planStudents';
import { initStudentOccurrences, reflowStudentPlan, reflowAll } from '../lib/studentPlanReflow';
import { toFlatIndex, pageOfFlatIndex, juzOfFlatIndex } from '../lib/quranRange';

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

async function loadPlanAndValidateStudent(planId: string, studentId: string) {
  const plan = await QuranPlan.findById(planId);
  if (!plan) throw new AppError('الخطة غير موجودة', 404);
  const covered = await isStudentInPlan(plan, studentId);
  if (!covered) throw new AppError('هذا الطالب غير مشمول بهذه الخطة', 404);
  return plan;
}

async function getOrInitProgress(planId: string, studentId: string, plan: InstanceType<typeof QuranPlan>) {
  let doc = await StudentPlanProgress.findOne({ plan: planId, student: studentId });
  if (!doc) {
    doc = await StudentPlanProgress.create({
      plan: planId,
      student: studentId,
      occurrences: initStudentOccurrences(plan),
      overflowPages: 0,
    });
  }
  return doc;
}

function withIso(doc: InstanceType<typeof StudentPlanProgress>) {
  const obj = doc.toObject();
  return { ...obj, occurrences: obj.occurrences.map((o: { date: Date }) => ({ ...o, date: new Date(o.date).toISOString() })) };
}

/** Returns the student's effective schedule: the shared plan's own schedule
 * (unchanged current behavior) if no per-student overlay exists yet, or the
 * persisted per-student overlay once one has been created by an event. */
export async function getStudentProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const plan = await loadPlanAndValidateStudent(planId, studentId);

    const doc = await StudentPlanProgress.findOne({ plan: planId, student: studentId });
    if (!doc) {
      // Same shape as a persisted overlay's occurrences (status/manualOverride/
      // base* included, defaulted) — not just the plan's bare ScheduleEntry[] —
      // so clients never have to special-case "no overlay yet" by field
      // presence, only by the `progressIsPersisted` flag.
      const effectiveSchedule = initStudentOccurrences(plan).map((o) => ({ ...o, date: o.date.toISOString() }));
      res.json({ success: true, data: { effectiveSchedule, progressIsPersisted: false, overflowPages: 0 } });
      return;
    }

    res.json({
      success: true,
      data: { effectiveSchedule: withIso(doc).occurrences, progressIsPersisted: true, overflowPages: doc.overflowPages },
    });
  } catch (err) {
    next(err);
  }
}

const recordOccurrenceSchema = z.object({
  occurrenceIndex: z.number().int().min(1),
  status: z.enum(['done', 'partial', 'absent']),
  completedThroughSurah: z.number().int().min(1).max(114).optional(),
  completedThroughAyah: z.number().int().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'partial' && (data.completedThroughSurah == null || data.completedThroughAyah == null)) {
    ctx.addIssue({ code: 'custom', message: 'يجب تحديد السورة والآية التي وصل إليها الطالب', path: ['completedThroughAyah'] });
  }
});

/** Records what actually happened on one of a student's scheduled
 * occurrences (finished / partially finished / absent) and, when there's a
 * shortfall, reflows the remainder across the student's own remaining days —
 * lazily creating the per-student overlay on first use. */
export async function recordOccurrence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const data = recordOccurrenceSchema.parse(req.body);

    const plan = await loadPlanAndValidateStudent(planId, studentId);
    const doc = await getOrInitProgress(planId, studentId, plan);

    const entry = doc.occurrences.find((o) => o.occurrenceIndex === data.occurrenceIndex);
    if (!entry) throw new AppError('لم يتم العثور على هذا اليوم في خطة الطالب', 404);

    if (data.status === 'done') {
      entry.status = 'done';
      entry.completedThroughSurah = entry.surahEnd;
      entry.completedThroughAyah = entry.ayahEnd;
    } else if (data.status === 'absent') {
      reflowStudentPlan(doc, data.occurrenceIndex, { kind: 'absent' });
    } else {
      const surah = SURAH_BY_NUMBER.get(data.completedThroughSurah!);
      if (surah && data.completedThroughAyah! > surah.ayahCount) {
        throw new AppError(`سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, 400);
      }
      const completedFlat = toFlatIndex({ surahNumber: data.completedThroughSurah!, ayah: data.completedThroughAyah! });
      const entryStartFlat = toFlatIndex({ surahNumber: entry.surahStart, ayah: entry.ayahStart });
      const entryEndFlat = toFlatIndex({ surahNumber: entry.surahEnd, ayah: entry.ayahEnd });
      if (completedFlat < entryStartFlat || completedFlat > entryEndFlat) {
        throw new AppError('النقطة التي وصل إليها الطالب يجب أن تقع ضمن الورد المقرر لهذا اليوم', 400);
      }
      reflowStudentPlan(doc, data.occurrenceIndex, {
        kind: 'partial', completedThroughSurah: data.completedThroughSurah!, completedThroughAyah: data.completedThroughAyah!,
      });
    }

    await doc.save();
    res.json({
      success: true,
      data: { effectiveSchedule: withIso(doc).occurrences, progressIsPersisted: true, overflowPages: doc.overflowPages },
    });
  } catch (err) {
    next(err);
  }
}

const scheduleEntryUpdateSchema = z.object({
  surahStart: z.number().int().min(1).max(114),
  ayahStart: z.number().int().min(1),
  surahEnd: z.number().int().min(1).max(114),
  ayahEnd: z.number().int().min(1),
  pageStart: z.number().int().min(1).max(604).optional(),
  pageEnd: z.number().int().min(1).max(604).optional(),
  juz: z.number().int().min(1).max(30).optional(),
});

/** Hand-edits one occurrence of a single student's schedule (pins it via
 * `manualOverride` so a later reflow never overwrites it) — same shape and
 * semantics as the plan-level `updateScheduleEntry`, scoped per-student. */
export async function updateStudentScheduleEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId, occurrenceIndex: occurrenceIndexParam } = req.params;
    const occurrenceIndex = Number(occurrenceIndexParam);
    const data = scheduleEntryUpdateSchema.parse(req.body);

    const startsBeforeEnd =
      data.surahStart < data.surahEnd || (data.surahStart === data.surahEnd && data.ayahStart <= data.ayahEnd);
    if (!startsBeforeEnd) throw new AppError('نقطة البداية يجب أن تسبق نقطة النهاية', 400);

    for (const [surahNumber, ayah] of [[data.surahStart, data.ayahStart], [data.surahEnd, data.ayahEnd]] as const) {
      const surah = SURAH_BY_NUMBER.get(surahNumber);
      if (surah && ayah > surah.ayahCount) {
        throw new AppError(`سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, 400);
      }
    }
    if (data.pageStart != null && data.pageEnd != null && data.pageStart > data.pageEnd) {
      throw new AppError('صفحة البداية يجب أن تسبق صفحة النهاية', 400);
    }

    const plan = await loadPlanAndValidateStudent(planId, studentId);
    const doc = await getOrInitProgress(planId, studentId, plan);

    const entry = doc.occurrences.find((o) => o.occurrenceIndex === occurrenceIndex);
    if (!entry) throw new AppError('لم يتم العثور على هذا اليوم في خطة الطالب', 404);

    const startFlat = toFlatIndex({ surahNumber: data.surahStart, ayah: data.ayahStart });
    const endFlat = toFlatIndex({ surahNumber: data.surahEnd, ayah: data.ayahEnd });

    entry.surahStart = data.surahStart;
    entry.ayahStart = data.ayahStart;
    entry.surahEnd = data.surahEnd;
    entry.ayahEnd = data.ayahEnd;
    entry.pageStart = data.pageStart ?? pageOfFlatIndex(startFlat);
    entry.pageEnd = data.pageEnd ?? pageOfFlatIndex(endFlat);
    entry.juz = data.juz ?? juzOfFlatIndex(startFlat);
    entry.manualOverride = true;

    await doc.save();
    res.json({
      success: true,
      data: { effectiveSchedule: withIso(doc).occurrences, progressIsPersisted: true, overflowPages: doc.overflowPages },
    });
  } catch (err) {
    next(err);
  }
}

const rangePointSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
});

// Ordering is deliberately unchecked — rangeStart may sit after rangeEnd in
// mushaf order (a reverse-direction individual plan), same relaxation as the
// shared plan's own create validation.
const initStudentProgressSchema = z.object({
  rangeStart: rangePointSchema.optional(),
  rangeEnd: rangePointSchema.optional(),
}).superRefine((data, ctx) => {
  if (Boolean(data.rangeStart) !== Boolean(data.rangeEnd)) {
    ctx.addIssue({ code: 'custom', message: 'يجب تحديد نقطتي البداية والنهاية معاً', path: ['rangeEnd'] });
    return;
  }
  for (const [key, point] of [['rangeStart', data.rangeStart], ['rangeEnd', data.rangeEnd]] as const) {
    if (!point) continue;
    const surah = SURAH_BY_NUMBER.get(point.surahNumber);
    if (surah && point.ayah > surah.ayahCount) {
      ctx.addIssue({ code: 'custom', message: `سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, path: [key, 'ayah'] });
    }
  }
});

/** Deliberately creates (or, given a custom range, recreates) a student's
 * individual plan overlay right now, rather than waiting for it to happen as
 * a side effect of the first absence/edit.
 *
 * With no body: idempotent — `getOrInitProgress` returns the existing doc if
 * one already exists, else clones the base plan's own schedule.
 *
 * With `{ rangeStart, rangeEnd }`: the teacher is deliberately giving this
 * student their own memorization range (possibly a different direction than
 * the base plan) — always (re)computes and overwrites the doc's occurrences
 * from that range, discarding any prior progress/overrides, same "re-freeze
 * discards the earlier version" semantics as the plan-level generateSchedule. */
export async function initStudentProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const data = initStudentProgressSchema.parse(req.body);
    const plan = await loadPlanAndValidateStudent(planId, studentId);

    let doc;
    if (data.rangeStart && data.rangeEnd) {
      const occurrences = initStudentOccurrences(plan, { rangeStart: data.rangeStart, rangeEnd: data.rangeEnd });
      doc = await StudentPlanProgress.findOneAndUpdate(
        { plan: planId, student: studentId },
        { plan: planId, student: studentId, occurrences, overflowPages: 0, $unset: { lastReflowedAt: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } else {
      doc = await getOrInitProgress(planId, studentId, plan);
    }

    res.json({
      success: true,
      data: { effectiveSchedule: withIso(doc).occurrences, progressIsPersisted: true, overflowPages: doc.overflowPages },
    });
  } catch (err) {
    next(err);
  }
}

/** On-demand re-run of the redistribution algorithm over the student's
 * current unresolved (absent/partial) occurrences — for fixing drift after
 * several missed days accumulated, or after a manual edit changed totals. */
export async function reflowNow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const plan = await loadPlanAndValidateStudent(planId, studentId);
    const doc = await getOrInitProgress(planId, studentId, plan);

    reflowAll(doc);
    await doc.save();

    res.json({
      success: true,
      data: { effectiveSchedule: withIso(doc).occurrences, progressIsPersisted: true, overflowPages: doc.overflowPages },
    });
  } catch (err) {
    next(err);
  }
}
