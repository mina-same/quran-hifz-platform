import { Types } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import { Masjid, type MasjidGender } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';
import { Evaluation } from '../models/Evaluation.model';
import { supervisorGenderOf } from '../lib/supervisorScope';
import { computeSection, periodStart, rankOf, type Period, type Section } from '../lib/rankings';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A halqa/teacher needs this many present evaluations in the period to be ranked. */
const MIN_EVALS = 10;

function parsePeriod(req: Request): { period: Period; from: string | null; to: string } {
  const p = String(req.query.period ?? 'month');
  const period: Period = (['week', 'month', 'lastMonth', 'all', 'custom'] as const).find((x) => x === p) ?? 'month';
  const t = String(req.query.today ?? '');
  const today = DATE_RE.test(t) ? t : new Date().toISOString().slice(0, 10);
  if (period === 'custom') {
    const f = String(req.query.from ?? '');
    const e = String(req.query.to ?? '');
    if (!DATE_RE.test(f) || !DATE_RE.test(e) || f > e) throw new AppError('حدّد بداية ونهاية الفترة بشكل صحيح', 400);
    return { period, from: f, to: e };
  }
  if (period === 'lastMonth') {
    // the whole previous calendar month
    const end = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
    end.setUTCDate(0);
    return { period, from: periodStart(period, today), to: end.toISOString().slice(0, 10) };
  }
  return { period, from: periodStart(period, today), to: today };
}

type Scope = Awaited<ReturnType<typeof loadScope>>;

/**
 * Everything the leaderboards need for [from, to], loaded once (archived
 * halqas excluded). Evaluations are summed in the database per
 * student/halqa/status, so only a few hundred rows cross the wire.
 */
async function loadScope(gender: MasjidGender | null, from: string | null, to: string, masjid?: string, track?: string) {
  const masjidFilter: Record<string, unknown> = gender ? { gender } : {};
  if (masjid && Types.ObjectId.isValid(masjid)) masjidFilter._id = masjid;
  const masajid = await Masjid.find(masjidFilter).select('gender').lean();
  const trackFilter: Record<string, unknown> = { masjid: { $in: masajid.map((m) => m._id) }, deletedAt: null };
  if (track && Types.ObjectId.isValid(track)) trackFilter._id = track;
  const tracks = await Track.find(trackFilter).select('title teachers masjid').lean();
  const trackIds = tracks.map((t) => t._id);
  const end = new Date(new Date(to).getTime() + 86_400_000);
  const [students, teachers, evals] = await Promise.all([
    Student.find({ track: { $in: trackIds } }).select('name track').lean(),
    Teacher.find({ _id: { $in: tracks.flatMap((t) => t.teachers) } }).select('name').lean(),
    Evaluation.aggregate<{ _id: { student: unknown; track: unknown; status: string }; total: number; totalMax: number; count: number }>([
      { $match: { track: { $in: trackIds }, date: from ? { $gte: new Date(from), $lt: end } : { $lt: end } } },
      {
        $group: {
          _id: { student: '$student', track: '$track', status: '$attendanceStatus' },
          total: { $sum: { $ifNull: ['$total', 0] } },
          totalMax: { $sum: { $ifNull: ['$totalMax', 10] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  const genderOf = new Map(masajid.map((m) => [String(m._id), m.gender]));
  return {
    tracks: tracks.map((t) => ({
      id: String(t._id), title: t.title, teacherIds: t.teachers.map(String), gender: genderOf.get(String(t.masjid)),
    })),
    teachers: teachers.map((t) => ({ id: String(t._id), name: t.name })),
    students: students.map((s) => ({ id: String(s._id), name: s.name, trackId: String(s.track) })),
    evals: evals.map((e) => ({
      student: String(e._id.student), track: String(e._id.track), attendanceStatus: e._id.status,
      total: e.total, totalMax: e.totalMax, count: e.count,
    })),
  };
}

/** One section's leaderboards out of a loaded scope; `gender` null = both («الكل»). */
function sectionOf(scope: Scope, gender: MasjidGender | null): Section {
  const tracks = gender ? scope.tracks.filter((t) => t.gender === gender) : scope.tracks;
  const ids = new Set(tracks.map((t) => t.id));
  const teacherIds = new Set(tracks.flatMap((t) => t.teacherIds));
  return computeSection({
    tracks,
    teachers: scope.teachers.filter((t) => teacherIds.has(t.id)),
    students: scope.students.filter((s) => ids.has(s.trackId)),
    evals: scope.evals.filter((e) => ids.has(e.track)),
    minEvals: MIN_EVALS,
  });
}

/** GET /rankings?period=…&masjid=&track=&withAll=1 — admin: both sections (+ «الكل»); supervisor: their own. */
export async function getRankings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period, from, to } = parsePeriod(req);
    const masjid = typeof req.query.masjid === 'string' ? req.query.masjid : undefined;
    const track = typeof req.query.track === 'string' ? req.query.track : undefined;
    const own = supervisorGenderOf(req);
    const scope = await loadScope(own ?? null, from, to, masjid, track);
    const genders: MasjidGender[] = own ? [own] : ['male', 'female'];
    const sections: Record<string, Section> = Object.fromEntries(genders.map((g) => [g, sectionOf(scope, g)]));
    // «الكل» — both sections in one report (admin only; asked for on demand).
    if (!own && req.query.withAll === '1') sections.all = sectionOf(scope, null);
    res.json({ success: true, data: { period, from, to, sections } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rankings/me — the student's «لوحة الشرف»: their points and rank in their
 * halqa and in their whole section (boys or girls), plus each top 10. Only
 * names, halqa titles and points are exposed.
 */
export async function getMyRanking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period, from, to } = parsePeriod(req);
    const me = await User.findById(req.user!.id).select('profileId').lean();
    const student = me?.profileId ? await Student.findById(me.profileId).select('track').lean() : null;
    if (!student) throw new AppError('لا يوجد ملف طالب مرتبط بهذا الحساب', 404);
    const track = await Track.findById(student.track).select('title masjid').lean();
    const masjid = track ? await Masjid.findById(track.masjid).select('gender').lean() : null;
    if (!track || !masjid) throw new AppError('لست مسجلاً في حلقة حالياً', 404);

    const section = sectionOf(await loadScope(masjid.gender, from, to), masjid.gender);
    const myId = String(student._id);
    const mine = section.students.find((s) => s.id === myId);
    const inTrack = section.students.filter((s) => s.trackId === String(track._id));
    const row = (s: Section['students'][number], all: Section['students']) => ({
      name: s.name, trackTitle: s.trackTitle, points: s.points,
      rank: rankOf(all.map((x) => x.points), s.points), me: s.id === myId,
    });
    res.json({
      success: true,
      data: {
        period, from, to,
        me: {
          points: mine?.points ?? 0,
          avg10: mine?.avg10 ?? 0,
          days: mine?.days ?? 0,
          rankInTrack: rankOf(inTrack.map((s) => s.points), mine?.points ?? 0),
          trackSize: inTrack.length,
          rankInSection: rankOf(section.students.map((s) => s.points), mine?.points ?? 0),
          sectionSize: section.students.length,
          trackTitle: track.title,
        },
        track: inTrack.slice(0, 10).map((s) => row(s, inTrack)),
        section: section.students.slice(0, 10).map((s) => row(s, section.students)),
      },
    });
  } catch (err) {
    next(err);
  }
}
