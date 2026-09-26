import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { AppError } from '../middleware/error';
import { supervisorGenderOf, trackIdsForGender } from '../lib/supervisorScope';

const updateParentSchema = z.object({
  name:        z.string().min(2, 'الاسم مطلوب').optional(),
  email:       z.string().email('البريد الإلكتروني غير صحيح').optional(),
  newPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

const createParentSchema = z.object({
  name:     z.string().min(2, 'الاسم مطلوب'),
  email:    z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
  phone:    z.string().optional(),
});

const createSupervisorSchema = z.object({
  name:     z.string().min(2, 'الاسم مطلوب'),
  email:    z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل'),
  gender:   z.enum(['male', 'female'], { errorMap: () => ({ message: 'يجب تحديد الفئة (بنين/بنات)' }) }),
});

export async function getParents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // A supervisor is scoped to one gender's masajid — restrict to parents
    // with at least one child in a track under that scope, same boundary
    // student.controller.ts/track.controller.ts already enforce.
    const parentFilter: Record<string, unknown> = { role: 'parent' };
    const supervisorGender = supervisorGenderOf(req);
    if (supervisorGender) {
      const allowedTrackIds = await trackIdsForGender(supervisorGender);
      const scopedStudentIds = await Student.find({ track: { $in: allowedTrackIds } }).select('_id');
      const scopedParentIds = await ParentStudent.find({ student: { $in: scopedStudentIds.map((s) => s._id) } }).distinct('parent');
      parentFilter._id = { $in: scopedParentIds };
    }

    const parents = await User.find(parentFilter).sort({ name: 1 });
    const enriched = await Promise.all(
      parents.map(async (p) => {
        const links = await ParentStudent.find({ parent: p._id }).populate('student', 'name path');
        return {
          _id:      p._id,
          name:     p.name,
          email:    p.email,
          isActive: p.isActive,
          // `student` populates to null when the link is stale (its Student was
          // deleted without cleaning up ParentStudent) — drop those rather than
          // sending null into a list the client renders `.name` off of.
          children: links.map((l) => l.student).filter(Boolean),
        };
      }),
    );
    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createParentSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
    const parent = await User.create({ name: data.name, email: data.email, password: data.password, role: 'parent' });
    res.status(201).json({
      success: true,
      data: { _id: parent._id, name: parent.name, email: parent.email },
      credentials: { email: data.email, password: data.password },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSupervisors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supervisors = await User.find({ role: 'supervisor' }).sort({ name: 1 });
    res.json({
      success: true,
      count: supervisors.length,
      data: supervisors.map((s) => ({
        _id: s._id, name: s.name, email: s.email, isActive: s.isActive, gender: s.supervisorGender,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createSupervisor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createSupervisorSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
    const supervisor = await User.create({
      name: data.name, email: data.email, password: data.password,
      role: 'supervisor', supervisorGender: data.gender,
    });
    res.status(201).json({
      success: true,
      data: { _id: supervisor._id, name: supervisor.name, email: supervisor.email, gender: supervisor.supervisorGender },
      credentials: { email: data.email, password: data.password },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSupervisor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supervisor = await User.findOneAndDelete({ _id: req.params.supervisorId, role: 'supervisor' });
    if (!supervisor) throw new AppError('المشرف غير موجود', 404);
    res.json({ success: true, message: 'تم حذف حساب المشرف بنجاح' });
  } catch (err) {
    next(err);
  }
}

export async function linkChild(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { parentId, studentId } = req.params;
    const parent = await User.findOne({ _id: parentId, role: 'parent' });
    if (!parent) throw new AppError('ولي الأمر غير موجود', 404);
    const student = await Student.findById(studentId);
    if (!student) throw new AppError('الطالب غير موجود', 404);
    await ParentStudent.findOneAndUpdate(
      { parent: parentId, student: studentId },
      { parent: parentId, student: studentId },
      { upsert: true, new: true },
    );
    res.json({ success: true, message: 'تم ربط الطالب بولي الأمر' });
  } catch (err) {
    next(err);
  }
}

export async function unlinkChild(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { parentId, studentId } = req.params;
    await ParentStudent.findOneAndDelete({ parent: parentId, student: studentId });
    res.json({ success: true, message: 'تم إلغاء الربط' });
  } catch (err) {
    next(err);
  }
}

export async function updateParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, newPassword } = updateParentSchema.parse(req.body);
    const parent = await User.findOne({ _id: req.params.parentId, role: 'parent' });
    if (!parent) throw new AppError('ولي الأمر غير موجود', 404);

    if (name)  parent.name = name;
    if (email && email !== parent.email) {
      const conflict = await User.findOne({ email, _id: { $ne: parent._id } });
      if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      parent.email = email;
    }
    if (newPassword) parent.password = newPassword;
    await parent.save();

    res.json({ success: true, data: { _id: parent._id, name: parent.name, email: parent.email } });
  } catch (err) {
    next(err);
  }
}

export async function getStudentParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const link = await ParentStudent.findOne({ student: req.params.studentId })
      .populate('parent', 'name email');
    res.json({ success: true, data: link ? link.parent : null });
  } catch (err) {
    next(err);
  }
}

export async function setStudentParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const { parentId } = req.body as { parentId: string };

    if (parentId) {
      const parent = await User.findOne({ _id: parentId, role: 'parent' });
      if (!parent) throw new AppError('ولي الأمر غير موجود', 404);
      await ParentStudent.findOneAndUpdate(
        { student: studentId },
        { parent: parentId, student: studentId },
        { upsert: true, new: true },
      );
    } else {
      await ParentStudent.findOneAndDelete({ student: studentId });
    }

    res.json({ success: true, message: 'تم تحديث ولي الأمر' });
  } catch (err) {
    next(err);
  }
}
