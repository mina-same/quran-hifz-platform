import { UserRole } from '../models/User.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        name: string;
        /** Fixed at account creation; only set when role === 'supervisor'. */
        supervisorGender?: 'male' | 'female';
      };
    }
  }
}
