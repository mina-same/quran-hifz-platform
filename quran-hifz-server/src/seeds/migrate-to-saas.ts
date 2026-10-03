/**
 * One-off: adopt a pre-SaaS (single-organisation) database into the
 * multi-tenant model.
 *
 *   npx ts-node src/seeds/migrate-to-saas.ts <slug> "<organisation name>" <owner-email> <owner-phone>
 *
 * - creates the Tenant (status 'active', so the existing organisation is not
 *   put on a trial)
 * - stamps `tenant` on every document that has none, in every tenant-owned
 *   collection
 * - drops the old platform-wide unique indexes (users.email_1,
 *   students.nationalId_1) — the tenant-scoped replacements are built by
 *   Mongoose on next start
 *
 * Idempotent: re-running only touches documents still missing a tenant.
 * Run it against a COPY of the data first.
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { Tenant } from '../models/Tenant.model';
import '../models/Attendance.model';
import '../models/Evaluation.model';
import '../models/GroupHomework.model';
import '../models/HifzEntry.model';
import '../models/Homework.model';
import '../models/IndividualPlan.model';
import '../models/KPI.model';
import '../models/LessonRecording.model';
import '../models/Masjid.model';
import '../models/Message.model';
import '../models/OpenWardEntry.model';
import '../models/ParentStudent.model';
import '../models/QuranPlan.model';
import '../models/Student.model';
import '../models/StudentPlanProgress.model';
import '../models/Teacher.model';
import '../models/Track.model';
import '../models/User.model';

async function main(): Promise<void> {
  const [slug, name, email, phone] = process.argv.slice(2);
  if (!slug || !name || !email || !phone) {
    console.error('usage: migrate-to-saas.ts <slug> "<organisation name>" <owner-email> <owner-phone>');
    process.exit(1);
  }

  await mongoose.connect(ENV.MONGO_URI);

  const tenant =
    (await Tenant.findOne({ slug })) ??
    (await Tenant.create({
      name, slug, email, phone,
      orgType: 'association',
      ownerName: name,
      country: 'السعودية',
      status: 'active',
      trialEndsAt: new Date(),
    }));
  console.log(`tenant ${tenant.slug} → ${tenant._id}`);

  for (const modelName of mongoose.modelNames()) {
    if (modelName === 'Tenant') continue;
    const coll = mongoose.model(modelName).collection;
    const r = await coll.updateMany({ tenant: { $exists: false } }, { $set: { tenant: tenant._id } });
    console.log(`${coll.collectionName.padEnd(24)} stamped ${r.modifiedCount}`);
  }

  for (const [modelName, index] of [['User', 'email_1'], ['Student', 'nationalId_1']] as const) {
    const coll = mongoose.model(modelName).collection;
    try {
      await coll.dropIndex(index);
      console.log(`dropped ${coll.collectionName}.${index}`);
    } catch {
      console.log(`${coll.collectionName}.${index} not present`);
    }
  }

  await mongoose.syncIndexes();
  console.log('indexes synced');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
