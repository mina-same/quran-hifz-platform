import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { invalidateTenantCache } from '../middleware/auth';
import { signPlatformToken } from '../middleware/platformAuth';
import { PlatformAdmin } from '../models/PlatformAdmin.model';
import { Tenant, tenantHasAccess } from '../models/Tenant.model';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';

// Every query here runs OUTSIDE a tenant context (authenticatePlatform never
// calls runWithTenant), so tenantPlugin applies no filter — that is the point.

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export async function platformLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const admin = await PlatformAdmin.findOne({ email, isActive: true }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
    }
    admin.lastLoginAt = new Date();
    await admin.save();
    res.json({
      success: true,
      token: signPlatformToken(String(admin._id), admin.name),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    next(err);
  }
}

export async function platformMe(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await PlatformAdmin.findById(res.locals.platformAdmin.id);
    if (!admin || !admin.isActive) throw new AppError('غير مصرح', 401);
    res.json({ success: true, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    next(err);
  }
}

type Count = { _id: unknown; n: number };
const toMap = (rows: Count[]) => new Map(rows.map((r) => [String(r._id), r.n]));

/** GET /api/platform/tenants — every organisation + usage counts + summary. */
export async function listTenants(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [tenants, users, students] = await Promise.all([
      Tenant.find().sort({ createdAt: -1 }).lean(),
      User.aggregate<Count>([{ $group: { _id: '$tenant', n: { $sum: 1 } } }]),
      Student.aggregate<Count>([{ $group: { _id: '$tenant', n: { $sum: 1 } } }]),
    ]);
    const userCount = toMap(users);
    const studentCount = toMap(students);
    const now = new Date();

    const rows = tenants.map((t) => ({
      ...t,
      hasAccess: tenantHasAccess(t, now),
      users: userCount.get(String(t._id)) ?? 0,
      students: studentCount.get(String(t._id)) ?? 0,
    }));

    const summary = {
      total: rows.length,
      trial: rows.filter((r) => r.status === 'trial' && r.hasAccess).length,
      expired: rows.filter((r) => r.status !== 'suspended' && !r.hasAccess).length,
      active: rows.filter((r) => r.status === 'active' && r.hasAccess).length,
      suspended: rows.filter((r) => r.status === 'suspended').length,
      students: rows.reduce((a, r) => a + r.students, 0),
      newThisWeek: rows.filter((r) => now.getTime() - new Date(r.createdAt).getTime() < 7 * 86_400_000).length,
    };

    res.json({ success: true, tenants: rows, summary });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.discriminatedUnion('action', [
  /** Paid: active for N months (0 = no end date). */
  z.object({ action: z.literal('activate'), months: z.number().int().min(0).max(60) }),
  /** Add N days to the trial (from now if it already ended). */
  z.object({ action: z.literal('extendTrial'), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal('suspend') }),
  /** Lift a suspension back to whatever it was entitled to. */
  z.object({ action: z.literal('unsuspend') }),
  z.object({ action: z.literal('note'), notes: z.string().max(2000) }),
]);

/** PATCH /api/platform/tenants/:id */
export async function updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) throw new AppError('المؤسسة غير موجودة', 404);
    const now = Date.now();

    switch (body.action) {
      case 'activate': {
        tenant.status = 'active';
        if (body.months === 0) {
          tenant.paidUntil = undefined;
        } else {
          // Stack on an unexpired subscription instead of overwriting it.
          const base = tenant.paidUntil && tenant.paidUntil.getTime() > now ? tenant.paidUntil : new Date(now);
          const until = new Date(base);
          until.setMonth(until.getMonth() + body.months);
          tenant.paidUntil = until;
        }
        break;
      }
      case 'extendTrial': {
        const base = Math.max(tenant.trialEndsAt.getTime(), now);
        tenant.trialEndsAt = new Date(base + body.days * 86_400_000);
        if (tenant.status === 'suspended') tenant.status = 'trial';
        break;
      }
      case 'suspend':
        tenant.status = 'suspended';
        break;
      case 'unsuspend':
        tenant.status = tenant.paidUntil ? 'active' : 'trial';
        break;
      case 'note':
        tenant.notes = body.notes;
        break;
    }

    await tenant.save();
    invalidateTenantCache(String(tenant._id));
    res.json({ success: true, tenant });
  } catch (err) {
    next(err);
  }
}
