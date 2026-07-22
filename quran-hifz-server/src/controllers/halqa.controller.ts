import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

const halqaSchema = z.object({
  name:          z.string().min(2, 'اسم الحلقة مطلوب'),
  teacher:       z.string().min(1, 'المعلم مطلوب'),
  masjid:        z.string().min(1, 'المسجد مطلوب'),
  specialTrack:  z.string().min(1, 'المسار مطلوب'),
  days:          z.string().min(1, 'أيام الحلقة مطلوبة'),
  time:          z.string().min(1, 'وقت الحلقة مطلوب'),
  capacity:      z.number().min(1).optional(),
  attendancePct: z.number().min(0).max(100).optional(),
  completionPct: z.number().min(0).max(100).optional(),
});

export async function getHalqat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { masjid, teacher } = req.query;
    const filter: Record<string, unknown> = {};
    if (masjid)  filter.masjid  = masjid;
    if (teacher) filter.teacher = teacher;

    const halqat = await Halqa.find(filter)
      .populate('teacher', 'name specialty')
      .populate('masjid',  'name location')
      .populate('specialTrack', 'title')
      .sort({ name: 1 });

    const enriched = await Promise.all(
      halqat.map(async (h) => {
        const studentCount = await Student.countDocuments({ halqa: h._id });
        return { ...h.toObject(), studentCount };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getHalqa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const halqa = await Halqa.findById(req.params.id)
      .populate('teacher', 'name specialty rating')
      .populate('masjid',  'name location');

    if (!halqa) throw new AppError('الحلقة غير موجودة', 404);

    const students = await Student.find({ halqa: halqa._id }).select('name status progressPct attendancePct');
    res.json({ success: true, data: { ...halqa.toObject(), students } });
  } catch (err) {
    next(err);
  }
}

export async function createHalqa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = halqaSchema.parse(req.body);
    const halqa = await Halqa.create(data);
    res.status(201).json({ success: true, data: halqa });
  } catch (err) {
    next(err);
  }
}

export async function updateHalqa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = halqaSchema.partial().parse(req.body);
    const halqa = await Halqa.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!halqa) throw new AppError('الحلقة غير موجودة', 404);
    res.json({ success: true, data: halqa });
  } catch (err) {
    next(err);
  }
}

export async function deleteHalqa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const halqa = await Halqa.findByIdAndDelete(req.params.id);
    if (!halqa) throw new AppError('الحلقة غير موجودة', 404);
    res.json({ success: true, message: 'تم حذف الحلقة بنجاح' });
  } catch (err) {
    next(err);
  }
}
