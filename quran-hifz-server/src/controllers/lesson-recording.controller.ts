import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LessonRecording } from '../models/LessonRecording.model';
import { AppError } from '../middleware/error';

const recordingSchema = z.object({
  student:     z.string().min(1),
  teacher:     z.string().min(1),
  halqa:       z.string().min(1),
  type:        z.string().min(1),
  segment:     z.string().min(1),
  points:      z.number().int().min(0).optional(),
  teacherNote: z.string().optional(),
  audioUrl:    z.string().url().optional(),
  recordedAt:  z.string().optional(),
});

export async function getRecordings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { student, teacher, halqa } = req.query;
    const filter: Record<string, unknown> = {};
    if (student) filter.student = student;
    if (teacher) filter.teacher = teacher;
    if (halqa)   filter.halqa   = halqa;
    const recordings = await LessonRecording.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .sort({ recordedAt: -1 });
    res.json({ success: true, count: recordings.length, data: recordings });
  } catch (err) {
    next(err);
  }
}

export async function createRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = recordingSchema.parse(req.body);
    const recording = await LessonRecording.create({
      ...data,
      recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    });
    res.status(201).json({ success: true, data: recording });
  } catch (err) {
    next(err);
  }
}

export async function deleteRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rec = await LessonRecording.findByIdAndDelete(req.params.id);
    if (!rec) throw new AppError('التسجيل غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
