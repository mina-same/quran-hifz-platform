import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({ success: false, message: 'القيمة موجودة مسبقاً' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم' });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'المورد المطلوب غير موجود' });
}
