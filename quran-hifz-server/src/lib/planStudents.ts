import { Types } from 'mongoose';
import { IQuranPlan } from '../models/QuranPlan.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { Student } from '../models/Student.model';

/** Resolves which students are covered by a plan, branching on `targetType`
 * since each target kind stores its student list differently: `students` on
 * the plan itself, `enrolledStudents` on the linked SpecialTrack, or (since
 * Halqa has no student-list field of its own) a reverse lookup on Student. */
export async function getPlanStudentIds(plan: IQuranPlan): Promise<Types.ObjectId[]> {
  if (plan.targetType === 'students') {
    return (plan.students ?? []) as Types.ObjectId[];
  }
  if (plan.targetType === 'specialTrack') {
    const track = await SpecialTrack.findById(plan.specialTrack, 'enrolledStudents');
    return (track?.enrolledStudents ?? []) as unknown as Types.ObjectId[];
  }
  const students = await Student.find({ halqa: plan.halqa }, '_id');
  return students.map((s) => s._id as Types.ObjectId);
}

export async function isStudentInPlan(plan: IQuranPlan, studentId: string): Promise<boolean> {
  const ids = await getPlanStudentIds(plan);
  return ids.some((id) => id.toString() === studentId);
}
