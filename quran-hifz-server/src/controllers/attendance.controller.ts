import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';
import { contextRefinement } from '../validators/context';
import { notifyParents } from '../lib/notify';

const recordSchema = z.object({
  student:      z.string().min(1),
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  status:  z.enum(['حاضر', 'غائب', 'متأخر']),
}).superRefine(contextRefinement);

const bulkSchema = z.object({
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  records: z.array(z.object({
    student: z.string().min(1),
    status:  z.enum(['حاضر', 'غائب', 'متأخر']),
  })),
}).superRefine(contextRefinement);

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

export type AttendanceContext = { halqa: string; specialTrack?: undefined } | { halqa?: undefined; specialTrack: string };

/**
 * Upserts one Attendance doc per {student, date} and recalculates each
 * student's attendancePct. Shared by the plain attendance bulk-save endpoint
 * and the merged evaluation bulk-save endpoint (which saves attendance status
 * alongside scores from the same "الحضور والتقييم" page in one request).
 */
export async function upsertAttendanceRecords(
  context: AttendanceContext,
  dateObj: Date,
  records: { student: string; status: 'حاضر' | 'غائب' | 'متأخر' }[],
): Promise<void> {
  const { day, time } = deriveDayAndTime(dateObj);
  const contextField = context.halqa
    ? { halqa: new Types.ObjectId(context.halqa) }
    : { specialTrack: new Types.ObjectId(context.specialTrack!) };

  const ops = records.map(({ student, status }) => ({
    updateOne: {
      filter: { student: new Types.ObjectId(student), date: dateObj },
      update: { $set: { student: new Types.ObjectId(student), ...contextField, date: dateObj, day, time, status } },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  await Promise.all(records.map((r) => recalcAttendancePct(r.student)));
}

export async function getAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { student, halqa, specialTrack, from, to } = req.query;
    const filter: Record<string, unknown> = {};
    if (student)      filter.student      = student;
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = new Date(from as string);
      if (to)   (filter.date as Record<string, Date>).$lte = new Date(to as string);
    }

    const records = await Attendance.find(filter)
      .populate('student', 'name')
      .populate('halqa',   'name')
      .populate('specialTrack', 'title')
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
    const { halqa, specialTrack, date, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
    const { day } = deriveDayAndTime(dateObj);

    await upsertAttendanceRecords(
      (halqa ? { halqa } : { specialTrack: specialTrack! }) as AttendanceContext,
      dateObj,
      records,
    );

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
