import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Student, NATIONAL_ID_RE } from '../models/Student.model';
import { User } from '../models/User.model';
import { Track } from '../models/Track.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { AppError } from '../middleware/error';

const studentSchema = z.object({
  name:             z.string().min(2, 'الاسم مطلوب'),
  /** Empty string is normalised to undefined so a blank field clears rather
   *  than failing the 10-digit check. */
  nationalId:       z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(NATIONAL_ID_RE, 'رقم الهوية يجب أن يكون ١٠ أرقام ويبدأ بـ ١ أو ٢').optional(),
  ),
  path:             z.enum(['حفظ كامل', 'عشرون جزءاً', 'عشرة أجزاء', 'خمسة أجزاء']),
  track:            z.string().min(1, 'المسار مطلوب'),
  guardian:         z.string().optional(),
  guardianPhone:    z.string().optional(),
  lastMemorization: z.string().optional(),
  level:            z.coerce.number().int().min(1, 'المستوى بين ١ و١٠').max(10, 'المستوى بين ١ و١٠').optional(),
  totalPages:       z.number().optional(),
  status:           z.enum(['active', 'inactive', 'new']).optional(),
  email:            z.string().email('البريد الإلكتروني غير صحيح').optional(),
  password:         z.string().min(6, 'كلمة المرور 6 أحرف على الأقل').optional(),
});

export async function getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { track, masjid, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (track) {
      const ids = String(track).split(',').filter(Boolean);
      filter.track = ids.length > 1 ? { $in: ids } : ids[0];
    }
    if (status)  filter.status = status;
    if (search)  filter.name   = { $regex: search, $options: 'i' };

    // `masjid` filters by the student's track's masjid — Student itself no
    // longer stores masjid directly, so this needs a two-step resolve.
    if (masjid) {
      const tracksAtMasjid = await Track.find({ masjid }).select('_id');
      const masjidTrackIds = tracksAtMasjid.map((t) => String(t._id));
      if (filter.track) {
        const requestedIds = typeof filter.track === 'string'
          ? [filter.track]
          : (filter.track as { $in: string[] }).$in.map(String);
        filter.track = { $in: requestedIds.filter((id) => masjidTrackIds.includes(id)) };
      } else {
        filter.track = { $in: masjidTrackIds };
      }
    }

    const students = await Student.find(filter)
      .populate({ path: 'track', select: 'title masjid', populate: { path: 'masjid', select: 'name location gender' } })
      .sort({ createdAt: -1 });

    const studentIds = students.map((s) => s._id);
    const userDocs = await User.find({ role: 'student', profileId: { $in: studentIds } }).select('profileId email');
    const emailMap = new Map(userDocs.map((u) => [String(u.profileId), u.email]));

    const links = await ParentStudent.find({ student: { $in: studentIds } }).select('parent student');
    const parentUserDocs = await User.find({ role: 'parent', _id: { $in: links.map((l) => l.parent) } }).select('name email');
    const parentUserMap = new Map(parentUserDocs.map((u) => [String(u._id), { name: u.name, email: u.email }]));
    const parentMap = new Map(
      links
        .map((l) => [String(l.student), parentUserMap.get(String(l.parent))] as const)
        .filter((pair): pair is [string, { name: string; email: string }] => !!pair[1]),
    );

    const enriched = students.map((s) => {
      const parent = parentMap.get(String(s._id));
      return {
        ...s.toObject(),
        email: emailMap.get(String(s._id)) ?? null,
        parentName: parent?.name ?? null,
        parentEmail: parent?.email ?? null,
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findById(req.params.id)
      .populate({ path: 'track', select: 'title daysPerWeek timeSlot masjid', populate: { path: 'masjid', select: 'name location gender' } });

    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...studentData } = studentSchema.parse(req.body);
    const student = await Student.create(studentData);

    let userCredentials: { email: string; password: string } | undefined;
    if (email && password) {
      const existing = await User.findOne({ email });
      if (existing) {
        await Student.findByIdAndDelete(student._id);
        throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
      }
      await User.create({ name: studentData.name, email, password, role: 'student', profileId: student._id });
      userCredentials = { email, password };
    }

    res.status(201).json({ success: true, data: student, credentials: userCredentials });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, ...studentData } = studentSchema.partial().parse(req.body);
    const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true, runValidators: true });
    if (!student) throw new AppError('الطالب غير موجود', 404);

    if (email || password) {
      const userDoc = await User.findOne({ role: 'student', profileId: student._id });
      if (userDoc) {
        if (email && email !== userDoc.email) {
          const conflict = await User.findOne({ email, _id: { $ne: userDoc._id } });
          if (conflict) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
          userDoc.email = email;
        }
        if (password) userDoc.password = password;
        await userDoc.save();
      } else if (email && password) {
        const existing = await User.findOne({ email });
        if (existing) throw new AppError('البريد الإلكتروني مستخدم بالفعل', 400);
        await User.create({ name: student.name, email, password, role: 'student', profileId: student._id });
      }
    }

    const userDoc = await User.findOne({ role: 'student', profileId: student._id }).select('email');
    res.json({ success: true, data: { ...student.toObject(), email: userDoc?.email ?? null } });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) throw new AppError('الطالب غير موجود', 404);
    res.json({ success: true, message: 'تم حذف الطالب بنجاح' });
  } catch (err) {
    next(err);
  }
}
