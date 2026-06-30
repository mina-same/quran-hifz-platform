import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KPI } from '../models/KPI.model';
import { AppError } from '../middleware/error';

const kpiSchema = z.object({
  indicator: z.string().min(1),
  target:    z.string().min(1),
  actual:    z.string().min(1),
  rating:    z.enum(['ممتاز', 'جيد', 'مقبول', 'ضعيف']),
  period:    z.string().optional(),
});

export async function getKPIs(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kpis = await KPI.find().sort({ createdAt: 1 });
    res.json({ success: true, count: kpis.length, data: kpis });
  } catch (err) {
    next(err);
  }
}

export async function createKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = kpiSchema.parse(req.body);
    const kpi = await KPI.create(data);
    res.status(201).json({ success: true, data: kpi });
  } catch (err) {
    next(err);
  }
}

export async function updateKPI(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = kpiSchema.partial().parse(req.body);
    const kpi = await KPI.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!kpi) throw new AppError('مؤشر الأداء غير موجود', 404);
    res.json({ success: true, data: kpi });
  } catch (err) {
    next(err);
  }
}
