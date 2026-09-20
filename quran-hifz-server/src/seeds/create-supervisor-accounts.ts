/**
 * Additive, idempotent: create the two standing supervisor accounts (one
 * scoped to بنين masajid, one to بنات masajid). Re-running reuses an existing
 * account by email rather than duplicating it, and never deletes anything.
 *
 * Run:  npm run create-supervisor-accounts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';

const SUPERVISOR_PASSWORD = 'supervisor@123';

const SUPERVISORS: { name: string; email: string; gender: 'male' | 'female' }[] = [
  { name: 'مشرف البنين', email: 'supervisor.boys@tahfeez.com', gender: 'male' },
  { name: 'مشرفة البنات', email: 'supervisor.girls@tahfeez.com', gender: 'female' },
];

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  for (const s of SUPERVISORS) {
    const existing = await User.findOne({ email: s.email });
    if (existing) {
      console.log(`  = ${s.name}  →  ${s.email}  (already exists)`);
      continue;
    }
    await User.create({
      name: s.name, email: s.email, password: SUPERVISOR_PASSWORD,
      role: 'supervisor', supervisorGender: s.gender,
    });
    console.log(`  + ${s.name}  →  ${s.email}  (${s.gender})`);
  }

  await mongoose.disconnect();
  console.log('✅  Done — database disconnected');
}

run().catch((e) => { console.error(e); process.exit(1); });
