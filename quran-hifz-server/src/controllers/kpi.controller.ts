import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KPI } from '../models/KPI.model';
import { AppError } from '../middleware/error';
import { Masjid, type MasjidGender } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { Evaluation } from '../models/Evaluation.model';
import { Attendance } from '../models/Attendance.model';
import { DailyReport } from '../models/DailyReport.model';
import { Homework } from '../models/Homework.model';
import { supervisorGenderOf } from '../lib/supervisorScope';
import { computeKpis } from '../lib/kpis';

const kpiSchema = z.object({
  indicator: z.string().min(1),
  target:    z.string().min(1),
  actual:    z.string().min(1),
  rating:    z.enum(['ممتاز', 'جيد', 'مقبول', 'ضعيف']),
  period:    z.string().optional(),
});

/**
 * GET /kpis?gender=&today=YYYY-MM-DD — this month's performance indicators,
 * computed from real records (lib/kpis.ts) for the caller's scope: a
 * supervisor's own section, else the optional gender filter, else everything.
 * Archived halqas are left out. (The stored KPI rows were hand-typed seed data.)
 */
export async function getKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const genderParam = req.query.gender;
    const gender: MasjidGender | undefined = supervisorGenderOf(req) ?? (
      genderParam === 'male' || genderParam === 'female' ? genderParam : undefined
    );
    const t = String(req.query.today ?? '');
    const today = /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : new Date().toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const from = new Date(monthStart);
    const to = new Date(new Date(today).getTime() + 86_400_000);

    const masjidIds = (await Masjid.find(gender ? { gender } : {}).select('_id').lean()).map((m) => m._id);
    const trackIds = (await Track.find({ masjid: { $in: masjidIds }, deletedAt: null }).select('_id').lean()).map((x) => x._id);

    const [evals, attendance, reports, homework] = await Promise.all([
      Evaluation.find({ track: { $in: trackIds }, date: { $gte: from, $lt: to } })
        .select('student track date total totalMax attendanceStatus').lean(),
      Attendance.find({ track: { $in: trackIds }, date: { $gte: from, $lt: to } }).select('status').lean(),
      DailyReport.find({ track: { $in: trackIds }, date: { $gte: monthStart, $lte: today } }).select('track date').lean(),
      Homework.find({ track: { $in: trackIds }, dueDate: { $gte: from, $lt: to } }).select('status').lean(),
    ]);

    const data = computeKpis({
      evals: evals.map((e) => ({
        student: String(e.student), track: String(e.track),
        date: new Date(e.date).toISOString().slice(0, 10),
        total: e.total ?? 0, totalMax: e.totalMax ?? 10, attendanceStatus: e.attendanceStatus,
      })),
      attendance: attendance.map((a) => ({ status: a.status })),
      reportsSent: new Set(reports.map((r) => `${String(r.track)}|${r.date}`)),
      homework: homework.map((h) => ({ status: h.status })),
    });
    res.json({ success: true, count: data.length, period: { from: monthStart, to: today }, data });
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
