import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ENV } from '../config/env';
import { AppError } from '../middleware/error';
import { runWithTenant } from '../lib/tenancy';
import { Tenant, RESERVED_SLUGS, SLUG_PATTERN } from '../models/Tenant.model';
import { User } from '../models/User.model';
import { signToken, tenantSummary } from './auth.controller';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, 'الرابط من ٣ إلى ٣٢ حرفاً إنجليزياً صغيراً أو رقماً أو شرطة (-)، ولا يبدأ أو ينتهي بشرطة')
  .refine((s) => !RESERVED_SLUGS.has(s), 'هذا الرابط محجوز، اختر رابطاً آخر');

const signupSchema = z.object({
  // Organisation
  orgName:          z.string().trim().min(3, 'اسم المؤسسة مطلوب (٣ أحرف على الأقل)').max(120),
  orgType:          z.enum(['association', 'masjid', 'school', 'center', 'individual']),
  slug:             slugSchema,
  country:          z.string().trim().min(2, 'الدولة مطلوبة'),
  city:             z.string().trim().max(80).optional(),
  expectedStudents: z.coerce.number().int().min(0).max(100000).optional(),
  // Owner (becomes the organisation's first admin account)
  ownerName: z.string().trim().min(3, 'الاسم مطلوب (٣ أحرف على الأقل)'),
  email:     z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  phone:     z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, 'رقم جوال غير صالح'),
  password:  z.string().min(8, 'كلمة المرور ٨ أحرف على الأقل'),
});

async function slugAvailable(slug: string): Promise<boolean> {
  return !RESERVED_SLUGS.has(slug) && !(await Tenant.exists({ slug }));
}

/** GET /api/tenants/check-slug/:slug — live availability for the signup form. */
export async function checkSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = slugSchema.safeParse(req.params.slug);
    if (!parsed.success) {
      res.json({ success: true, available: false, message: parsed.error.errors[0].message });
      return;
    }
    const available = await slugAvailable(parsed.data);
    res.json({
      success: true,
      available,
      message: available ? 'الرابط متاح' : 'هذا الرابط مستخدم، اختر رابطاً آخر',
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/tenants/by-slug/:slug — public branding for /<slug> login page. */
export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await Tenant.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!tenant) throw new AppError('لا توجد مؤسسة بهذا الرابط', 404);
    res.json({ success: true, tenant: { name: tenant.name, slug: tenant.slug, orgType: tenant.orgType } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/tenants/current — subscription state for the signed-in org. */
export async function getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await Tenant.findById(req.user!.tenantId);
    if (!tenant) throw new AppError('المؤسسة غير موجودة', 404);
    res.json({ success: true, tenant: tenantSummary(tenant) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tenants/signup — create an organisation on a free trial plus its
 * first admin account, and sign that admin in.
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = signupSchema.parse(req.body);
    if (!(await slugAvailable(data.slug))) throw new AppError('هذا الرابط مستخدم، اختر رابطاً آخر', 409);

    const tenant = await Tenant.create({
      name: data.orgName,
      slug: data.slug,
      orgType: data.orgType,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      country: data.country,
      city: data.city,
      expectedStudents: data.expectedStudents,
      status: 'trial',
      trialEndsAt: new Date(Date.now() + ENV.TRIAL_DAYS * 24 * 60 * 60 * 1000),
    });

    // Not a transaction (a bare local mongod has no replica set) — roll the
    // tenant back by hand if the admin account can't be created.
    let admin;
    try {
      admin = await runWithTenant(String(tenant._id), () =>
        User.create({ name: data.ownerName, email: data.email, password: data.password, role: 'admin' }),
      );
    } catch (err) {
      await Tenant.deleteOne({ _id: tenant._id });
      throw err;
    }

    const token = signToken(String(admin._id), admin.role, admin.name, String(tenant._id));
    res.status(201).json({
      success: true,
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      tenant: tenantSummary(tenant),
    });
  } catch (err) {
    next(err);
  }
}
