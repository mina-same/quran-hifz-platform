import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Evaluation } from '../models/Evaluation.model';
import { contextRefinement } from '../validators/context';
import { notifyParents } from '../lib/notify';
import { deriveDayAndTime, upsertAttendanceRecords, type AttendanceContext } from './attendance.controller';

/** Fixed-weight evaluation rubric: حضور 3 + حفظ 4 + تجويد 2 + تلاوة 1 = 10. */
export const MAX_SCORES = { attendance: 3, hifz: 4, tajweed: 2, talawah: 1 } as const;

const recordSchema = z.object({
  student:          z.string().min(1),
  attendanceStatus: z.enum(['حاضر', 'غائب']),
  hifz:    z.number().int().min(0).max(MAX_SCORES.hifz),
  tajweed: z.number().int().min(0).max(MAX_SCORES.tajweed),
  talawah: z.number().int().min(0).max(MAX_SCORES.talawah),
  note:    z.string().optional(),
});

const bulkSchema = z.object({
  teacher:      z.string().min(1),
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  records: z.array(recordSchema),
}).superRefine(contextRefinement);

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
    const { teacher, halqa, specialTrack, date, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);
    const contextField = halqa ? { halqa: new Types.ObjectId(halqa) } : { specialTrack: new Types.ObjectId(specialTrack!) };

    // Server never trusts client-computed scores for an absent student — force
    // the non-attendance categories to zero regardless of what was submitted.
    const scored = records.map((r) => {
      const isPresent = r.attendanceStatus === 'حاضر';
      const hifz = isPresent ? r.hifz : 0;
      const tajweed = isPresent ? r.tajweed : 0;
      const talawah = isPresent ? r.talawah : 0;
      const attendance = isPresent ? MAX_SCORES.attendance : 0;
      return {
        ...r,
        scores: { attendance, hifz, tajweed, talawah },
        total: attendance + hifz + tajweed + talawah,
      };
    });

    const ops = scored.map(({ student, attendanceStatus, scores, total, note }) => ({
      updateOne: {
        filter: { student: new Types.ObjectId(student), date: dateObj },
        update: {
          $set: {
            student: new Types.ObjectId(student),
            teacher: new Types.ObjectId(teacher),
            ...contextField,
            date: dateObj,
            attendanceStatus,
            scores,
            total,
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
        if (r.attendanceStatus === 'غائب') return `الطالب ${name} غائب اليوم (${day}، ${date}) — المجموع: ${r.total}/10.`;
        const s = r.scores;
        return `تقييم اليوم لـ ${name}: ${r.total}/10 (حضور ${s.attendance}/${MAX_SCORES.attendance}، حفظ ${s.hifz}/${MAX_SCORES.hifz}، تجويد ${s.tajweed}/${MAX_SCORES.tajweed}، تلاوة ${s.talawah}/${MAX_SCORES.talawah}).`;
      },
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role },
    );

    res.json({ success: true, message: 'تم حفظ الحضور والتقييم بنجاح', notified, unnotified });
  } catch (err) {
    next(err);
  }
}
