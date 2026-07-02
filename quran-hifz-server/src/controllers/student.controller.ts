import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Student } from '../models/Student.model';
import { User } from '../models/User.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
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
  email:            z.string().email('البريد الإلكتروني غير صحيح').optional(),
  password:         z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { halqa, specialTrack, masjid, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (halqa)   filter.halqa  = halqa;
    if (masjid)  filter.masjid = masjid;
    if (status)  filter.status = status;
    if (search)  filter.name   = { $regex: search, $options: 'i' };

    if (specialTrack) {
      const track = await SpecialTrack.findById(specialTrack).select('enrolledStudents');
      filter._id = { $in: track ? track.enrolledStudents : [] };
    }

    const students = await Student.find(filter)
      .populate('halqa',  'name time days')
      .populate('masjid', 'name location')
      .sort({ createdAt: -1 });

    const userDocs = await User.find({ role: 'student', profileId: { $in: students.map((s) => s._id) } }).select('profileId email');
    const emailMap = new Map(userDocs.map((u) => [String(u.profileId), u.email]));
    const enriched = students.map((s) => ({ ...s.toObject(), email: emailMap.get(String(s._id)) ?? null }));

    res.json({ success: true, count: enriched.length, data: enriched });
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
    const { email, password, ...studentData } = studentSchema.parse(req.body);
    const student = await Student.create(studentData);

    let userCredentials: { email: string; password: string } | undefined;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Student.findByIdAndDelete(student._id);
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      }
      await User.create({ name: studentData.name, email, password, role: 'student', profileId: student._id });
      userCredentials = { email, password };
    }

    res.status(201).json({ success: true, data: student, credentials: userCredentials });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...studentData } = studentSchema.partial().parse(req.body);
    const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    if (email || password) {
      const userDoc = await User.findOne({ role: 'student', profileId: student._id });
      if (userDoc) {
        if (email && email !== userDoc.email) {
          const conflict = await User.findOne({ email, _id: { $ne: userDoc._id } });
          if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
          userDoc.email = email;
        }
        if (password) userDoc.password = password;
        await userDoc.save();
      } else if (email && password) {
        const existing = await User.findOne({ email });
        if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
        await User.create({ name: student.name, email, password, role: 'student', profileId: student._id });
      }
    }

    const userDoc = await User.findOne({ role: 'student', profileId: student._id }).select('email');
    res.json({ success: true, data: { ...student.toObject(), email: userDoc?.email ?? null } });
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
