import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuranPlan } from '../models/QuranPlan.model';
import { AppError } from '../middleware/error';
import { SURAHS } from '../data/surahs';
import {
  WEEK_DAYS, computeTodayAssignment, computePlanProgress, computeJuzProgress, computeScheduleBreakdown,
  pageRangeOfAyahRange, toFlatIndex, pageOfFlatIndex, juzOfFlatIndex,
  PLAN_TYPES, validateSegmentDays, segmentOccurrenceCounts, unionDays,
  type PlanSegmentInput, type PlanType, type MultiPlanInput,
} from '../lib/quranRange';
import type { IPlanSegment, IQuranPlan } from '../models/QuranPlan.model';

const SURAH_BY_NUMBER = new Map(SURAHS.map((s) => [s.number, s]));

const pointRuleSchema = z.object({
  label:  z.string().min(1),
  amount: z.number().int().positive(),
  kind:   z.enum(['خصم', 'زيادة']),
});

/** One line of the plan's daily grading rubric: a label and its degrees. */
const gradeCriterionSchema = z.object({
  key:   z.string().min(1),
  label: z.string().min(1),
  max:   z.number().int().positive(),
  auto:  z.boolean().default(false),
});

/** Rubric keys must be unique — they address the score map a teacher submits. */
const gradeRubricSchema = z
  .array(gradeCriterionSchema)
  .min(1, 'يجب إضافة بند واحد على الأقل لتقسيمة الدرجات')
  .refine((r) => new Set(r.map((c) => c.key)).size === r.length, {
    message: 'مفاتيح بنود التقييم يجب أن تكون فريدة',
  });

const rangePointSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayah:        z.number().int().min(1),
});

const planSegmentSchema = z.object({
  type:       z.enum(['حفظ', 'مراجعة']),
  days:       z.array(z.enum(WEEK_DAYS)).min(1),
  rangeStart: rangePointSchema,
  rangeEnd:   rangePointSchema,
});

const quranPlanSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  teacher:     z.string().min(1),

  targetType:   z.enum(['halqa', 'students', 'specialTrack']),
  halqa:        z.string().min(1).optional(),
  students:     z.array(z.string().min(1)).optional(),
  specialTrack: z.string().min(1).optional(),

  /** One track per type. Max two (one per type), and their days must not
   * overlap — both enforced by validateSegmentDays in the refine below. */
  segments: z.array(planSegmentSchema).min(1).max(PLAN_TYPES.length),

  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح').optional(),
  holidays:  z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ عطلة غير صالح')).optional(),

  pointsEnabled: z.boolean().default(false),
  pointRules:    z.array(pointRuleSchema).default([]),
  /** Omitted → the model's DEFAULT_GRADE_RUBRIC (حضور 3/حفظ 4/تجويد 2/تلاوة 1). */
  gradeRubric:   gradeRubricSchema.optional(),

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

  // One type per plan, and no weekday claimed by two types — the partition
  // that keeps a day's ward, evaluation and reflow single-valued.
  const segmentError = validateSegmentDays(data.segments);
  if (segmentError) {
    ctx.addIssue({ code: 'custom', message: segmentError, path: ['segments'] });
  }

  // rangeStart is deliberately allowed to sit after rangeEnd in mushaf order —
  // a reverse-direction plan (e.g. starting at An-Nas and working backward
  // toward Al-Fatiha), handled by sliceForOccurrence/computeScheduleBreakdown.

  data.segments.forEach((seg, i) => {
    for (const [key, point] of [['rangeStart', seg.rangeStart], ['rangeEnd', seg.rangeEnd]] as const) {
      const surah = SURAH_BY_NUMBER.get(point.surahNumber);
      if (surah && point.ayah > surah.ayahCount) {
        ctx.addIssue({
          code: 'custom',
          message: `سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`,
          path: ['segments', i, key, 'ayah'],
        });
      }
    }
  });
});

/**
 * A plan's segments, migrating a legacy single-track document on the fly.
 *
 * Documents written before segments existed carry `type`/`days`/`rangeStart`/
 * `rangeEnd`/`schedule` at the top level. They are never rewritten in place —
 * every read path funnels through here, so the rest of the codebase only ever
 * sees the segment shape and no downtime migration is needed.
 */
function normalizePlanSegments(plan: IQuranPlan): IPlanSegment[] {
  if (plan.segments && plan.segments.length > 0) return plan.segments;
  if (!plan.type || !plan.days || !plan.rangeStart || !plan.rangeEnd) return [];
  return [{
    type:       plan.type,
    days:       plan.days,
    rangeStart: plan.rangeStart,
    rangeEnd:   plan.rangeEnd,
    schedule:   plan.schedule ?? [],
  }];
}

/**
 * Shapes a plan for the wire: each segment carries its own live-or-frozen
 * schedule and progress, and the plan carries rollups across all of them.
 *
 * The rollups (`todayAssignment`, `progress`, `schedule`, `days`, `type`) are
 * deliberately kept at the top level even though the data is now per-segment:
 * roughly twenty read-only screens across the two clients render those fields
 * as a label or a bar, and keeping them meaningful means those screens need no
 * change. Screens that actually schedule read `segments` instead.
 */
function withPlanComputed(plan: InstanceType<typeof QuranPlan>) {
  const obj = plan.toObject();
  const segments = normalizePlanSegments(plan);

  const window: Omit<MultiPlanInput, 'segments'> = {
    startDate:       plan.startDate,
    holidays:        plan.holidays,
    endType:         plan.endType,
    activeDaysCount: plan.activeDaysCount,
    endDate:         plan.endDate,
  };
  const segmentInputs: PlanSegmentInput[] = segments.map((s) => ({
    type: s.type, days: s.days, rangeStart: s.rangeStart, rangeEnd: s.rangeEnd,
  }));
  const counts = segmentOccurrenceCounts({ ...window, segments: segmentInputs });

  const shaped = segments.map((seg) => {
    // Pin the occurrence count from the SHARED window so this segment's walk
    // stops where the plan says it should, not where its own days run out.
    const scheduleInput = {
      days: seg.days, startDate: plan.startDate, holidays: plan.holidays,
      endType: 'activeDays' as const,
      activeDaysCount: counts.get(seg.type) ?? 0,
      rangeStart: seg.rangeStart, rangeEnd: seg.rangeEnd,
    };
    const progress = computePlanProgress(scheduleInput);
    // A frozen schedule wins over live recomputation — that's the point of
    // freezing: it survives later config edits and carries hand-edited days.
    const persisted = seg.schedule && seg.schedule.length > 0;
    const schedule = persisted
      ? seg.schedule.map((s) => ({ ...s, date: new Date(s.date).toISOString(), type: seg.type }))
      : computeScheduleBreakdown(scheduleInput).map((s) => ({ ...s, type: seg.type }));

    return {
      type:       seg.type,
      days:       seg.days,
      rangeStart: seg.rangeStart,
      rangeEnd:   seg.rangeEnd,
      todayAssignment: (() => {
        const slice = computeTodayAssignment(scheduleInput);
        return slice ? { ...slice, type: seg.type } : null;
      })(),
      progress,
      juzProgress: computeJuzProgress(scheduleInput, progress),
      pageRange:   pageRangeOfAyahRange(seg.rangeStart, seg.rangeEnd),
      schedule,
      scheduleIsPersisted: persisted,
    };
  });

  // Days are partitioned, so at most one segment can be due today.
  const todayAssignment = shaped.find((s) => s.todayAssignment)?.todayAssignment ?? null;

  const totals = shaped.reduce(
    (acc, s) => {
      if (s.progress) { acc.completed += s.progress.completed; acc.total += s.progress.total; }
      if (s.juzProgress) { acc.juzCompleted += s.juzProgress.completed; acc.juzTotal += s.juzProgress.total; }
      return acc;
    },
    { completed: 0, total: 0, juzCompleted: 0, juzTotal: 0 },
  );

  const pageStarts = shaped.map((s) => s.pageRange.pageStart);
  const pageEnds   = shaped.map((s) => s.pageRange.pageEnd);

  return {
    ...obj,
    segments: shaped,

    // ── rollups, so display-only screens keep working ──
    types: shaped.map((s) => s.type),
    /** The single most representative type — the one due today when there is
     * one, else the first segment. Legacy `plan.type` consumers read this. */
    type: todayAssignment?.type ?? shaped[0]?.type ?? plan.type,
    days: unionDays(segmentInputs),
    todayAssignment,
    progress: totals.total > 0
      ? { completed: totals.completed, total: totals.total, percent: Math.round((totals.completed / totals.total) * 100) }
      : null,
    juzProgress: totals.juzTotal > 0
      ? { completed: totals.juzCompleted, total: totals.juzTotal }
      : null,
    pageRange: pageStarts.length > 0
      ? {
          pageStart: Math.min(...pageStarts),
          pageEnd:   Math.max(...pageEnds),
          pageCount: Math.max(...pageEnds) - Math.min(...pageStarts) + 1,
        }
      : null,
    /** Every segment's days merged and sorted — each entry carries its `type`. */
    schedule: shaped.flatMap((s) => s.schedule).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    scheduleIsPersisted: shaped.length > 0 && shaped.every((s) => s.scheduleIsPersisted),
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

    res.json({ success: true, count: plans.length, data: plans.map(withPlanComputed) });
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
    res.json({ success: true, data: withPlanComputed(plan) });
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
    res.status(201).json({ success: true, data: withPlanComputed(plan) });
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
    res.json({ success: true, data: withPlanComputed(plan) });
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

    // Freeze every segment. A legacy document is normalized into segments
    // first, so this is also what migrates it in place on first generate.
    const segments = normalizePlanSegments(plan);
    if (segments.length === 0) throw new AppError('لا توجد أنواع مُعرَّفة لهذه الخطة', 400);

    const segmentInputs: PlanSegmentInput[] = segments.map((s) => ({
      type: s.type, days: s.days, rangeStart: s.rangeStart, rangeEnd: s.rangeEnd,
    }));
    const counts = segmentOccurrenceCounts({
      startDate: plan.startDate, holidays: plan.holidays,
      endType: plan.endType, activeDaysCount: plan.activeDaysCount, endDate: plan.endDate,
      segments: segmentInputs,
    });

    plan.segments = segments.map((seg) => ({
      ...seg,
      schedule: computeScheduleBreakdown({
        days: seg.days, startDate: plan.startDate, holidays: plan.holidays,
        endType: 'activeDays', activeDaysCount: counts.get(seg.type) ?? 0,
        rangeStart: seg.rangeStart, rangeEnd: seg.rangeEnd,
      }).map((s) => ({ ...s, date: new Date(s.date) })),
    }));
    // The legacy top-level copy would otherwise shadow the segments on a later
    // read via normalizePlanSegments' fallback — clear it once migrated.
    plan.schedule = undefined;
    await plan.save();

    const populated = await QuranPlan.findById(plan._id)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('students', 'name')
      .populate('specialTrack', 'title');
    res.json({ success: true, data: withPlanComputed(populated!) });
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
  /** Which segment the day belongs to. `occurrenceIndex` is 1-based within a
   * segment, so it no longer identifies a day on its own. Optional only so a
   * single-segment plan can keep working with older clients. */
  type:      z.enum(['حفظ', 'مراجعة']).optional(),
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

    if (!plan.segments || plan.segments.length === 0) {
      throw new AppError('يجب حفظ توزيع الأيام أولاً', 404);
    }
    // With one segment the type is unambiguous; with several it is required,
    // because occurrenceIndex restarts at 1 inside each of them.
    const segment = data.type
      ? plan.segments.find((s) => s.type === data.type)
      : plan.segments.length === 1 ? plan.segments[0] : undefined;
    if (!segment) {
      throw new AppError(
        data.type ? `لا يوجد "${data.type}" في هذه الخطة` : 'يجب تحديد نوع اليوم المراد تعديله',
        400,
      );
    }

    const entry = segment.schedule.find((s) => s.occurrenceIndex === occurrenceIndex);
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
    res.json({ success: true, data: withPlanComputed(populated!) });
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
