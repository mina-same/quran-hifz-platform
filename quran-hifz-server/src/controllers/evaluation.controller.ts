import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Evaluation, type IEvaluationCriterion } from '../models/Evaluation.model';
import { QuranPlan, DEFAULT_GRADE_RUBRIC, type IGradeCriterion } from '../models/QuranPlan.model';
import { notifyParents } from '../lib/notify';
import { deriveDayAndTime, upsertAttendanceRecords, type AttendanceContext } from './attendance.controller';

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
 * Evaluations are keyed by (halqa|specialTrack, date) while rubrics live on
 * plans, and one halqa can own several plans — so the caller may name the plan
 * explicitly. Falling back: a single active plan for that context wins; if the
 * context is ambiguous or empty we grade against the default split rather than
 * guessing, which keeps totals comparable with historical records.
 */
export async function resolveRubric(
  ctx: { halqa?: string; specialTrack?: string; plan?: string },
): Promise<{ rubric: IGradeCriterion[]; planId?: string; ambiguous: boolean }> {
  if (ctx.plan) {
    const plan = await QuranPlan.findById(ctx.plan).select('gradeRubric');
    if (plan?.gradeRubric?.length) {
      return { rubric: plan.gradeRubric, planId: String(plan._id), ambiguous: false };
    }
  }

  const filter = ctx.halqa
    ? { halqa: new Types.ObjectId(ctx.halqa) }
    : ctx.specialTrack
      ? { specialTrack: new Types.ObjectId(ctx.specialTrack) }
      : null;

  if (filter) {
    const plans = await QuranPlan.find({ ...filter, status: 'نشطة' }).select('gradeRubric');
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
  teacher:      z.string().min(1),
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  plan:         z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  records: z.array(recordSchema),
});

/** GET /api/evaluations/rubric — what the evaluation screen should render. */
export async function getRubric(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { halqa, specialTrack, plan } = req.query as Record<string, string | undefined>;
    const { rubric, planId, ambiguous } = await resolveRubric({ halqa, specialTrack, plan });

    // When several plans could apply, hand the client the choices so the
    // teacher picks instead of silently grading against the default.
    const filter = halqa
      ? { halqa: new Types.ObjectId(halqa) }
      : specialTrack
        ? { specialTrack: new Types.ObjectId(specialTrack) }
        : null;
    const choices = filter
      ? await QuranPlan.find({ ...filter, status: 'نشطة' }).select('name gradeRubric')
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
    const { student, halqa, specialTrack, from, to } = req.query;
    const filter: Record<string, unknown> = {};
    if (student)      filter.student      = student;
    if (halqa) {
      const ids = String(halqa).split(',').filter(Boolean);
      filter.halqa = ids.length > 1 ? { $in: ids } : ids[0];
    }
    if (specialTrack) filter.specialTrack = specialTrack;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to)   (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }

    const records = await Evaluation.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('halqa',   'name')
      .populate('specialTrack', 'title')
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    next(err);
  }
}

export async function bulkEvaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacher, halqa, specialTrack, plan, date, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);
    const contextField = halqa ? { halqa: new Types.ObjectId(halqa) } : { specialTrack: new Types.ObjectId(specialTrack!) };

    const { rubric, planId } = await resolveRubric({ halqa, specialTrack, plan });
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
            ...contextField,
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
      (halqa ? { halqa } : { specialTrack: specialTrack! }) as AttendanceContext,
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
