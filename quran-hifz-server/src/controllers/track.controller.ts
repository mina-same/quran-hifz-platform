import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';
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

const addTeacherSchema = z.object({ teacherId: z.string().min(1) });

/** Adds a co-teacher to a track. Admins may do this for any track; a teacher
 * may only do it for a track they are already teaching on (add-only — they
 * cannot remove a teacher or edit anything else about the track, which stays
 * behind the full `updateTrack`/admin-only path). */
export async function addTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = addTeacherSchema.parse(req.body);
    const track = await Track.findById(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);

    if (req.user!.role === 'teacher') {
      const requester = await User.findById(req.user!.id).select('profileId');
      const isOnTrack = !!requester?.profileId
        && track.teachers.some((t) => t.toString() === requester.profileId!.toString());
      if (!isOnTrack) throw new AppError('لا يمكنك إضافة معلم إلى مسار لست من معلميه', 403);
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new AppError('المعلم غير موجود', 404);

    if (!track.teachers.some((t) => t.toString() === teacherId)) {
      // `teachers` is typed `Schema.Types.ObjectId[]` (the schema-definition
      // type, not the runtime one) — same pre-existing declaration quirk as
      // `masjid` on this model; cast, matching how mongoose casts a raw id.
      track.teachers.push(teacher._id as never);
      await track.save();
    }

    const populated = await Track.findById(track._id)
      .populate('teachers', 'name specialty')
      .populate('masjid', 'name location gender');
    res.json({ success: true, data: populated });
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
