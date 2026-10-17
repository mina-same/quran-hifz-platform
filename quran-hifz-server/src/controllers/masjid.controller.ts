import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { AppError } from '../middleware/error';
import { supervisorGenderOf } from '../lib/supervisorScope';

const masjidSchema = z.object({
  name:     z.string().min(2, 'اسم المسجد مطلوب'),
  location: z.string().min(2, 'الموقع مطلوب'),
  gender:   z.enum(['male', 'female'], { errorMap: () => ({ message: 'يجب تحديد جنس المسجد' }) }),
});

export async function getMasajid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supervisorGender = supervisorGenderOf(req);
    const masajid = await Masjid.find(supervisorGender ? { gender: supervisorGender } : {}).sort({ name: 1 });

    // One query for every masjid's tracks, grouped here — `masjid` is selected
    // only to group by and stripped again so each track keeps its old shape.
    const allTracks = await Track.find({ masjid: { $in: masajid.map((m) => m._id) }, deletedAt: null })
      .populate('teachers', 'name')
      .select('title daysPerWeek timeSlot maxStudents status masjid');
    const tracksByMasjid = new Map<string, Record<string, unknown>[]>();
    for (const tr of allTracks) {
      const { masjid, ...rest } = tr.toObject();
      const key = String(masjid);
      if (!tracksByMasjid.has(key)) tracksByMasjid.set(key, []);
      tracksByMasjid.get(key)!.push(rest);
    }
    const enriched = masajid.map((m) => ({ ...m.toObject(), tracks: tracksByMasjid.get(String(m._id)) ?? [] }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getMasjid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) throw new AppError('المسجد غير موجود', 404);

    const supervisorGender = supervisorGenderOf(req);
    if (supervisorGender && masjid.gender !== supervisorGender) {
      throw new AppError('المسجد غير موجود', 404);
    }

    const tracks = await Track.find({ masjid: masjid._id, deletedAt: null }).populate('teachers', 'name specialty');
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
