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
  const period: Period = p === 'week' || p === 'all' ? p : 'month';
  const t = String(req.query.today ?? '');
  const to = DATE_RE.test(t) ? t : new Date().toISOString().slice(0, 10);
  return { period, from: periodStart(period, to), to };
}

/** One gender section's leaderboards for [from, to] (archived halqas excluded). */
async function loadSection(gender: MasjidGender, from: string | null, to: string): Promise<Section> {
  const masjidIds = (await Masjid.find({ gender }).select('_id').lean()).map((m) => m._id);
  const tracks = await Track.find({ masjid: { $in: masjidIds }, deletedAt: null }).select('title teachers').lean();
  const trackIds = tracks.map((t) => t._id);
  const end = new Date(new Date(to).getTime() + 86_400_000);
  const [students, teachers, evals] = await Promise.all([
    Student.find({ track: { $in: trackIds } }).select('name track').lean(),
    Teacher.find({ _id: { $in: tracks.flatMap((t) => t.teachers) } }).select('name').lean(),
    Evaluation.find({
      track: { $in: trackIds },
      date: from ? { $gte: new Date(from), $lt: end } : { $lt: end },
    }).select('student track total totalMax attendanceStatus').lean(),
  ]);
  return computeSection({
    tracks: tracks.map((t) => ({ id: String(t._id), title: t.title, teacherIds: t.teachers.map(String) })),
    teachers: teachers.map((t) => ({ id: String(t._id), name: t.name })),
    students: students.map((s) => ({ id: String(s._id), name: s.name, trackId: String(s.track) })),
    evals: evals.map((e) => ({
      student: String(e.student), track: String(e.track),
      total: e.total ?? 0, totalMax: e.totalMax ?? 10, attendanceStatus: e.attendanceStatus,
    })),
    minEvals: MIN_EVALS,
  });
}

/** GET /rankings?period=week|month|all&today= — admin: both sections; supervisor: their own. */
export async function getRankings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period, from, to } = parsePeriod(req);
    const own = supervisorGenderOf(req);
    const genders: MasjidGender[] = own ? [own] : ['male', 'female'];
    const sections = Object.fromEntries(
      await Promise.all(genders.map(async (g) => [g, await loadSection(g, from, to)] as const)),
    );
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

    const section = await loadSection(masjid.gender, from, to);
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
