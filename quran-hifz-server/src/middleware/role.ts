import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'ليس لديك صلاحية للوصول إلى هذا المورد' });
      return;
    }
    next();
  };
}
