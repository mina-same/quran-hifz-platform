/**
 * Additive, idempotent: create one parent account per student and link it.
 *
 * For every `student` User, a `parent` User is created whose email is the
 * student's email with a `p.` prefix (student `ali@tahfeez.com` → parent
 * `p.ali@tahfeez.com`), password `parent@123`, name "ولي أمر <student name>".
 * The parent is then linked to the student's profile via a ParentStudent doc.
 *
 * Re-runnable: existing parent accounts/links are reused, never duplicated.
 * Never deletes anything.
 *
 * Run:  npm run create-parent-accounts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';
import { ParentStudent } from '../models/ParentStudent.model';

const PARENT_PASSWORD = 'parent@123';

/** Student email → parent email by prefixing the local part with `p.`. */
function parentEmailFor(studentEmail: string): string {
  const [local, domain] = studentEmail.split('@');
  return `p.${local}@${domain}`;
}

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const students = await User.find({ role: 'student' })
    .select('name email profileId')
    .sort({ email: 1 });

  let createdParents = 0;
  let reusedParents = 0;
  let createdLinks = 0;
  const skipped: string[] = [];

  for (const s of students) {
    if (!s.profileId) {
      skipped.push(`${s.name} (${s.email}) — لا يوجد profileId (طالب بلا ملف)`);
      continue;
    }
    const email = parentEmailFor(s.email);
    const name = `ولي أمر ${s.name}`;

    let parent = await User.findOne({ email });
    if (parent) {
      reusedParents++;
    } else {
      parent = await User.create({ name, email, password: PARENT_PASSWORD, role: 'parent' });
      createdParents++;
      console.log(`  + ${name}  →  ${email}`);
    }

    const link = await ParentStudent.findOneAndUpdate(
      { parent: parent._id, student: s.profileId },
      { parent: parent._id, student: s.profileId },
      { upsert: true, new: true, rawResult: true },
    );
    // rawResult exposes whether the upsert inserted a new doc.
    if ((link as unknown as { lastErrorObject?: { updatedExisting?: boolean } }).lastErrorObject?.updatedExisting === false) {
      createdLinks++;
    }
  }

  console.log(
    `\n👪  Parents: ${createdParents} created, ${reusedParents} already existed` +
    `  |  Links: ${createdLinks} new  |  Students: ${students.length}`,
  );
  if (skipped.length) {
    console.warn(`⚠️   ${skipped.length} student(s) skipped:`);
    skipped.forEach((n) => console.warn(`   - ${n}`));
  }

  await mongoose.disconnect();
  console.log('✅  Done — database disconnected');
}

run().catch((e) => { console.error(e); process.exit(1); });
