import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

interface JwtPayload {
  id: string;
  role: string;
  name: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'غير مصرح: لم يتم إرسال رمز التحقق' });
    return;
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.id, role: payload.role as never, name: payload.name };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
  }
}
