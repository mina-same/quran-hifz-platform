import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GroupHomework } from '../models/GroupHomework.model';
import { AppError } from '../middleware/error';

const groupHomeworkSchema = z.object({
  track:        z.string().min(1, 'المسار مطلوب'),
  teacher:     z.string().min(1),
  title:       z.string().min(1),
  description: z.string().min(1),
  dueDay:      z.string().min(1),
  dueDate:     z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
});

export async function getGroupHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { track, teacher } = req.query;
    const filter: Record<string, unknown> = {};
    if (track)   filter.track   = track;
    if (teacher) filter.teacher = teacher;
    const hw = await GroupHomework.find(filter)
      .populate('teacher', 'name')
      .populate('track', 'title')
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
