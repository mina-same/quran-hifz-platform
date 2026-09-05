import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { AppError } from '../middleware/error';

const masjidSchema = z.object({
  name:     z.string().min(2, 'اسم المسجد مطلوب'),
  location: z.string().min(2, 'الموقع مطلوب'),
  gender:   z.enum(['male', 'female'], { errorMap: () => ({ message: 'يجب تحديد جنس المسجد' }) }),
});

export async function getMasajid(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masajid = await Masjid.find().sort({ name: 1 });

    const enriched = await Promise.all(
      masajid.map(async (m) => {
        const tracks = await Track.find({ masjid: m._id })
          .populate('teachers', 'name')
          .select('title daysPerWeek timeSlot maxStudents status');
        return { ...m.toObject(), tracks };
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

    const tracks = await Track.find({ masjid: masjid._id }).populate('teachers', 'name specialty');
    res.json({ success: true, data: { ...masjid.toObject(), tracks } });
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

export async function deleteMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const remainingTracks = await Track.countDocuments({ masjid: req.params.id });
    if (remainingTracks > 0) {
      throw new AppError('لا يمكن حذف مسجد به مسارات — احذف أو انقل المسارات أولاً', 400);
    }
    const masjid = await Masjid.findByIdAndDelete(req.params.id);
    if (!masjid) throw new AppError('المسجد غير موجود', 404);
    res.json({ success: true, message: 'تم حذف المسجد بنجاح' });
  } catch (err) {
    next(err);
  }
}
