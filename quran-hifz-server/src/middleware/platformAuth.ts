import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

interface PlatformJwt {
  id: string;
  name: string;
  scope?: string;
}

/** Super-admin tokens carry `scope: 'platform'` and no tenantId, so the
 *  regular `authenticate` rejects them and this one rejects tenant tokens. */
export function signPlatformToken(id: string, name: string): string {
  return jwt.sign({ id, name, scope: 'platform' }, ENV.JWT_SECRET, { expiresIn: '12h' } as jwt.SignOptions);
}

export function authenticatePlatform(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  try {
    const payload = token ? (jwt.verify(token, ENV.JWT_SECRET) as PlatformJwt) : null;
    if (!payload || payload.scope !== 'platform') throw new Error('not platform');
    res.locals.platformAdmin = { id: payload.id, name: payload.name };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'غير مصرح' });
  }
}
