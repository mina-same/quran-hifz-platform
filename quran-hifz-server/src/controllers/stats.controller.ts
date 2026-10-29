import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid, type MasjidGender } from '../models/Masjid.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { Track } from '../models/Track.model';
import { supervisorGenderOf } from '../lib/supervisorScope';
import { deletedTrackIds } from '../lib/deletedTracks';
import { Evaluation } from '../models/Evaluation.model';
import { DailyReport } from '../models/DailyReport.model';
import { EvaluationChange } from '../models/EvaluationChange.model';

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
    // Unscoped: everything except archived tracks (a gender scope already excludes them).
    const archived = trackIds ? [] : await deletedTrackIds();
    const homeworkFilter = (status: string) => (trackIds ? { track: { $in: trackIds }, status } : { track: { $nin: archived }, status });

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
    // Excused (مستأذن) sessions are excluded entirely.
    const attendanceMatch = trackIds
      ? { track: { $in: trackIds }, status: { $ne: 'مستأذن' } }
      : { track: { $nin: archived }, status: { $ne: 'مستأذن' } };
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

const ALERT_ABSENCE_RATE = 0.25;  // > 25% absent…
const ALERT_MIN_SESSIONS = 3;     // …over at least this many recorded sessions
const ALERT_CAPACITY = 0.9;       // halqa at ≥ 90% of maxStudents
const ALERT_EXCELLENT_AVG = 0.9;  // ≥ 9/10 average this month…
const ALERT_EXCELLENT_DAYS = 5;   // …over at least this many evaluated days

/**
 * GET /stats/alerts?gender=&today=YYYY-MM-DD — «آخر التنبيهات» on the admin /
 * supervisor dashboard, computed from real records (archived tracks excluded):
 * frequent absence, halqas near capacity, this month's excellent students, and
 * halqas that recorded today but haven't sent their daily report.
 */
export async function getDashboardAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const genderParam = req.query.gender;
    const gender: MasjidGender | undefined = supervisorGenderOf(req) ?? (
      genderParam === 'male' || genderParam === 'female' ? genderParam : undefined
    );
    const todayParam = String(req.query.today ?? '');
    const today = /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : new Date().toISOString().slice(0, 10);

    const masjidFilter = gender ? { gender } : {};
    const masjidIds = (await Masjid.find(masjidFilter).select('_id').lean()).map((m) => m._id);
    const tracks = await Track.find({ masjid: { $in: masjidIds }, deletedAt: null }).select('title maxStudents').lean();
    const trackIds = tracks.map((t) => t._id);
    const students = await Student.find({ track: { $in: trackIds } }).select('name track').lean();
    const studentIds = students.map((s) => s._id);
    const nameOf = new Map(students.map((s) => [String(s._id), s.name]));

    // 1. Frequent absence (excused sessions don't count either way).
    const att = await Attendance.aggregate<{ _id: Types.ObjectId; total: number; absent: number }>([
      { $match: { student: { $in: studentIds }, status: { $ne: 'مستأذن' } } },
      { $group: { _id: '$student', total: { $sum: 1 }, absent: { $sum: { $cond: [{ $eq: ['$status', 'غائب'] }, 1, 0] } } } },
    ]);
    const absent = att
      .filter((a) => a.total >= ALERT_MIN_SESSIONS && a.absent / a.total > ALERT_ABSENCE_RATE)
      .sort((a, b) => b.absent / b.total - a.absent / a.total)
      .map((a) => ({ name: nameOf.get(String(a._id)) ?? '—', pct: Math.round((a.absent / a.total) * 100) }));

    // 2. Halqas near capacity.
    const perTrack = new Map<string, number>();
    for (const s of students) perTrack.set(String(s.track), (perTrack.get(String(s.track)) ?? 0) + 1);
    const nearCapacity = tracks
      .filter((t) => t.maxStudents > 0 && (perTrack.get(String(t._id)) ?? 0) / t.maxStudents >= ALERT_CAPACITY)
      .map((t) => ({ title: t.title, pct: Math.round(((perTrack.get(String(t._id)) ?? 0) / t.maxStudents) * 100) }));

    // 3. Excellent students this month (present days only).
    const monthStart = new Date(`${today.slice(0, 7)}-01`);
    const dayEnd = new Date(new Date(today).getTime() + 86_400_000);
    const evals = await Evaluation.aggregate<{ _id: Types.ObjectId; days: number; score: number; max: number }>([
      { $match: { student: { $in: studentIds }, date: { $gte: monthStart, $lt: dayEnd }, attendanceStatus: 'حاضر' } },
      { $group: { _id: '$student', days: { $sum: 1 }, score: { $sum: '$total' }, max: { $sum: '$totalMax' } } },
    ]);
    const excellent = evals
      .filter((e) => e.days >= ALERT_EXCELLENT_DAYS && e.max > 0 && e.score / e.max >= ALERT_EXCELLENT_AVG)
      .map((e) => nameOf.get(String(e._id)) ?? '—');

    // 4. Recorded today but the daily report wasn't sent.
    const todayStart = new Date(today);
    const recordedToday = await Evaluation.distinct('track', { track: { $in: trackIds }, date: { $gte: todayStart, $lt: dayEnd } });
    const sent = new Set((await DailyReport.find({ date: today, track: { $in: recordedToday } }).select('track').lean()).map((r) => String(r.track)));
    const titleOf = new Map(tracks.map((t) => [String(t._id), t.title]));
    const reportMissing = recordedToday.filter((t) => !sent.has(String(t))).map((t) => titleOf.get(String(t)) ?? '—');

    // 5. Grades edited after being saved, today.
    const gradeEdits = await EvaluationChange.countDocuments({
      track: { $in: trackIds },
      createdAt: { $gte: todayStart, $lt: dayEnd },
    });

    res.json({ success: true, data: { absent, nearCapacity, excellent, reportMissing, gradeEdits } });
  } catch (err) {
    next(err);
  }
}
