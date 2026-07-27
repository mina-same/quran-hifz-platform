import { Types } from 'mongoose';
import { IQuranPlan } from '../models/QuranPlan.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';

/** Resolves which students are covered by a plan, branching on `targetType`
 * since each target kind stores its student list differently: `students` on
 * the plan itself, a track's roster on `targetType: 'specialTrack'` (see
 * below), or (since Halqa has no student-list field of its own) a reverse
 * lookup on Student for `targetType: 'halqa'`. */
export async function getPlanStudentIds(plan: IQuranPlan): Promise<Types.ObjectId[]> {
  if (plan.targetType === 'students') {
    return (plan.students ?? []) as Types.ObjectId[];
  }
  if (plan.targetType === 'specialTrack') {
    // A track's roster is the union of two enrollment paths: `enrolledStudents`
    // (direct enrollment, for tracks with no halqa layer) and every student
    // whose halqa links back to this track (the real-data import's convention
    // — see import-real-halaqat.ts — where `enrolledStudents` is deliberately
    // left empty and the actual roster lives on the halaqat instead). Matches
    // TeacherTrackDetail.tsx's own roster derivation client-side.
    const track = await SpecialTrack.findById(plan.specialTrack, 'enrolledStudents');
    const directIds = (track?.enrolledStudents ?? []) as unknown as Types.ObjectId[];
    const halqasInTrack = await Halqa.find({ specialTrack: plan.specialTrack }, '_id');
    const halqaStudents = await Student.find({ halqa: { $in: halqasInTrack.map((h) => h._id) } }, '_id');
    const seen = new Set<string>();
    const ids: Types.ObjectId[] = [];
    for (const id of [...directIds, ...halqaStudents.map((s) => s._id as Types.ObjectId)]) {
      const key = id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      ids.push(id);
    }
    return ids;
  }
  const students = await Student.find({ halqa: plan.halqa }, '_id');
  return students.map((s) => s._id as Types.ObjectId);
}

export async function isStudentInPlan(plan: IQuranPlan, studentId: string): Promise<boolean> {
  const ids = await getPlanStudentIds(plan);
  return ids.some((id) => id.toString() === studentId);
}
