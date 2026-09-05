import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { Attendance } from '../models/Attendance.model';
import { Evaluation } from '../models/Evaluation.model';
import { Homework } from '../models/Homework.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { AppError } from '../middleware/error';

const trackSchema = z.object({
  masjid:      z.string().min(1, 'المسجد مطلوب'),
  title:       z.string().min(1),
  type:        z.string().min(1),
  status:      z.enum(['active', 'upcoming', 'ended']).optional(),
  startDate:   z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  endDate:     z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  daysPerWeek: z.string().min(1),
  timeSlot:    z.string().min(1),
  isOnline:    z.boolean().optional(),
  meetLink:    z.string().url('رابط غير صالح').optional().or(z.literal('')),
  teachers:    z.array(z.string().min(1)).min(1, 'يجب اختيار معلم واحد على الأقل'),
  maxStudents: z.number().int().positive(),
  notes:       z.string().optional(),
});

export async function getTracks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, teacher, masjid } = req.query;
    const filter: Record<string, unknown> = {};
    if (status)  filter.status   = status;
    if (teacher) filter.teachers = teacher;          // element-in-array match
    if (masjid)  filter.masjid   = masjid;
    const tracks = await Track.find(filter)
      .populate('teachers', 'name')
      .populate('masjid', 'name location gender')
      .sort({ startDate: -1 });

    const enriched = await Promise.all(
      tracks.map(async (t) => {
        const studentCount = await Student.countDocuments({ track: t._id });
        return { ...t.toObject(), studentCount };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const track = await Track.findById(req.params.id)
      .populate('teachers', 'name specialty')
      .populate('masjid', 'name location gender');
    if (!track) throw new AppError('المسار غير موجود', 404);

    const students = await Student.find({ track: track._id }).select('name status progressPct attendancePct');
    res.json({ success: true, data: { ...track.toObject(), students } });
  } catch (err) {
    next(err);
  }
}

export async function createTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.parse(req.body);
    const track = await Track.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate:   new Date(data.endDate),
    });
    res.status(201).json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

export async function updateTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate)   update.endDate   = new Date(data.endDate);
    const track = await Track.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

/** Moves a student INTO this track — sets their `track` field, replacing
 * whatever track they were in before (a student always belongs to exactly
 * one track, so this is a transfer, not an add-to-a-set). Renamed from the
 * old `enrollStudent`, which pushed into an array of many possible tracks —
 * that array no longer exists (see Track.model.ts). */
export async function assignStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.body;
    const track = await Track.findById(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);

    const student = await Student.findByIdAndUpdate(studentId, { track: track._id }, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function deleteTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const remainingStudents = await Student.countDocuments({ track: req.params.id });
    if (remainingStudents > 0) {
      throw new AppError('لا يمكن حذف مسار به طلاب — انقل الطلاب إلى مسار آخر أولاً', 400);
    }
    // Historical records (attendance, evaluations, homework, recordings, plans)
    // reference the track too — deleting it would leave them dangling.
    const [attendance, evaluations, homework, groupHomework, recordings, plans] = await Promise.all([
      Attendance.countDocuments({ track: req.params.id }),
      Evaluation.countDocuments({ track: req.params.id }),
      Homework.countDocuments({ track: req.params.id }),
      GroupHomework.countDocuments({ track: req.params.id }),
      LessonRecording.countDocuments({ track: req.params.id }),
      QuranPlan.countDocuments({ track: req.params.id }),
    ]);
    if (attendance + evaluations + homework + groupHomework + recordings + plans > 0) {
      throw new AppError('لا يمكن حذف مسار به سجلات تاريخية مرتبطة به', 400);
    }
    const track = await Track.findByIdAndDelete(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
