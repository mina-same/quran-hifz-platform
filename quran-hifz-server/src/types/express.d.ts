import { UserRole } from '../models/User.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        name: string;
      };
    }
  }
}
