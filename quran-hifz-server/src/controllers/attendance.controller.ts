import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance.model';
import { Student } from '../models/Student.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { Message } from '../models/Message.model';
import { AppError } from '../middleware/error';
import { contextRefinement } from '../validators/context';

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

function deriveDayAndTime(date: Date): { day: string; time: string } {
  const now = new Date();
  return {
    day: ARABIC_WEEKDAYS[date.getDay()],
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
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
    const { day, time } = deriveDayAndTime(dateObj);
    const contextField = halqa
      ? { halqa: new Types.ObjectId(halqa) }
      : { specialTrack: new Types.ObjectId(specialTrack!) };

    const ops = records.map(({ student, status }) => ({
      updateOne: {
        filter: { student: new Types.ObjectId(student), date: dateObj },
        update: { $set: { student: new Types.ObjectId(student), ...contextField, date: dateObj, day, time, status } },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);

    await Promise.all(records.map((r) => recalcAttendancePct(r.student)));

    const { notified, unnotified } = await notifyAbsentParents(
      records.filter((r) => r.status === 'غائب').map((r) => r.student),
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role, day, date },
    );

    res.json({ success: true, message: 'تم تسجيل الحضور بنجاح', notified, unnotified });
  } catch (err) {
    next(err);
  }
}

/**
 * Notifies each absent student's parent via the Message inbox (shown under the
 * parent portal's "الرسائل" tab for that child). Students with no linked parent
 * account (no ParentStudent record) are skipped and reported back, not thrown as
 * an error, so the attendance save itself always succeeds.
 */
async function notifyAbsentParents(
  studentIds: string[],
  ctx: { senderId: string; senderName: string; senderRole: string; day: string; date: string },
): Promise<{ notified: number; unnotified: { id: string; name: string }[] }> {
  if (studentIds.length === 0) return { notified: 0, unnotified: [] };

  const [students, links] = await Promise.all([
    Student.find({ _id: { $in: studentIds } }).select('name'),
    ParentStudent.find({ student: { $in: studentIds } }),
  ]);
  const nameById = new Map(students.map((s) => [String(s._id), s.name]));
  const parentByStudent = new Map(links.map((l) => [String(l.student), String(l.parent)]));
  const initials = ctx.senderName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || 'م';

  const unnotified: { id: string; name: string }[] = [];
  const messages = studentIds.flatMap((id) => {
    const parentId = parentByStudent.get(id);
    const name = nameById.get(id) ?? id;
    if (!parentId) {
      unnotified.push({ id, name });
      return [];
    }
    return [{
      sender: new Types.ObjectId(ctx.senderId),
      recipient: new Types.ObjectId(parentId),
      student: new Types.ObjectId(id),
      senderRole: ctx.senderRole,
      senderName: ctx.senderName,
      senderInitials: initials,
      body: `الطالب ${name} غائب اليوم (${ctx.day}، ${ctx.date}).`,
    }];
  });

  if (messages.length) await Message.insertMany(messages);
  return { notified: messages.length, unnotified };
}

async function recalcAttendancePct(studentId: string): Promise<void> {
  const total   = await Attendance.countDocuments({ student: studentId });
  const present = await Attendance.countDocuments({ student: studentId, status: 'حاضر' });
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  await Student.findByIdAndUpdate(studentId, { attendancePct: pct });
}
