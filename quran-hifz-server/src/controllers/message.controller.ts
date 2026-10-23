import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';
import { Track } from '../models/Track.model';
import { Masjid } from '../models/Masjid.model';
import { AppError } from '../middleware/error';
import { sendPushToUsers } from '../lib/push';
import { notifyParents } from '../lib/notify';
import { contactsFor, linkingStudent } from '../lib/teacherParent';
import { Types } from 'mongoose';

const toParentsSchema = z.object({
  track:    z.string().min(1, 'الحلقة مطلوبة'),
  /** Omitted = every student of the halqa. */
  students: z.array(z.string().min(1)).min(1).optional(),
  body:     z.string().trim().min(1, 'نص الرسالة مطلوب').max(1000, 'الرسالة طويلة جدًا'),
});

/**
 * Teacher → parents of their halqa (one-way). Lands in each parent's per-child
 * «الرسائل» like the absence notices. A teacher may only write to the parents
 * of a halqa they teach; students without a linked parent come back as
 * `unnotified`.
 */
export async function sendToParents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = toParentsSchema.parse(req.body);
    const track = await Track.findOne({ _id: data.track, deletedAt: null }).select('teachers');
    if (!track) throw new AppError('الحلقة غير موجودة', 404);
    if (req.user!.role === 'teacher') {
      const me = await User.findById(req.user!.id).select('profileId');
      if (!me?.profileId || !track.teachers.some((t) => String(t) === String(me.profileId))) {
        throw new AppError('لا يمكنك مراسلة أولياء أمور هذه الحلقة', 403);
      }
    }
    const filter: Record<string, unknown> = { track: track._id };
    if (data.students) filter._id = { $in: data.students };
    const students = await Student.find(filter).select('_id');
    if (students.length === 0) throw new AppError('لا يوجد طلاب في هذه الحلقة', 400);

    const result = await notifyParents(
      students.map((s) => String(s._id)),
      () => data.body,
      { senderId: req.user!.id, senderName: req.user!.name, senderRole: req.user!.role },
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

const noteSchema = z.object({
  body: z.string().trim().min(1, 'نص الملاحظة مطلوب').max(1000, 'الملاحظة طويلة جدًا'),
});

/**
 * Student → supervision note. Recipients are resolved server-side only:
 * every admin, plus every supervisor whose supervisorGender matches the
 * student's masjid gender (Student.track → Track.masjid → Masjid.gender).
 */
export async function sendNoteToSupervisors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = noteSchema.parse(req.body);
    const me = await User.findById(req.user!.id).select('name profileId');
    if (!me?.profileId) throw new AppError('لا يوجد ملف طالب مرتبط بهذا الحساب', 404);
    const student = await Student.findById(me.profileId).select('name track');
    if (!student) throw new AppError('الطالب غير موجود', 404);
    const track = student.track ? await Track.findById(student.track).select('masjid') : null;
    const masjid = track?.masjid ? await Masjid.findById(track.masjid).select('gender') : null;

    const or: Record<string, unknown>[] = [{ role: 'admin' }];
    if (masjid?.gender) or.push({ role: 'supervisor', supervisorGender: masjid.gender });
    const recipients = await User.find({ $or: or }).select('_id');
    if (recipients.length === 0) throw new AppError('لا يوجد مشرفون لاستلام الملاحظة', 404);

    const senderName = student.name || me.name;
    const senderInitials = senderName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || 'ط';
    await Message.insertMany(recipients.map((r) => ({
      sender: req.user!.id,
      recipient: r._id,
      student: student._id,
      senderRole: 'student',
      senderName,
      senderInitials,
      body,
    })));
    await sendPushToUsers(recipients.map((r) => ({ userId: String(r._id), title: senderName, body })));
    res.status(201).json({ success: true, data: { sent: recipients.length } });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const messages = await Message.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Raw docs — both web and mobile clients read _id/senderName/senderInitials/body/createdAt/readAt.
    res.json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    next(err);
  }
}

// ── Teacher ↔ parent conversations ─────────────────────────────────────
// A conversation is simply every message between two users, both ways — no
// separate collection, so the absence notices and «مراسلة أولياء الأمور»
// messages already sit in the right thread.

const replySchema = z.object({
  body: z.string().trim().min(1, 'نص الرسالة مطلوب').max(1000, 'الرسالة طويلة جدًا'),
});

/** The linking student when `me` and `other` are a teacher/parent pair that may talk. */
async function pairLink(me: { id: string; role: string }, otherId: string): Promise<string | null> {
  const other = await User.findById(otherId).select('role').lean();
  if (!other) return null;
  if (me.role === 'teacher' && other.role === 'parent') return linkingStudent(me.id, otherId);
  if (me.role === 'parent' && other.role === 'teacher') return linkingStudent(otherId, me.id);
  return null;
}

export async function getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await contactsFor(req.user!.id, req.user!.role) });
  } catch (err) {
    next(err);
  }
}

/** One row per person I've exchanged messages with, newest first. */
export async function getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const me = new Types.ObjectId(req.user!.id);
    const rows = await Message.aggregate<{
      _id: Types.ObjectId; body: string; createdAt: Date; fromMe: boolean; unread: number;
    }>([
      { $match: { $or: [{ sender: me }, { recipient: me }] } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $cond: [{ $eq: ['$sender', me] }, '$recipient', '$sender'] },
        body: { $first: '$body' },
        createdAt: { $first: '$createdAt' },
        fromMe: { $first: { $eq: ['$sender', me] } },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', me] }, { $not: ['$readAt'] }] }, 1, 0] } },
      } },
      { $sort: { createdAt: -1 } },
      { $limit: 200 },
    ]);
    const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name role').lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const data = await Promise.all(rows.map(async (r) => {
      const u = byId.get(String(r._id));
      return {
        userId: String(r._id),
        name: u?.name ?? '—',
        role: u?.role ?? '',
        last: { body: r.body, createdAt: r.createdAt, fromMe: r.fromMe },
        unread: r.unread,
        canReply: Boolean(await pairLink(req.user!, String(r._id))),
      };
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** The thread with one person, oldest first (latest 200). */
export async function getThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const me = req.user!.id;
    const other = req.params.userId;
    if (!Types.ObjectId.isValid(other)) throw new AppError('المستخدم غير موجود', 404);
    const messages = await Message.find({
      $or: [{ sender: me, recipient: other }, { sender: other, recipient: me }],
    }).sort({ createdAt: -1 }).limit(200).lean();
    const canReply = Boolean(await pairLink(req.user!, other));
    res.json({ success: true, data: { messages: messages.reverse(), canReply } });
  } catch (err) {
    next(err);
  }
}

/** Send in a teacher↔parent thread (also starts a new one). */
export async function sendInThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = replySchema.parse(req.body);
    const other = req.params.userId;
    if (other === req.user!.id) throw new AppError('لا يمكنك مراسلة نفسك', 400);
    if (!Types.ObjectId.isValid(other)) throw new AppError('المستخدم غير موجود', 404);
    const student = await pairLink(req.user!, other);
    if (!student) throw new AppError('لا يمكنك مراسلة هذا المستخدم', 403);
    const name = req.user!.name;
    const message = await Message.create({
      sender: req.user!.id,
      recipient: other,
      student,
      senderRole: req.user!.role,
      senderName: name,
      senderInitials: name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || 'م',
      body,
    });
    await sendPushToUsers([{ userId: other, title: name, body }]);
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

/** Marks everything the other person sent me as read. */
export async function markThreadRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(req.params.userId)) throw new AppError('المستخدم غير موجود', 404);
    const r = await Message.updateMany(
      { sender: req.params.userId, recipient: req.user!.id, readAt: null },
      { readAt: new Date() },
    );
    res.json({ success: true, data: { updated: r.modifiedCount } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!.id },
      { readAt: new Date() },
      { new: true },
    );
    if (!message) throw new AppError('الرسالة غير موجودة', 404);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}
