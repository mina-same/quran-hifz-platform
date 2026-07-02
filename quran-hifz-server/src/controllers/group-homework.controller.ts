import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GroupHomework } from '../models/GroupHomework.model';
import { AppError } from '../middleware/error';
import { contextRefinement } from '../validators/context';

const groupHomeworkSchema = z.object({
  halqa:        z.string().min(1).optional(),
  specialTrack: z.string().min(1).optional(),
  teacher:     z.string().min(1),
  title:       z.string().min(1),
  description: z.string().min(1),
  dueDay:      z.string().min(1),
  dueDate:     z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
}).superRefine(contextRefinement);

export async function getGroupHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { halqa, specialTrack, teacher } = req.query;
    const filter: Record<string, unknown> = {};
    if (halqa)        filter.halqa        = halqa;
    if (specialTrack) filter.specialTrack = specialTrack;
    if (teacher)       filter.teacher      = teacher;
    const hw = await GroupHomework.find(filter)
      .populate('teacher', 'name')
      .populate('halqa', 'name')
      .populate('specialTrack', 'title')
      .sort({ dueDate: -1 });
    res.json({ success: true, count: hw.length, data: hw });
  } catch (err) {
    next(err);
  }
}

export async function createGroupHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = groupHomeworkSchema.parse(req.body);
    const hw = await GroupHomework.create({ ...data, dueDate: new Date(data.dueDate) });
    res.status(201).json({ success: true, data: hw });
  } catch (err) {
    next(err);
  }
}

export async function deleteGroupHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hw = await GroupHomework.findByIdAndDelete(req.params.id);
    if (!hw) throw new AppError('الواجب الجماعي غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
