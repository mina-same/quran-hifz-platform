import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Teacher } from '../models/Teacher.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/error';
import { supervisorGenderOf, trackIdsForGender } from '../lib/supervisorScope';

const teacherSchema = z.object({
  name:        z.string().min(2, 'الاسم مطلوب'),
  specialty:   z.string().optional(),
  phone:       z.string().optional(),
  rating:      z.string().optional(),
  status:      z.enum(['active', 'inactive']).optional(),
  email:       z.string().email('البريد الإلكتروني غير صحيح').optional(),
  password:    z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
  newPassword: z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

export async function getTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supervisorGender = supervisorGenderOf(req);
    let allowedTrackIdSet: Set<string> | null = null;
    const teacherFilter: Record<string, unknown> = { status: 'active' };
    if (supervisorGender) {
      const allowedTrackIds = await trackIdsForGender(supervisorGender);
      allowedTrackIdSet = new Set(allowedTrackIds.map(String));
      const tracksWithTeachers = await Track.find({ _id: { $in: allowedTrackIds } }).select('teachers').lean();
      teacherFilter._id = { $in: [...new Set(tracksWithTeachers.flatMap((t) => t.teachers.map(String)))] };
    }
    const teachers = await Teacher.find(teacherFilter).sort({ name: 1 });

    // Batched: one query each for tracks, per-track student counts and login
    // emails, instead of three queries per teacher.
    const teacherIds = teachers.map((t) => t._id);
    const [allTracks, userDocs] = await Promise.all([
      Track.find({ teachers: { $in: teacherIds }, deletedAt: null }).select('_id teachers').lean(),
      User.find({ role: 'teacher', profileId: { $in: teacherIds } }).select('profileId email').lean(),
    ]);
    const scopedTracks = allowedTrackIdSet
      ? allTracks.filter((tr) => allowedTrackIdSet!.has(String(tr._id)))
      : allTracks;
    const counts = await Student.aggregate<{ _id: unknown; n: number }>([
      { $match: { track: { $in: scopedTracks.map((tr) => tr._id) } } },
      { $group: { _id: '$track', n: { $sum: 1 } } },
    ]);
    const countByTrack = new Map(counts.map((c) => [String(c._id), c.n]));
    const emailByTeacher = new Map<string, string>();
    for (const u of userDocs) {
      const key = String(u.profileId);
      if (!emailByTeacher.has(key)) emailByTeacher.set(key, u.email);
    }

    const enriched = teachers.map((t) => {
      const own = scopedTracks.filter((tr) => tr.teachers.some((id) => String(id) === String(t._id)));
      return {
        ...t.toObject(),
        tracksCount:  own.length,
        studentCount: own.reduce((sum, tr) => sum + (countByTrack.get(String(tr._id)) ?? 0), 0),
        email:        emailByTeacher.get(String(t._id)) ?? null,
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) throw new AppError('المعلم غير موجود', 404);

    const tracks = await Track.find({ teachers: teacher._id, deletedAt: null }).populate('masjid', 'name gender');

    const supervisorGender = supervisorGenderOf(req);
    if (supervisorGender) {
      const inScope = tracks.some((t) => (t.masjid as unknown as { gender?: string })?.gender === supervisorGender);
      if (!inScope) throw new AppError('المعلم غير موجود', 404);
    }

    res.json({ success: true, data: { ...teacher.toObject(), tracks } });
  } catch (err) {
    next(err);
  }
}

export async function createTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...teacherData } = teacherSchema.parse(req.body);
    const teacher = await Teacher.create(teacherData);

    let userCredentials: { email: string; password: string } | undefined;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Teacher.findByIdAndDelete(teacher._id);
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      }
      await User.create({ name: teacherData.name, email, password, role: 'teacher', profileId: teacher._id });
      userCredentials = { email, password };
    }

    res.status(201).json({ success: true, data: teacher, credentials: userCredentials });
  } catch (err) {
    next(err);
  }
}

export async function updateTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, newPassword, ...teacherData } = teacherSchema.partial().parse(req.body);
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, teacherData, { new: true, runValidators: true });
    if (!teacher) throw new AppError('المعلم غير موجود', 404);

    if (email || newPassword || password) {
      const userDoc = await User.findOne({ role: 'teacher', profileId: teacher._id });
      if (userDoc) {
        if (email && email !== userDoc.email) {
          const conflict = await User.findOne({ email, _id: { $ne: userDoc._id } });
          if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
          userDoc.email = email;
        }
        if (newPassword) userDoc.password = newPassword;
        await userDoc.save();
      } else if (email && (newPassword || password)) {
        // Teacher was created without credentials — create User now
        const initialPassword = (newPassword || password)!;
        const existing = await User.findOne({ email });
        if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
        await User.create({ name: teacher.name, email, password: initialPassword, role: 'teacher', profileId: teacher._id });
      }
    }

    const userDoc = await User.findOne({ role: 'teacher', profileId: teacher._id }).select('email');
    res.json({ success: true, data: { ...teacher.toObject(), email: userDoc?.email ?? null } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) throw new AppError('المعلم غير موجود', 404);
    res.json({ success: true, message: 'تم حذف المعلم بنجاح' });
  } catch (err) {
    next(err);
  }
}
