import { Request, Response, NextFunction } from 'express';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { Halqa } from '../models/Halqa.model';
import { Masjid } from '../models/Masjid.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { SpecialTrack } from '../models/SpecialTrack.model';

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalHalqat,
      totalSpecialTracks,
      totalMasajid,
      pendingHomework,
      lateHomework,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' }),
      Halqa.countDocuments(),
      SpecialTrack.countDocuments(),
      Masjid.countDocuments(),
      Homework.countDocuments({ status: 'معلق' }),
      Homework.countDocuments({ status: 'متأخر' }),
    ]);

    // Average attendance across all students
    const attendanceAgg = await Attendance.aggregate([
      { $group: { _id: null, avg: { $avg: { $cond: [{ $eq: ['$status', 'حاضر'] }, 1, 0] } } } },
    ]);
    const avgAttendancePct = attendanceAgg[0]
      ? Math.round(attendanceAgg[0].avg * 100)
      : 0;

    // Average hifz progress
    const progressAgg = await Student.aggregate([
      { $group: { _id: null, avg: { $avg: '$progressPct' } } },
    ]);
    const avgProgressPct = progressAgg[0] ? Math.round(progressAgg[0].avg) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalHalqat,
        totalSpecialTracks,
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
