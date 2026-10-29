import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Evaluation, type IEvaluationCriterion } from '../models/Evaluation.model';
import { QuranPlan, DEFAULT_GRADE_RUBRIC, type IGradeCriterion } from '../models/QuranPlan.model';
import { notifyParents, SYSTEM_SENDER } from '../lib/notify';
import { deriveDayAndTime, upsertAttendanceRecords } from './attendance.controller';
import { supervisorGenderOf, trackIdsForGender, restrictTrackFilter } from '../lib/supervisorScope';
import { User } from '../models/User.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { Track } from '../models/Track.model';
import { Masjid } from '../models/Masjid.model';
import { Student } from '../models/Student.model';
import { Message } from '../models/Message.model';
import { EvaluationChange } from '../models/EvaluationChange.model';
import { gradeChanges } from '../lib/gradeChanges';
import { sendPushToUsers } from '../lib/push';

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
  attendanceStatus: z.enum(['حاضر', 'غائب', 'مستأذن']),
  /** Keyed by rubric criterion key. Bounds are checked against the resolved
   *  rubric in `bulkEvaluate` — they are per plan, so not expressible here. */
  scores:  z.record(z.string(), z.number().min(0)).optional(),
  note:    z.string().optional(),
});

const bulkSchema = z.object({
  /** Optional: an admin has no teacher profile — see `resolveTeacher`. */
  teacher: z.string().min(1).optional(),
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
        totalMax: Math.round(rubric.reduce((a, c) => a + c.max, 0) * 100) / 100,
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

    const supervisorGender = supervisorGenderOf(req);
    if (supervisorGender) {
      filter.track = restrictTrackFilter(filter.track, await trackIdsForGender(supervisorGender));
    }

    // Students may only read their own grades; parents only their children's.
    // The `student` query param is ignored/narrowed rather than trusted.
    if (req.user?.role === 'student') {
      const me = await User.findById(req.user.id).select('profileId');
      if (!me?.profileId) { res.json({ success: true, count: 0, data: [] }); return; }
      filter.student = me.profileId;
    } else if (req.user?.role === 'parent') {
      const childIds = (await ParentStudent.find({ parent: req.user.id }).distinct('student')).map(String);
      const requested = student ? String(student) : '';
      filter.student = childIds.includes(requested) ? requested : { $in: childIds };
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

/** Whose name the day's grades go under. A teacher records as themself; an
 *  admin has no teacher profile, so their save is recorded against the
 *  track's first teacher (the mobile app already does this client-side). */
async function resolveTeacher(req: Request, track: string, given?: string): Promise<string | null> {
  if (req.user?.role === 'teacher') {
    const me = await User.findById(req.user.id).select('profileId');
    return me?.profileId ? String(me.profileId) : given ?? null;
  }
  if (given) return given;
  const t = await Track.findById(track).select('teachers').lean();
  return t?.teachers?.length ? String(t.teachers[0]) : null;
}

export async function bulkEvaluate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacher: givenTeacher, track, plan, date, records } = bulkSchema.parse(req.body);
    // Independent lookups — run together rather than paying two round trips.
    const [teacher, { rubric, planId }] = await Promise.all([
      resolveTeacher(req, track, givenTeacher),
      resolveRubric({ track, plan }),
    ]);
    if (!teacher) {
      res.status(400).json({ success: false, message: 'لا يوجد معلم مسند لهذه الحلقة — أضف معلماً أولاً' });
      return;
    }
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);
    const trackId = new Types.ObjectId(track);
    const totalMax = Math.round(rubric.reduce((a, c) => a + c.max, 0) * 100) / 100;

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
    // criterion (`auto` included) is forced to zero. Present: every criterion,
    // `auto` included, takes whatever the teacher typed (bounded by its max) —
    // `auto` no longer means "always full marks", it's just a rubric-builder
    // hint that a criterion is attendance-linked.
    // Grades may be fractional; kept to two decimals so sums stay clean.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const scored = records.map((r) => {
      const isPresent = r.attendanceStatus === 'حاضر';
      const criteria: IEvaluationCriterion[] = rubric.map((c) => ({
        key: c.key,
        label: c.label,
        max: c.max,
        value: !isPresent ? 0 : Math.min(round2(r.scores?.[c.key] ?? 0), c.max),
      }));
      const total = round2(criteria.reduce((a, c) => a + c.value, 0));

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
    // Snapshot what was saved before, so edits can be logged (سجل تعديل الدرجات).
    const previous = await Evaluation.find({
      student: { $in: scored.map((r) => new Types.ObjectId(r.student)) },
      date: dateObj,
    }).select('student attendanceStatus criteria').lean();

    // The same "الحضور والتقييم" save also drives the Attendance collection
    // (attendancePct, absence tracking, ParentAttendance) — one Save button,
    // both records kept in sync. The two writes are independent, so they run
    // concurrently.
    await Promise.all([
      Evaluation.bulkWrite(ops),
      upsertAttendanceRecords(
        track,
        dateObj,
        records.map((r) => ({ student: r.student, status: r.attendanceStatus })),
      ),
    ]);

    await logGradeChanges({
      previous: previous.map((p) => ({ student: String(p.student), attendanceStatus: p.attendanceStatus, criteria: p.criteria ?? [] })),
      scored: scored.map((r) => ({ student: r.student, attendanceStatus: r.attendanceStatus, criteria: r.criteria })),
      trackId, date, dateObj,
      editor: { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    });

    const scoredByStudentId = new Map(scored.map((r) => [r.student, r]));
    // Excused (مستأذن) students get no parent notification.
    const { notified, unnotified } = await notifyParents(
      scored.filter((r) => r.attendanceStatus !== 'مستأذن').map((r) => r.student),
      (name, studentId) => {
        const r = scoredByStudentId.get(studentId)!;
        if (r.attendanceStatus === 'غائب') return `الطالب ${name} غائب اليوم (${day}، ${date}) — المجموع: ${r.total}/${r.totalMax}.`;
        const breakdown = r.criteria.map((c) => `${c.label} ${c.value}/${c.max}`).join('، ');
        return `تقييم اليوم لـ ${name}: ${r.total}/${r.totalMax} (${breakdown}).`;
      },
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role, system: true },
    );

    res.json({ success: true, message: 'تم حفظ الحضور والتقييم بنجاح', notified, unnotified });
  } catch (err) {
    next(err);
  }
}

/**
 * Logs every student whose already-saved day was changed by this save, and on
 * a halqa's FIRST edit of that day notifies the admins and the section's
 * supervisors (one message per halqa per day — not one per keystroke).
 * Edits by an admin are logged but not notified.
 */
async function logGradeChanges(args: {
  previous: { student: string; attendanceStatus: string; criteria: { key: string; label: string; value: number }[] }[];
  scored: { student: string; attendanceStatus: string; criteria: { key: string; label: string; value: number }[] }[];
  trackId: Types.ObjectId;
  date: string;
  dateObj: Date;
  editor: { id: string; name: string; role: string };
}): Promise<void> {
  const before = new Map(args.previous.map((p) => [p.student, p]));
  const edited = args.scored
    .map((r) => ({ student: r.student, changes: gradeChanges(before.get(r.student) ?? null, r) }))
    .filter((x) => x.changes.length > 0);
  if (!edited.length) return;

  const [track, students, earlier] = await Promise.all([
    Track.findById(args.trackId).select('title masjid').lean(),
    Student.find({ _id: { $in: edited.map((e) => e.student) } }).select('name').lean(),
    EvaluationChange.exists({ track: args.trackId, date: args.dateObj }),
  ]);
  const nameOf = new Map(students.map((s) => [String(s._id), s.name]));
  await EvaluationChange.insertMany(edited.map((e) => ({
    track: args.trackId,
    trackTitle: track?.title ?? '',
    student: e.student,
    studentName: nameOf.get(e.student) ?? '',
    date: args.dateObj,
    editedBy: args.editor.id,
    editedByName: args.editor.name,
    editedByRole: args.editor.role,
    changes: e.changes,
  })));

  if (earlier || args.editor.role === 'admin') return;
  const masjid = track?.masjid ? await Masjid.findById(track.masjid).select('gender').lean() : null;
  const or: Record<string, unknown>[] = [{ role: 'admin' }];
  if (masjid?.gender) or.push({ role: 'supervisor', supervisorGender: masjid.gender });
  const recipients = await User.find({ $or: or }).select('_id').lean();
  if (!recipients.length) return;
  const n = edited.length;
  const who = n === 1 ? (nameOf.get(edited[0].student) ?? 'طالب') : `${n} طلاب`;
  const body = `عدّل ${args.editor.name} درجات ${who} في حلقة ${track?.title ?? ''} ليوم ${args.date} — التفاصيل في «سجل تعديل الدرجات».`;
  await Promise.all([
    Message.insertMany(recipients.map((r) => ({
      system: true, recipient: r._id, senderRole: SYSTEM_SENDER.role,
      senderName: SYSTEM_SENDER.name, senderInitials: SYSTEM_SENDER.initials, body,
    }))),
    sendPushToUsers(recipients.map((r) => ({ userId: String(r._id), title: SYSTEM_SENDER.name, body }))),
  ]);
}

/** GET /evaluations/changes?from=&to=&track= — «سجل تعديل الدرجات» (admin; supervisor = own section). */
export async function getGradeChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, track } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && re.test(from)) || (to && re.test(to))) {
      filter.createdAt = {
        ...(from && re.test(from) ? { $gte: new Date(from) } : {}),
        ...(to && re.test(to) ? { $lt: new Date(new Date(to).getTime() + 86_400_000) } : {}),
      };
    }
    if (track) filter.track = track;
    const gender = supervisorGenderOf(req);
    if (gender) filter.track = restrictTrackFilter(filter.track, await trackIdsForGender(gender));
    const data = await EvaluationChange.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}
