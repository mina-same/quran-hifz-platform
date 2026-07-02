import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';
import { contextRefinement } from '../validators/context';

const recordSchema = z.object({
  student:      z.string().min(1),
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  day:     z.string().min(1),
  time:    z.string().min(1),
  status:  z.enum(['حاضر', 'غائب', 'متأخر']),
}).superRefine(contextRefinement);

const bulkSchema = z.object({
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  date:    z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  day:     z.string().min(1),
  time:    z.string().min(1),
  records: z.array(z.object({
    student: z.string().min(1),
    status:  z.enum(['حاضر', 'غائب', 'متأخر']),
  })),
}).superRefine(contextRefinement);

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
    const existing = await Attendance.findOne({ student: data.student, date: new Date(data.date) });
    if (existing) {
      existing.status = data.status;
      await existing.save();
      res.json({ success: true, data: existing });
      return;
    }
    const record = await Attendance.create({ ...data, date: new Date(data.date) });
    await recalcAttendancePct(data.student);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

export async function bulkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { halqa, specialTrack, date, day, time, records } = bulkSchema.parse(req.body);
    const dateObj = new Date(date);
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

    res.json({ success: true, message: 'تم تسجيل الحضور بنجاح' });
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
