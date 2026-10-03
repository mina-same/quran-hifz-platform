import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { runWithTenant } from '../lib/tenancy';
import { Tenant, tenantHasAccess, type ITenant } from '../models/Tenant.model';

interface JwtPayload {
  id: string;
  role: string;
  name: string;
  tenantId?: string;
  supervisorGender?: 'male' | 'female';
}

/** Routes that stay reachable after the trial ends, so the client can show
 *  the "contact sales" screen and the user can still sign out. */
const ALWAYS_ALLOWED = new Set(['/api/auth/me', '/api/auth/logout', '/api/tenants/current']);

// Tiny cache so the subscription check doesn't add a DB round-trip per request.
const CACHE_MS = 30_000;
const tenantCache = new Map<string, { at: number; tenant: Pick<ITenant, 'status' | 'trialEndsAt' | 'paidUntil'> | null }>();

async function loadTenant(id: string) {
  const hit = tenantCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.tenant;
  const tenant = await Tenant.findById(id).select('status trialEndsAt paidUntil').lean();
  tenantCache.set(id, { at: Date.now(), tenant });
  return tenant;
}

export function invalidateTenantCache(id: string): void {
  tenantCache.delete(id);
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'غير مصرح: لم يتم إرسال رمز التحقق' });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
    return;
  }

  // Pre-SaaS tokens carry no tenant — treating them as "unscoped" would leak
  // every organisation's data, so they must sign in again.
  if (!payload.tenantId) {
    res.status(401).json({ success: false, message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' });
    return;
  }

  req.user = {
    id: payload.id,
    role: payload.role as never,
    name: payload.name,
    tenantId: payload.tenantId,
    supervisorGender: payload.supervisorGender,
  };

  loadTenant(payload.tenantId)
    .then((tenant) => {
      if (!tenant) {
        res.status(401).json({ success: false, message: 'المؤسسة غير موجودة' });
        return;
      }
      if (!tenantHasAccess(tenant) && !ALWAYS_ALLOWED.has(req.baseUrl + req.path)) {
        res.status(402).json({
          success: false,
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'انتهت الفترة التجريبية، يرجى التواصل مع فريق المبيعات لتفعيل الاشتراك',
          salesWhatsapp: ENV.SALES_WHATSAPP,
        });
        return;
      }
      // Everything downstream of this point — controllers, populate, helpers —
      // runs inside the tenant context, so tenantPlugin scopes every query.
      runWithTenant(payload.tenantId!, () => next());
    })
    .catch(next);
}
