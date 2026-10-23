import { Types } from 'mongoose';
import { User } from '../models/User.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { ParentStudent } from '../models/ParentStudent.model';

/** Live (non-archived) track ids a teacher user teaches. */
async function teacherTrackIds(teacherUserId: string): Promise<Types.ObjectId[]> {
  const me = await User.findById(teacherUserId).select('role profileId').lean();
  if (me?.role !== 'teacher' || !me.profileId) return [];
  return (await Track.find({ teachers: me.profileId, deletedAt: null }).select('_id').lean())
    .map((t) => t._id as Types.ObjectId);
}

/**
 * The student that links a teacher and a parent — a child of the parent who
 * sits in one of the teacher's live halqas — or null when they aren't linked.
 * Teacher↔parent conversations are only allowed while such a child exists.
 */
export async function linkingStudent(teacherUserId: string, parentUserId: string): Promise<string | null> {
  const trackIds = await teacherTrackIds(teacherUserId);
  if (!trackIds.length) return null;
  const childIds = (await ParentStudent.find({ parent: parentUserId }).select('student').lean()).map((l) => l.student);
  if (!childIds.length) return null;
  const child = await Student.findOne({ _id: { $in: childIds }, track: { $in: trackIds } }).select('_id').lean();
  return child ? String(child._id) : null;
}

export type Contact = { userId: string; name: string; role: 'teacher' | 'parent'; subtitle: string };

/** Teacher → parents of their students; parent → teachers of their children. */
export async function contactsFor(userId: string, role: string): Promise<Contact[]> {
  if (role === 'teacher') {
    const trackIds = await teacherTrackIds(userId);
    const students = await Student.find({ track: { $in: trackIds } }).select('name').lean();
    const links = await ParentStudent.find({ student: { $in: students.map((s) => s._id) } }).lean();
    const parents = await User.find({ _id: { $in: links.map((l) => l.parent) } }).select('name').lean();
    const studentName = new Map(students.map((s) => [String(s._id), s.name]));
    const children = new Map<string, string[]>();
    for (const l of links) {
      const k = String(l.parent);
      children.set(k, [...(children.get(k) ?? []), studentName.get(String(l.student)) ?? '']);
    }
    return parents.map((p) => ({
      userId: String(p._id), name: p.name, role: 'parent' as const,
      subtitle: `ولي أمر ${(children.get(String(p._id)) ?? []).filter(Boolean).join('، ')}`,
    }));
  }
  if (role === 'parent') {
    const childIds = (await ParentStudent.find({ parent: userId }).lean()).map((l) => l.student);
    const kids = await Student.find({ _id: { $in: childIds } }).select('name track').lean();
    const tracks = await Track.find({ _id: { $in: kids.map((k) => k.track) }, deletedAt: null })
      .select('title teachers').lean();
    const teacherProfileIds = tracks.flatMap((t) => t.teachers);
    const users = await User.find({ role: 'teacher', profileId: { $in: teacherProfileIds } }).select('name profileId').lean();
    return users.map((u) => {
      const t = tracks.find((tr) => tr.teachers.some((id) => String(id) === String(u.profileId)));
      return { userId: String(u._id), name: u.name, role: 'teacher' as const, subtitle: t ? `معلم ${t.title}` : 'معلم' };
    });
  }
  return [];
}
