import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid, type MasjidGender } from '../models/Masjid.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { Track } from '../models/Track.model';
import { supervisorGenderOf } from '../lib/supervisorScope';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supervisorGender = supervisorGenderOf(req);
    const genderParam = req.query.gender;
    // A supervisor's gender is fixed server-side and overrides whatever the
    // client asks for; every other role keeps the optional query param.
    const gender: MasjidGender | undefined = supervisorGender ?? (
      genderParam === 'male' || genderParam === 'female' ? genderParam : undefined
    );

    // When a gender scope is active, resolve it down to the set of tracks
    // under masajid of that gender — every other count/aggregate below is
    // then scoped to those tracks. No gender param = identical to the
    // unscoped behaviour this endpoint always had.
    let trackIds: Types.ObjectId[] | undefined;
    let teacherIds: Types.ObjectId[] | undefined;
    let masjidCountFilter: Record<string, unknown> = {};
    if (gender) {
      const masajidInScope = await Masjid.find({ gender }).select('_id').lean();
      const masjidIds = masajidInScope.map((m) => m._id);
      masjidCountFilter = { gender };
      const tracksInScope = await Track.find({ masjid: { $in: masjidIds }, deletedAt: null }).select('teachers').lean();
      trackIds = tracksInScope.map((t) => t._id);
      const teacherIdSet = new Set(
        tracksInScope.flatMap((t) => t.teachers.map((id) => id.toString())),
      );
      teacherIds = Array.from(teacherIdSet).map((id) => new Types.ObjectId(id));
    }

    const studentFilter = trackIds ? { track: { $in: trackIds } } : {};
    const trackFilter = trackIds ? { _id: { $in: trackIds } } : { deletedAt: null };
    const teacherFilter = teacherIds ? { _id: { $in: teacherIds }, status: 'active' } : { status: 'active' };
    const homeworkFilter = (status: string) => (trackIds ? { track: { $in: trackIds }, status } : { status });

    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalTracks,
      totalMasajid,
      pendingHomework,
      lateHomework,
    ] = await Promise.all([
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilter, status: 'active' }),
      Teacher.countDocuments(teacherFilter),
      Track.countDocuments(trackFilter),
      Masjid.countDocuments(masjidCountFilter),
      Homework.countDocuments(homeworkFilter('معلق')),
      Homework.countDocuments(homeworkFilter('متأخر')),
    ]);

    // Average attendance, scoped to tracks in scope when a gender filter is active
    const attendanceMatch = trackIds ? { track: { $in: trackIds } } : {};
    const attendanceAgg = await Attendance.aggregate([
      { $match: attendanceMatch },
      { $group: { _id: null, avg: { $avg: { $cond: [{ $eq: ['$status', 'حاضر'] }, 1, 0] } } } },
    ]);
    const avgAttendancePct = attendanceAgg[0]
      ? Math.round(attendanceAgg[0].avg * 100)
      : 0;

    // Average hifz progress, same scoping
    const progressAgg = await Student.aggregate([
      { $match: studentFilter },
      { $group: { _id: null, avg: { $avg: '$progressPct' } } },
    ]);
    const avgProgressPct = progressAgg[0] ? Math.round(progressAgg[0].avg) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalTracks,
        totalMasajid,
        pendingHomework,
        lateHomework,
        avgAttendancePct,
        avgProgressPct,
      },
    });
  } catch (err) {
    next(err);
  }
}
