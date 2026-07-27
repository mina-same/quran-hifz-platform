import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Student } from '../models/Student.model';
import { ENV } from '../config/env';
import { AppError } from '../middleware/error';

const loginSchema = z.object({
  email:    z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب (٢ أحرف على الأقل)'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword:      z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون ٦ أحرف على الأقل'),
});

function signToken(id: string, role: string, name: string): string {
  return jwt.sign({ id, role, name }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }

    const token = signToken(String(user._id), user.role, user.name);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, profileId: user.profileId },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) throw new AppError('المستخدم غير موجود', 404);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = updateProfileSchema.parse(req.body);

    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    user.name = name;
    await user.save();

    // Teacher/Student keep their own duplicated `name` field (used across
    // rosters/lists) — keep it in sync so the change is visible everywhere,
    // not just on the account/login side.
    if (user.profileId) {
      if (user.role === 'teacher') await Teacher.findByIdAndUpdate(user.profileId, { name });
      else if (user.role === 'student') await Student.findByIdAndUpdate(user.profileId, { name });
    }

    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, profileId: user.profileId },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user!.id).select('+password');
    if (!user) throw new AppError('المستخدم غير موجود', 404);

    if (!(await user.comparePassword(currentPassword))) {
      throw new AppError('كلمة المرور الحالية غير صحيحة', 401);
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    next(err);
  }
}
