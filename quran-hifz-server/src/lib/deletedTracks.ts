import { Types } from 'mongoose';
import { Track } from '../models/Track.model';

/** Ids of archived (soft-deleted, `deletedAt` set) tracks. Their history is
 *  kept so old records still resolve, but nothing built from it — plan lists,
 *  homework, stats — may show them any more. */
export async function deletedTrackIds(): Promise<Types.ObjectId[]> {
  return (await Track.find({ deletedAt: { $ne: null } }).select('_id').lean()).map((t) => t._id as Types.ObjectId);
}
