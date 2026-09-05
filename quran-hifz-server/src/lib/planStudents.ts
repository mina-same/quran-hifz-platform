import { Types } from 'mongoose';
import { IQuranPlan } from '../models/QuranPlan.model';
import { Student } from '../models/Student.model';

/** Resolves which students are covered by a plan, branching on `targetType`:
 * an explicit list on the plan itself, or every student whose `track` field
 * points at the plan's target track. */
export async function getPlanStudentIds(plan: IQuranPlan): Promise<Types.ObjectId[]> {
  if (plan.targetType === 'students') {
    return (plan.students ?? []) as Types.ObjectId[];
  }
  // Without a track, `Student.find({ track: undefined })` would match every
  // student (Mongoose drops the undefined key, casting the filter to `{}`).
  // A `targetType: 'track'` plan with no `track` set covers no one.
  if (!plan.track) return [];
  const students = await Student.find({ track: plan.track }, '_id');
  return students.map((s) => s._id as Types.ObjectId);
}

export async function isStudentInPlan(plan: IQuranPlan, studentId: string): Promise<boolean> {
  const ids = await getPlanStudentIds(plan);
  return ids.some((id) => id.toString() === studentId);
}
