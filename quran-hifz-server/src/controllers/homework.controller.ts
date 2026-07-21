import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Homework } from '../models/Homework.model';
import { AppError } from '../middleware/error';
import { contextRefinement } from '../validators/context';

const homeworkSchema = z.object({
  student:      z.string().min(1),
  teacher:      z.string().min(1),
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  type:    z.string().min(1),
  segment: z.string().min(1),
  dueDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  notes:   z.string().optional(),
}).superRefine(contextRefinement);

const reviewSchema = z.object({
  status:      z.enum(['مراجع', 'معلق', 'متأخر']).optional(),
  rating:      z.enum(['ممتاز', 'جيد جداً', 'جيد', 'مقبول']).optional(),
  notes:       z.string().optional(),
  submittedAt: z.string().optional(),
});

export async function getHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { student, teacher, halqa, specialTrack, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (student)      filter.student      = student;
    if (teacher)      filter.teacher      = teacher;
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    if (status)       filter.status       = status;

    const homework = await Homework.find(filter)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('specialTrack', 'title')
      .sort({ dueDate: -1 });

    res.json({ success: true, count: homework.length, data: homework });
  } catch (err) {
    next(err);
  }
}

export async function createHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = homeworkSchema.parse(req.body);
    const homework = await Homework.create({ ...data, dueDate: new Date(data.dueDate) });
    res.status(201).json({ success: true, data: homework });
  } catch (err) {
    next(err);
  }
}

export async function reviewHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = reviewSchema.parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.submittedAt) update.submittedAt = new Date(data.submittedAt);

    const homework = await Homework.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!homework) throw new AppError('الواجب غير موجود', 404);
    res.json({ success: true, data: homework });
  } catch (err) {
    next(err);
  }
}

export async function deleteHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hw = await Homework.findByIdAndDelete(req.params.id);
    if (!hw) throw new AppError('الواجب غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
