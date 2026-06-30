import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

const studentSchema = z.object({
  name:             z.string().min(2, 'الاسم مطلوب'),
  path:             z.enum(['حفظ كامل', 'عشرون جزءاً', 'عشرة أجزاء', 'خمسة أجزاء']),
  halqa:            z.string().min(1, 'الحلقة مطلوبة'),
  masjid:           z.string().min(1, 'المسجد مطلوب'),
  guardian:         z.string().optional(),
  guardianPhone:    z.string().optional(),
  lastMemorization: z.string().optional(),
  totalPages:       z.number().optional(),
  status:           z.enum(['active', 'inactive', 'new']).optional(),
});

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { halqa, masjid, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (halqa)   filter.halqa  = halqa;
    if (masjid)  filter.masjid = masjid;
    if (status)  filter.status = status;
    if (search)  filter.name   = { $regex: search, $options: 'i' };

    const students = await Student.find(filter)
      .populate('halqa',  'name time days')
      .populate('masjid', 'name location')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    next(err);
  }
}

export async function getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findById(req.params.id)
      .populate('halqa',  'name teacher time days capacity')
      .populate('masjid', 'name location');

    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = studentSchema.parse(req.body);
    const student = await Student.create(data);
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = studentSchema.partial().parse(req.body);
    const student = await Student.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
  } catch (err) {
    next(err);
  }
}
