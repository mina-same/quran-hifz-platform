import { Types } from 'mongoose';
import { Student } from '../models/Student.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { Message } from '../models/Message.model';

export type NotifySenderCtx = { senderId: string; senderName: string; senderRole: string };

/**
 * Builds one Message per student (skipping students with no linked parent
 * account) and inserts them in bulk. Shared by attendance's absent-parent
 * notification and evaluation's score notification — students without a
 * ParentStudent link are reported back as `unnotified` rather than thrown,
 * so the caller's save always succeeds regardless of missing parent links.
 */
export async function notifyParents(
  studentIds: string[],
  bodyFor: (studentName: string, studentId: string) => string,
  ctx: NotifySenderCtx,
): Promise<{ notified: number; unnotified: { id: string; name: string }[] }> {
  if (studentIds.length === 0) return { notified: 0, unnotified: [] };

  const [students, links] = await Promise.all([
    Student.find({ _id: { $in: studentIds } }).select('name'),
    ParentStudent.find({ student: { $in: studentIds } }),
  ]);
  const nameById = new Map(students.map((s) => [String(s._id), s.name]));
  const parentByStudent = new Map(links.map((l) => [String(l.student), String(l.parent)]));
  const initials = ctx.senderName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || 'م';

  const unnotified: { id: string; name: string }[] = [];
  const messages = studentIds.flatMap((id) => {
    const parentId = parentByStudent.get(id);
    const name = nameById.get(id) ?? id;
    if (!parentId) {
      unnotified.push({ id, name });
      return [];
    }
    return [{
      sender: new Types.ObjectId(ctx.senderId),
      recipient: new Types.ObjectId(parentId),
      student: new Types.ObjectId(id),
      senderRole: ctx.senderRole,
      senderName: ctx.senderName,
      senderInitials: initials,
      body: bodyFor(name, id),
    }];
  });

  if (messages.length) await Message.insertMany(messages);
  return { notified: messages.length, unnotified };
}
