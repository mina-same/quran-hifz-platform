import { Request } from 'express';
import { Types } from 'mongoose';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';

/** The supervisor's fixed gender assignment, or null for every other role.
 *  Never trust a client-supplied gender/track/masjid param for a supervisor —
 *  this is the one source of truth for their scope. */
export function supervisorGenderOf(req: Request): 'male' | 'female' | null {
  return req.user?.role === 'supervisor' ? (req.user.supervisorGender ?? null) : null;
}

/** Every track id under a masjid of the given gender — the scope boundary a
 *  supervisor's queries are restricted to. */
export async function trackIdsForGender(gender: 'male' | 'female'): Promise<Types.ObjectId[]> {
  const masajid = await Masjid.find({ gender }).select('_id').lean();
  const masjidIds = masajid.map((m) => m._id);
  const tracks = await Track.find({ masjid: { $in: masjidIds } }).select('_id').lean();
  return tracks.map((t) => t._id);
}

/** Intersects an existing `track` filter value (absent / a single id string /
 *  `{$in:[...]}`) with the supervisor's allowed track ids, so a supervisor can
 *  never widen their own scope via a `track`/`student` query param — an id
 *  outside their scope is simply dropped, yielding an empty result rather than
 *  leaking the other gender's data. */
export function restrictTrackFilter(current: unknown, allowedIds: Types.ObjectId[]): { $in: string[] } {
  const allowed = new Set(allowedIds.map(String));
  if (!current) return { $in: [...allowed] };
  const currentIds = typeof current === 'string'
    ? [current]
    : ((current as { $in: unknown[] }).$in ?? []).map(String);
  return { $in: currentIds.filter((id) => allowed.has(id)) };
}
