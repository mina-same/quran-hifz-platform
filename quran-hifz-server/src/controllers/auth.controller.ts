import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Student } from '../models/Student.model';
import { Tenant, type ITenant } from '../models/Tenant.model';
import { ENV } from '../config/env';
import { AppError } from '../middleware/error';
import { PlatformAdmin } from '../models/PlatformAdmin.model';
import { signPlatformToken } from '../middleware/platformAuth';

const loginSchema = z.object({
  email:    z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  /** Organisation slug (the /<slug> the user signs in from). Optional for
   *  older clients (mobile): the email is then resolved across tenants and
   *  must be unambiguous. */
  slug:     z.string().trim().toLowerCase().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'الاسم مطلوب (٢ أحرف على الأقل)'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword:      z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون ٦ أحرف على الأقل'),
});

const pushTokenSchema = z.object({
  token: z.string().min(1, 'رمز الإشعارات مطلوب'),
});

export function signToken(
  id: string,
  role: string,
  name: string,
  tenantId: string,
  supervisorGender?: 'male' | 'female',
): string {
  return jwt.sign({ id, role, name, tenantId, supervisorGender }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN } as jwt.SignOptions);
}

/** Public subscription view of a tenant, sent to the client after login. */
export function tenantSummary(t: ITenant) {
  return {
    id: t._id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    trialEndsAt: t.trialEndsAt,
    paidUntil: t.paidUntil,
    salesWhatsapp: ENV.SALES_WHATSAPP,
  };
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, slug } = loginSchema.parse(req.body);
    const invalid = new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);

    // One login page for every role: on the platform-wide /login (no slug) a
    // super admin's credentials sign in to the platform console instead of an
    // organisation. Checked first; any mismatch falls through to org users.
    if (!slug) {
      const admin = await PlatformAdmin.findOne({ email: email.toLowerCase(), isActive: true }).select('+password');
      if (admin && (await admin.comparePassword(password))) {
        admin.lastLoginAt = new Date();
        await admin.save();
        res.json({
          success: true,
          role: 'superadmin',
          token: signPlatformToken(String(admin._id), admin.name),
          admin: { id: admin._id, name: admin.name, email: admin.email },
        });
        return;
      }
    }

    // Login runs outside any tenant context, so the tenant filter is explicit here.
    let user;
    if (slug) {
      const tenant = await Tenant.findOne({ slug });
      if (!tenant) throw new AppError('لا توجد مؤسسة بهذا الرابط', 404);
      user = await User.findOne({ tenant: tenant._id, email, isActive: true }).select('+password');
    } else {
      const matches = await User.find({ email, isActive: true }).select('+password').limit(2);
      if (matches.length > 1) {
        throw new AppError('هذا البريد مسجَّل في أكثر من مؤسسة، يرجى الدخول من رابط مؤسستك', 409);
      }
      user = matches[0];
    }
    if (!user || !user.tenant || !(await user.comparePassword(password))) throw invalid;

    const tenant = await Tenant.findById(user.tenant);
    if (!tenant) throw invalid;

    const token = signToken(String(user._id), user.role, user.name, String(tenant._id), user.supervisorGender);

    res.json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role, profileId: user.profileId,
        supervisorGender: user.supervisorGender,
      },
      tenant: tenantSummary(tenant),
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) throw new AppError('المستخدم غير موجود', 404);
    const tenant = await Tenant.findById(req.user!.tenantId);
    res.json({ success: true, user, tenant: tenant ? tenantSummary(tenant) : null });
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

export async function registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = pushTokenSchema.parse(req.body);
    await User.findByIdAndUpdate(req.user!.id, { pushToken: token });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
