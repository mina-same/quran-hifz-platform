/**
 * Additive-only migration — gives pre-rubric Evaluation documents the
 * `criteria` / `totalMax` shape introduced when the grading split moved from a
 * platform-wide constant onto each QuranPlan (`gradeRubric`).
 *
 * Old records carry the fixed `scores.{attendance,hifz,tajweed,talawah}` and no
 * `criteria`. Those two fields are now required, so an untouched old record
 * would fail validation the next time it is saved. This backfills them from the
 * legacy scores using the historical 3/4/2/1 split, leaving `scores` in place.
 * Never deletes or rescales anything.
 *
 * Run:  npm run backfill-evaluation-rubric
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { Evaluation } from '../models/Evaluation.model';
import { DEFAULT_GRADE_RUBRIC } from '../models/QuranPlan.model';

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected');

  const stale = await Evaluation.find({
    $or: [{ criteria: { $exists: false } }, { criteria: { $size: 0 } }],
  }).lean();

  console.log(`🔎  ${stale.length} evaluation(s) without a rubric snapshot`);
  if (stale.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const totalMax = DEFAULT_GRADE_RUBRIC.reduce((a, c) => a + c.max, 0);
  let migrated = 0;

  for (const doc of stale) {
    const legacy = (doc.scores ?? {}) as Record<string, number | undefined>;
    const criteria = DEFAULT_GRADE_RUBRIC.map((c) => ({
      key: c.key,
      label: c.label,
      max: c.max,
      // Clamp defensively: a legacy value above the historical max would break
      // the new min/max bounds on the criteria sub-schema.
      value: Math.min(Math.max(legacy[c.key] ?? 0, 0), c.max),
    }));
    const total = criteria.reduce((a, c) => a + c.value, 0);

    await Evaluation.updateOne({ _id: doc._id }, { $set: { criteria, totalMax, total } });
    migrated++;
  }

  console.log(`🎉  Backfilled ${migrated} evaluation(s) at ${totalMax} total degrees`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Backfill failed:', err);
  process.exit(1);
});
