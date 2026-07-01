import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Teacher } from '../models/Teacher.model';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error';

const teacherSchema = z.object({
  name:        z.string().min(2, 'الاسم مطلوب'),
  specialty:   z.string().optional(),
  phone:       z.string().optional(),
  rating:      z.string().optional(),
  status:      z.enum(['active', 'inactive']).optional(),
  email:       z.string().email('البريد الإلكتروني غير صحيح').optional(),
  password:    z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
  newPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

export async function getTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teachers = await Teacher.find({ status: 'active' }).sort({ name: 1 });

    const enriched = await Promise.all(
      teachers.map(async (t) => {
        const halqatCount  = await Halqa.countDocuments({ teacher: t._id });
        const halqatIds    = await Halqa.find({ teacher: t._id }).select('_id');
        const studentCount = await Student.countDocuments({ halqa: { $in: halqatIds.map((h) => h._id) } });
        const userDoc      = await User.findOne({ role: 'teacher', profileId: t._id }).select('email');
        return { ...t.toObject(), halqatCount, studentCount, email: userDoc?.email ?? null };
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
    const { email, password, ...teacherData } = teacherSchema.parse(req.body);
    const teacher = await Teacher.create(teacherData);

    let userCredentials: { email: string; password: string } | undefined;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Teacher.findByIdAndDelete(teacher._id);
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      }
      await User.create({ name: teacherData.name, email, password, role: 'teacher', profileId: teacher._id });
      userCredentials = { email, password };
    }

    res.status(201).json({ success: true, data: teacher, credentials: userCredentials });
  } catch (err) {
    next(err);
  }
}

export async function updateTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, newPassword, ...teacherData } = teacherSchema.partial().parse(req.body);
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, teacherData, { new: true, runValidators: true });
    if (!teacher) throw new AppError('المعلم غير موجود', 404);

    if (email || newPassword) {
      const userDoc = await User.findOne({ role: 'teacher', profileId: teacher._id });
      if (userDoc) {
        if (email && email !== userDoc.email) {
          const conflict = await User.findOne({ email, _id: { $ne: userDoc._id } });
          if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
          userDoc.email = email;
        }
        if (newPassword) userDoc.password = newPassword;
        await userDoc.save();
      }
    }

    const userDoc = await User.findOne({ role: 'teacher', profileId: teacher._id }).select('email');
    res.json({ success: true, data: { ...teacher.toObject(), email: userDoc?.email ?? null } });
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
