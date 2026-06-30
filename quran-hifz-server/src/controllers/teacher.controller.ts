import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Teacher } from '../models/Teacher.model';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

const teacherSchema = z.object({
  name:      z.string().min(2, 'الاسم مطلوب'),
  specialty: z.string().optional(),
  phone:     z.string().optional(),
  rating:    z.string().optional(),
  status:    z.enum(['active', 'inactive']).optional(),
});

export async function getTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teachers = await Teacher.find({ status: 'active' }).sort({ name: 1 });

    const enriched = await Promise.all(
      teachers.map(async (t) => {
        const halqatCount  = await Halqa.countDocuments({ teacher: t._id });
        const halqatIds    = await Halqa.find({ teacher: t._id }).select('_id');
        const studentCount = await Student.countDocuments({ halqa: { $in: halqatIds.map((h) => h._id) } });
        return { ...t.toObject(), halqatCount, studentCount };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) throw new AppError('المعلم غير موجود', 404);

    const halqat = await Halqa.find({ teacher: teacher._id }).populate('masjid', 'name');
    res.json({ success: true, data: { ...teacher.toObject(), halqat } });
  } catch (err) {
    next(err);
  }
}

export async function createTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = teacherSchema.parse(req.body);
    const teacher = await Teacher.create(data);
    res.status(201).json({ success: true, data: teacher });
  } catch (err) {
    next(err);
  }
}

export async function updateTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = teacherSchema.partial().parse(req.body);
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!teacher) throw new AppError('المعلم غير موجود', 404);
    res.json({ success: true, data: teacher });
  } catch (err) {
    next(err);
  }
}

export async function deleteTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) throw new AppError('المعلم غير موجود', 404);
    res.json({ success: true, message: 'تم حذف المعلم بنجاح' });
  } catch (err) {
    next(err);
  }
}
