import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { Student } from '../models/Student.model';
import { Track } from '../models/Track.model';
import { Masjid } from '../models/Masjid.model';
import { AppError } from '../middleware/error';
import { sendPushToUsers } from '../lib/push';

const messageSchema = z.object({
  recipient:      z.string().min(1, 'المستلم مطلوب'),
  senderName:     z.string().min(1),
  senderInitials: z.string().min(1),
  senderRole:     z.string().min(1),
  body:           z.string().min(1, 'نص الرسالة مطلوب'),
});

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

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = messageSchema.parse(req.body);
    const message = await Message.create({ ...data, sender: req.user!.id });
    await sendPushToUsers([{ userId: data.recipient, title: data.senderName, body: data.body }]);
    res.status(201).json({ success: true, data: message });
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
