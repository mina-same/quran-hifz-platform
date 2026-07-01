import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { AppError } from '../middleware/error';

const trackSchema = z.object({
  title:       z.string().min(1),
  type:        z.string().min(1),
  status:      z.enum(['active', 'upcoming', 'ended']).optional(),
  startDate:   z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  endDate:     z.string().refine((d) => !isNaN(Date.parse(d)), 'تاريخ غير صالح'),
  daysPerWeek: z.string().min(1),
  timeSlot:    z.string().min(1),
  location:    z.string().min(1),
  isOnline:    z.boolean().optional(),
  meetLink:    z.string().url('رابط غير صالح').optional().or(z.literal('')),
  teacher:     z.string().min(1),
  maxStudents: z.number().int().positive(),
  notes:       z.string().optional(),
});

export async function getTracks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const tracks = await SpecialTrack.find(filter)
      .populate('teacher', 'name')
      .populate('enrolledStudents', 'name')
      .sort({ startDate: -1 });
    res.json({ success: true, count: tracks.length, data: tracks });
  } catch (err) {
    next(err);
  }
}

export async function createTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.parse(req.body);
    const track = await SpecialTrack.create({
      ...data,
      startDate: new Date(data.startDate),
      endDate:   new Date(data.endDate),
    });
    res.status(201).json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

export async function updateTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = trackSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data };
    if (data.startDate) update.startDate = new Date(data.startDate);
    if (data.endDate)   update.endDate   = new Date(data.endDate);
    const track = await SpecialTrack.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

export async function enrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.body;
    const track = await SpecialTrack.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { enrolledStudents: studentId } },
      { new: true },
    );
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, data: track });
  } catch (err) {
    next(err);
  }
}

export async function deleteTrack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const track = await SpecialTrack.findByIdAndDelete(req.params.id);
    if (!track) throw new AppError('المسار غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
