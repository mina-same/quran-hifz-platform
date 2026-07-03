import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuranPlan } from '../models/QuranPlan.model';
import { AppError } from '../middleware/error';
import { SURAHS } from '../data/surahs';
import { WEEK_DAYS, computeTodayAssignment } from '../lib/quranRange';

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

  repetitionCount:         z.number().int().min(1).default(1),
  restrictNavigationRange: z.boolean().default(false),
  ignoreSurahHeaders:      z.boolean().default(false),

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

  const startsBeforeEnd =
    data.rangeStart.surahNumber < data.rangeEnd.surahNumber ||
    (data.rangeStart.surahNumber === data.rangeEnd.surahNumber && data.rangeStart.ayah <= data.rangeEnd.ayah);
  if (!startsBeforeEnd) {
    ctx.addIssue({ code: 'custom', message: 'نقطة البداية يجب أن تسبق نقطة النهاية', path: ['rangeEnd'] });
  }

  for (const [key, point] of [['rangeStart', data.rangeStart], ['rangeEnd', data.rangeEnd]] as const) {
    const surah = SURAH_BY_NUMBER.get(point.surahNumber);
    if (surah && point.ayah > surah.ayahCount) {
      ctx.addIssue({ code: 'custom', message: `سورة ${surah.name} تحتوي على ${surah.ayahCount} آية فقط`, path: [key, 'ayah'] });
    }
  }
});

function withTodayAssignment(plan: InstanceType<typeof QuranPlan>) {
  const obj = plan.toObject();
  return {
    ...obj,
    todayAssignment: computeTodayAssignment({
      days:            plan.days,
      startDate:       plan.startDate,
      endType:         plan.endType,
      activeDaysCount: plan.activeDaysCount,
      endDate:         plan.endDate,
      rangeStart:      plan.rangeStart,
      rangeEnd:        plan.rangeEnd,
    }),
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

export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plan = await QuranPlan.findByIdAndDelete(req.params.id);
    if (!plan) throw new AppError('الخطة غير موجودة', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
