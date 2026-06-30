import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Masjid } from '../models/Masjid.model';
import { Halqa } from '../models/Halqa.model';
import { AppError } from '../middleware/error';

const masjidSchema = z.object({
  name:     z.string().min(2, 'اسم المسجد مطلوب'),
  location: z.string().min(2, 'الموقع مطلوب'),
});

export async function getMasajid(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masajid = await Masjid.find().sort({ name: 1 });

    const enriched = await Promise.all(
      masajid.map(async (m) => {
        const halqat = await Halqa.find({ masjid: m._id })
          .populate('teacher', 'name')
          .select('name days time studentCount capacity');
        return { ...m.toObject(), halqat };
      }),
    );

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) throw new AppError('المسجد غير موجود', 404);

    const halqat = await Halqa.find({ masjid: masjid._id }).populate('teacher', 'name specialty');
    res.json({ success: true, data: { ...masjid.toObject(), halqat } });
  } catch (err) {
    next(err);
  }
}

export async function createMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = masjidSchema.parse(req.body);
    const masjid = await Masjid.create(data);
    res.status(201).json({ success: true, data: masjid });
  } catch (err) {
    next(err);
  }
}

export async function updateMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = masjidSchema.partial().parse(req.body);
    const masjid = await Masjid.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!masjid) throw new AppError('المسجد غير موجود', 404);
    res.json({ success: true, data: masjid });
  } catch (err) {
    next(err);
  }
}
