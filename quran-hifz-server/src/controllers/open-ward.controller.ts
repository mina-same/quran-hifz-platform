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

/** Pure validation of one day's open-ward record — no DB access. */
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

/** Records (or overwrites) what a student memorized on one day of an
 * open-ward plan. Answers with `overlapWarning` when the range overlaps
 * another day already recorded for the same student and type. */
export async function upsertOpenWard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: planId, studentId } = req.params;
    const plan = await QuranPlan.findById(planId);
    if (!plan) throw new AppError('الخطة غير موجودة', 404);
    const segmentTypes = (plan.toObject().segments ?? []).map((s: { type: string }) => s.type);
    const data = validateOpenWardBody(req.body, { openWard: Boolean(plan.openWard), segmentTypes }, dateKey(new Date()));
    if (!(await isStudentInPlan(plan, studentId))) {
      throw new AppError('هذا الطالب غير مشمول بهذه الخطة', 404);
    }

    const key = { plan: planId, student: studentId, type: data.type, date: data.date };
    let update: Record<string, unknown>;
    if (data.status === 'recorded') {
      const pr = pageRangeOfAyahRange(data.from!, data.to!);
      update = {
        $set: {
          ...key, status: data.status, from: data.from, to: data.to,
          pageStart: pr.pageStart, pageEnd: pr.pageEnd, pages: pr.pageCount,
          ayahs: countRangeAyahs(data.from!, data.to!),
          recordedBy: req.user!.id,
        },
      };
    } else {
      update = {
        $set: { ...key, status: data.status, recordedBy: req.user!.id },
        $unset: { from: 1, to: 1, pageStart: 1, pageEnd: 1, pages: 1, ayahs: 1 },
      };
    }
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
