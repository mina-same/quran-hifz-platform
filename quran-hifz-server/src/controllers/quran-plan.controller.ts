import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuranPlan } from '../models/QuranPlan.model';
import { AppError } from '../middleware/error';
import { SURAHS } from '../data/surahs';
import {
  WEEK_DAYS, computeTodayAssignment, computePlanProgress, computeJuzProgress, computeScheduleBreakdown,
  pageRangeOfAyahRange, toFlatIndex, pageOfFlatIndex, juzOfFlatIndex,
} from '../lib/quranRange';

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

const pointRuleSchema = z.object({
  label:  z.string().min(1),
  amount: z.number().int().positive(),
  kind:   z.enum(['خصم', 'زيادة']),
});

const rangePointSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayah:        z.number().int().min(1),
});

const quranPlanSchema = z.object({
  name:        z.string().min(1),
  type:        z.enum(['حفظ', 'مراجعة', 'ترتيل', 'تلاوة']),
  description: z.string().optional(),
  teacher:     z.string().min(1),

  targetType:   z.enum(['halqa', 'students', 'specialTrack']),
  halqa:        z.string().min(1).optional(),
  students:     z.array(z.string().min(1)).optional(),
  specialTrack: z.string().min(1).optional(),

  days:      z.array(z.enum(WEEK_DAYS)).min(1),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح').optional(),

  rangeStart: rangePointSchema,
  rangeEnd:   rangePointSchema,

  pointsEnabled: z.boolean().default(false),
  pointRules:    z.array(pointRuleSchema).default([]),

  endType:         z.enum(['activeDays', 'date']),
  activeDaysCount: z.number().int().min(1).optional(),
  endDate:         z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح').optional(),
});

// `.superRefine` returns a ZodEffects, which has no `.partial()` — kept as a separate
// schema (used only for create) so `updatePlan` can still call `quranPlanSchema.partial()`,
// same convention as homework.controller.ts's separate create/review schemas.
const quranPlanCreateSchema = quranPlanSchema.superRefine((data, ctx) => {
  if (data.targetType === 'halqa' && !data.halqa) {
    ctx.addIssue({ code: 'custom', message: 'يجب اختيار حلقة', path: ['halqa'] });
  }
  if (data.targetType === 'students' && (!data.students || data.students.length === 0)) {
    ctx.addIssue({ code: 'custom', message: 'يجب اختيار طالب واحد على الأقل', path: ['students'] });
  }
  if (data.targetType === 'specialTrack' && !data.specialTrack) {
    ctx.addIssue({ code: 'custom', message: 'يجب اختيار المسار الاستثنائي', path: ['specialTrack'] });
  }
  if (data.endType === 'activeDays' && !data.activeDaysCount) {
    ctx.addIssue({ code: 'custom', message: 'يجب تحديد عدد الأيام النشطة', path: ['activeDaysCount'] });
  }
  if (data.endType === 'date' && !data.endDate) {
    ctx.addIssue({ code: 'custom', message: 'يجب تحديد تاريخ الانتهاء', path: ['endDate'] });
  }

  // rangeStart is deliberately allowed to sit after rangeEnd in mushaf order —
  // a reverse-direction plan (e.g. starting at An-Nas and working backward
  // toward Al-Fatiha), handled by sliceForOccurrence/computeScheduleBreakdown.

  for (const [key, point] of [['rangeStart', data.rangeStart], ['rangeEnd', data.rangeEnd]] as const) {
    const surah = SURAH_BY_NUMBER.get(point.surahNumber);
    if (surah && point.ayah > surah.ayahCount) {
      ctx.addIssue({ code: 'custom', message: `سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, path: [key, 'ayah'] });
    }
  }
});

function withTodayAssignment(plan: InstanceType<typeof QuranPlan>) {
  const obj = plan.toObject();
  const scheduleInput = {
    days:            plan.days,
    startDate:       plan.startDate,
    endType:         plan.endType,
    activeDaysCount: plan.activeDaysCount,
    endDate:         plan.endDate,
    rangeStart:      plan.rangeStart,
    rangeEnd:        plan.rangeEnd,
  };
  const progress = computePlanProgress(scheduleInput);
  // Once a teacher freezes the schedule (generateSchedule), the persisted
  // array wins over live recomputation — that's the whole point: it survives
  // later config edits and can carry hand-adjusted days without being wiped
  // on every fetch. Plans that never had it generated fall back to the
  // always-fresh live computation, same as before this field existed.
  const persisted = plan.schedule && plan.schedule.length > 0;
  return {
    ...obj,
    todayAssignment: computeTodayAssignment(scheduleInput),
    progress,
    juzProgress:     computeJuzProgress(scheduleInput, progress),
    pageRange:       pageRangeOfAyahRange(plan.rangeStart, plan.rangeEnd),
    schedule:        persisted
      ? obj.schedule.map((s: { date: Date }) => ({ ...s, date: new Date(s.date).toISOString() }))
      : computeScheduleBreakdown(scheduleInput),
    scheduleIsPersisted: persisted,
  };
}

export async function getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacher, halqa, student, specialTrack } = req.query;
    const filter: Record<string, unknown> = {};
    if (teacher)     filter.teacher     = teacher;
    if (halqa)       filter.halqa       = halqa;
    if (student)     filter.students    = student;
    if (specialTrack) filter.specialTrack = specialTrack;

    const plans = await QuranPlan.find(filter)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: plans.length, data: plans.map(withTodayAssignment) });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plan = await QuranPlan.findById(req.params.id)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title');
    if (!plan) throw new AppError('الخطة غير موجودة', 404);
    res.json({ success: true, data: withTodayAssignment(plan) });
  } catch (err) {
    next(err);
  }
}

export async function createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = quranPlanCreateSchema.parse(req.body);
    const plan = await QuranPlan.create({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate:   data.endDate ? new Date(data.endDate) : undefined,
    });
    res.status(201).json({ success: true, data: withTodayAssignment(plan) });
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = quranPlanSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate)   update.endDate   = new Date(data.endDate);

    const plan = await QuranPlan.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title');
    if (!plan) throw new AppError('الخطة غير موجودة', 404);
    res.json({ success: true, data: withTodayAssignment(plan) });
  } catch (err) {
    next(err);
  }
}

/** Freezes the plan's live-computed day-by-day schedule into `plan.schedule`
 * so it's a real, persisted record instead of a value re-derived on every
 * fetch — any authenticated teacher may do this (not just the plan's creator,
 * so co-teachers on a shared halqa/track can all manage it). Re-running this
 * while a schedule is already persisted re-freezes from the current live
 * computation, discarding any earlier persisted version (including
 * hand-edits) — the caller decides when that's appropriate. */
export async function generateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plan = await QuranPlan.findById(req.params.id);
    if (!plan) throw new AppError('الخطة غير موجودة', 404);

    const scheduleInput = {
      days: plan.days, startDate: plan.startDate,
      endType: plan.endType, activeDaysCount: plan.activeDaysCount, endDate: plan.endDate,
      rangeStart: plan.rangeStart, rangeEnd: plan.rangeEnd,
    };
    plan.schedule = computeScheduleBreakdown(scheduleInput).map((s) => ({ ...s, date: new Date(s.date) }));
    await plan.save();

    const populated = await QuranPlan.findById(plan._id)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title');
    res.json({ success: true, data: withTodayAssignment(populated!) });
  } catch (err) {
    next(err);
  }
}

const scheduleEntryUpdateSchema = z.object({
  surahStart: z.number().int().min(1).max(114),
  ayahStart:  z.number().int().min(1),
  surahEnd:   z.number().int().min(1).max(114),
  ayahEnd:    z.number().int().min(1),
  // Optional manual overrides — when omitted, derived from the ayah range as
  // before; when given, the teacher's own page/juz' number wins outright
  // (e.g. to correct a mushaf edition mismatch), no cross-check against the
  // ayah range.
  pageStart: z.number().int().min(1).max(604).optional(),
  pageEnd:   z.number().int().min(1).max(604).optional(),
  juz:       z.number().int().min(1).max(30).optional(),
});

/** Hand-edits one day's assigned range within an already-persisted schedule
 * (see generateSchedule). Page range and juz' default to being recomputed
 * server-side from the new ayah range, but the teacher may override either
 * with their own number (e.g. to correct a mushaf edition mismatch) via the
 * optional `pageStart`/`pageEnd`/`juz` fields. */
export async function updateScheduleEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const occurrenceIndex = Number(req.params.occurrenceIndex);
    const data = scheduleEntryUpdateSchema.parse(req.body);

    const startsBeforeEnd =
      data.surahStart < data.surahEnd ||
      (data.surahStart === data.surahEnd && data.ayahStart <= data.ayahEnd);
    if (!startsBeforeEnd) throw new AppError('نقطة البداية يجب أن تسبق نقطة النهاية', 400);

    for (const [surahNumber, ayah] of [
      [data.surahStart, data.ayahStart],
      [data.surahEnd, data.ayahEnd],
    ] as const) {
      const surah = SURAH_BY_NUMBER.get(surahNumber);
      if (surah && ayah > surah.ayahCount) {
        throw new AppError(`سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, 400);
      }
    }

    const plan = await QuranPlan.findById(req.params.id);
    if (!plan) throw new AppError('الخطة غير موجودة', 404);

    const entry = plan.schedule.find((s) => s.occurrenceIndex === occurrenceIndex);
    if (!entry) throw new AppError('لم يتم العثور على هذا اليوم — يجب حفظ توزيع الأيام أولاً', 404);

    if (data.pageStart != null && data.pageEnd != null && data.pageStart > data.pageEnd) {
      throw new AppError('صفحة البداية يجب أن تسبق صفحة النهاية', 400);
    }

    const startFlat = toFlatIndex({ surahNumber: data.surahStart, ayah: data.ayahStart });
    const endFlat = toFlatIndex({ surahNumber: data.surahEnd, ayah: data.ayahEnd });

    entry.surahStart = data.surahStart;
    entry.ayahStart = data.ayahStart;
    entry.surahEnd = data.surahEnd;
    entry.ayahEnd = data.ayahEnd;
    entry.pageStart = data.pageStart ?? pageOfFlatIndex(startFlat);
    entry.pageEnd = data.pageEnd ?? pageOfFlatIndex(endFlat);
    entry.juz = data.juz ?? juzOfFlatIndex(startFlat);

    await plan.save();

    const populated = await QuranPlan.findById(plan._id)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title');
    res.json({ success: true, data: withTodayAssignment(populated!) });
  } catch (err) {
    next(err);
  }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plan = await QuranPlan.findByIdAndDelete(req.params.id);
    if (!plan) throw new AppError('الخطة غير موجودة', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
