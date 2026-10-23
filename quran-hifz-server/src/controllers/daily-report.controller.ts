import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { DailyReport } from '../models/DailyReport.model';
import { Track } from '../models/Track.model';
import { Masjid } from '../models/Masjid.model';
import { Student } from '../models/Student.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';
import { Attendance } from '../models/Attendance.model';
import { Evaluation } from '../models/Evaluation.model';
import { supervisorGenderOf, trackIdsForGender } from '../lib/supervisorScope';
import { draftLines, reportChanges, type ReportChanges, type ReportLists } from '../lib/dailyReportDiff';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Evaluations/attendance store the day as `new Date('YYYY-MM-DD')` (UTC midnight). */
function dayRange(date: string): { $gte: Date; $lt: Date } {
  const start = new Date(date);
  return { $gte: start, $lt: new Date(start.getTime() + 86_400_000) };
}

/** Students whose attendance/evaluation for the day changed after `since`. */
function editedSince(since: Date, records: { student: unknown; updatedAt?: Date }[]): Set<string> {
  return new Set(records.filter((r) => r.updatedAt && r.updatedAt > since).map((r) => String(r.student)));
}

/** How a sent report differs from the day's records edited after sending. */
function changesSince(
  saved: ReportLists & { updatedAt?: Date },
  current: ReportLists,
  records: { student: unknown; updatedAt?: Date }[],
): ReportChanges | null {
  return saved.updatedAt ? reportChanges(saved, current, editedSince(saved.updatedAt, records)) : null;
}

/** Tracks the caller may read: admin = all, supervisor = their gender's
 *  masajid, teacher = tracks they teach. `null` means "no restriction". */
async function readableTrackIds(req: Request): Promise<Types.ObjectId[] | null> {
  const role = req.user!.role;
  if (role === 'admin') return null;
  const gender = supervisorGenderOf(req);
  if (gender) return trackIdsForGender(gender);
  if (role === 'teacher') {
    const me = await User.findById(req.user!.id).select('profileId');
    if (!me?.profileId) return [];
    return (await Track.find({ teachers: me.profileId, deletedAt: null }).select('_id').lean()).map((t) => t._id as Types.ObjectId);
  }
  return [];
}

/** Teachers may only write reports for tracks they teach; admin for any. */
async function assertCanWrite(req: Request, trackId: string): Promise<void> {
  if (req.user!.role === 'admin') return;
  const allowed = await readableTrackIds(req);
  if (!allowed || !allowed.some((id) => String(id) === trackId)) {
    throw new AppError('لا يمكنك إرسال تقرير لهذه الحلقة', 403);
  }
}

/**
 * GET /daily-reports/draft?track=&date= — the day's report pre-filled from
 * what the teacher already recorded: absent/excused from attendance (reason =
 * the evaluation note) and «متعثر» for any present student who scored zero
 * in the حفظ or مراجعة criterion. Returns the saved report instead if one exists.
 */
export async function getDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const track = String(req.query.track ?? '');
    const date = String(req.query.date ?? '');
    if (!Types.ObjectId.isValid(track) || !DATE_RE.test(date)) throw new AppError('حدد الحلقة والتاريخ', 400);
    await assertCanWrite(req, track);

    const saved = await DailyReport.findOne({ track, date }).lean();
    const [trackDoc, students, attendance, evaluations] = await Promise.all([
      Track.findById(track).select('title masjid').lean(),
      Student.find({ track }).select('name').sort({ name: 1 }).lean(),
      Attendance.find({ track, date: dayRange(date) }).lean(),
      Evaluation.find({ track, date: dayRange(date) }).lean(),
    ]);
    if (!trackDoc) throw new AppError('الحلقة غير موجودة', 404);
    const masjid = await Masjid.findById(trackDoc.masjid).select('name').lean();

    const nameOf = new Map(students.map((s) => [String(s._id), s.name]));
    const current = draftLines(nameOf, attendance, evaluations);

    res.json({
      success: true,
      recorded: attendance.length + evaluations.length > 0,
      // `changes`: what the records say now vs. what was sent (edits after sending).
      saved: saved ? { ...saved, changes: changesSince(saved, current, [...attendance, ...evaluations]) } : null,
      draft: {
        track, date,
        trackTitle: trackDoc.title,
        masjidName: masjid?.name ?? '',
        ...current,
        totalCount: students.length,
      },
      students: students.map((s) => ({ _id: s._id, name: s.name })),
    });
  } catch (err) {
    next(err);
  }
}

const lineSchema = z.object({
  student: z.string().refine((v) => Types.ObjectId.isValid(v), 'طالب غير صالح'),
  name: z.string().trim().min(1).max(120),
  area: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

const sendSchema = z.object({
  track: z.string().refine((v) => Types.ObjectId.isValid(v), 'حلقة غير صالحة'),
  date: z.string().regex(DATE_RE, 'تاريخ غير صالح'),
  struggling: z.array(lineSchema.extend({ area: z.string().trim().min(1, 'حدد مجال التعثر').max(120) })).max(200),
  absent: z.array(lineSchema).max(200),
  excused: z.array(lineSchema).max(200),
  presentCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  notes: z.string().trim().max(1000).optional(),
});

/** POST /daily-reports — send (or re-send) the day's report. */
export async function sendReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = sendSchema.parse(req.body);
    // One day of slack: the teacher's local date (KSA/Egypt, ahead of UTC)
    // can already be "tomorrow" while the server's UTC date is still today.
    const latest = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (data.date > latest) throw new AppError('لا يمكن إرسال تقرير ليوم في المستقبل', 400);
    await assertCanWrite(req, data.track);

    // The track→masjid and user→teacher lookup chains are independent.
    const [trackInfo, teacherName] = await Promise.all([
      (async () => {
        const t = await Track.findById(data.track).select('title masjid').lean();
        const m = t ? await Masjid.findById(t.masjid).select('name').lean() : null;
        return { trackDoc: t, masjid: m };
      })(),
      (async () => {
        if (req.user!.role !== 'teacher') return req.user!.name;
        const me = await User.findById(req.user!.id).select('profileId name');
        const t = me?.profileId ? await Teacher.findById(me.profileId).select('name').lean() : null;
        return t?.name ?? me?.name ?? req.user!.name;
      })(),
    ]);
    const { trackDoc, masjid } = trackInfo;
    if (!trackDoc) throw new AppError('الحلقة غير موجودة', 404);

    const report = await DailyReport.findOneAndUpdate(
      { track: data.track, date: data.date },
      {
        $set: {
          ...data,
          masjid: trackDoc.masjid,
          trackTitle: trackDoc.title,
          masjidName: masjid?.name ?? '',
          teacherName,
          sentBy: req.user!.id,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

/** GET /daily-reports?date=|from=&to=&track= — reports the caller may read. */
export async function listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, from, to, track } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};
    if (date && DATE_RE.test(date)) filter.date = date;
    else if ((from && DATE_RE.test(from)) || (to && DATE_RE.test(to))) {
      filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    }

    const allowed = await readableTrackIds(req);
    const allowedSet = allowed ? new Set(allowed.map(String)) : null;
    if (track) {
      if (allowedSet && !allowedSet.has(track)) { res.json({ success: true, count: 0, data: [] }); return; }
      filter.track = track;
    } else if (allowed) {
      filter.track = { $in: allowed };
    }

    const reports = await DailyReport.find(filter).sort({ date: -1, masjidName: 1, trackTitle: 1 }).limit(500).lean();
    // For one day (the supervisor/admin page) flag reports whose attendance or
    // evaluations were edited after sending, with what changed.
    if (date && DATE_RE.test(date) && reports.length) {
      const trackIds = reports.map((r) => r.track);
      const [students, attendance, evaluations] = await Promise.all([
        Student.find({ track: { $in: trackIds } }).select('name track').lean(),
        Attendance.find({ track: { $in: trackIds }, date: dayRange(date) }).lean(),
        Evaluation.find({ track: { $in: trackIds }, date: dayRange(date) }).lean(),
      ]);
      const data = reports.map((r) => {
        const t = String(r.track);
        const nameOf = new Map(students.filter((s) => String(s.track) === t).map((s) => [String(s._id), s.name]));
        const att = attendance.filter((a) => String(a.track) === t);
        const evs = evaluations.filter((e) => String(e.track) === t);
        return { ...r, changes: changesSince(r, draftLines(nameOf, att, evs), [...att, ...evs]) };
      });
      res.json({ success: true, count: data.length, data });
      return;
    }
    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
}
