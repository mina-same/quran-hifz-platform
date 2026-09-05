/**
 * One-time import of real track/teacher/student data.
 * Run:  npm run import-real-data
 *
 * Expects an EMPTY database — this script only inserts, it does not
 * upsert or wipe first. Re-running it against a non-empty database
 * will duplicate everything.
 */
import fs from 'fs';
import mongoose, { Schema } from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';

const DATA_PATH = '/Volumes/Data/work/quran hifz platform/all_6_halaqat_complete_data.json';

// Only 2 courses in this dataset — hardcoding their masjid/gender beats
// fragile regex-parsing of the Arabic track name for a one-off script.
const COURSE_MASJID: Record<string, { name: string; gender: 'male' | 'female' }> = {
  'rawad-itqan-boys':   { name: 'الأمير متعب بن عبد العزيز', gender: 'male' },
  'raidat-itqan-girls': { name: 'مركز العماير', gender: 'female' },
};

const EMAIL_DOMAIN = 'tahfeez.com';
const ROLE_PASSWORD: Record<'teacher' | 'student', string> = {
  teacher: 'teacher@123',
  student: 'student@123',
};

// Source dataset has no admin account — seed one so the imported DB is usable.
const ADMIN_ACCOUNT = {
  name:     'مدير النظام',
  email:    `admin@${EMAIL_DOMAIN}`,
  password: 'admin@123',
};

function toNewEmail(originalEmail: string): string {
  const localPart = originalEmail.split('@')[0];
  return `${localPart}@${EMAIL_DOMAIN}`;
}

interface RawAccount {
  id: string;
  name: string;
  role: string;
  email: string;
  password: string;
  mustChangePassword?: boolean;
}

interface RawStudent extends RawAccount {
  level: number;
}

interface RawHalqa {
  id: string;
  name: string;
  teacher: RawAccount;
  students: RawStudent[];
  totals: { students: number; teachers: number; accounts: number };
}

interface RawCourse {
  id: string;
  name: string;
  type: 'boys' | 'girls';
  halaqat: RawHalqa[];
}

interface RawData {
  generatedAt: string;
  courses: RawCourse[];
  totals: { courses: number; halaqat: number; students: number; teachers: number; accounts: number };
}

async function importData(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const data: RawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const generatedDate = new Date(data.generatedAt);

  let trackCount = 0;
  let teacherCount = 0;
  let studentCount = 0;
  let userCount = 0;

  await new User({
    name:     ADMIN_ACCOUNT.name,
    email:    ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
    role:     'admin',
    isActive: true,
  }).save();
  userCount++;
  console.log(`👤  Seeded admin account: ${ADMIN_ACCOUNT.email}`);

  for (const courseJson of data.courses) {
    const masjidInfo = COURSE_MASJID[courseJson.id] ?? { name: courseJson.name, gender: 'male' as const };
    const masjid = await Masjid.create({ name: masjidInfo.name, location: masjidInfo.name, gender: masjidInfo.gender });

    // The old data had one Track per course with several Halqat underneath
    // sharing it; the new model has no halqa layer, so this becomes ONE
    // track per original halqa instead (each keeps its own teacher and
    // roster) rather than one track per course with several sub-groups.
    for (const halqaJson of courseJson.halaqat) {
      const teacherDoc = await Teacher.create({ name: halqaJson.teacher.name });
      teacherCount++;

      await new User({
        name:               halqaJson.teacher.name,
        email:              toNewEmail(halqaJson.teacher.email),
        password:           ROLE_PASSWORD.teacher,
        role:               'teacher',
        profileId:          teacherDoc._id,
        mustChangePassword: halqaJson.teacher.mustChangePassword ?? true,
      }).save();
      userCount++;

      // startDate/endDate/daysPerWeek/timeSlot are not in the source data —
      // placeholder values, same "لم يُحدَّد" convention as before.
      const track = await Track.create({
        masjid:      masjid._id,
        title:       halqaJson.name,
        type:        courseJson.type,
        status:      'active',
        startDate:   generatedDate,
        endDate:     generatedDate,
        daysPerWeek: 'لم يُحدَّد',
        timeSlot:    'لم يُحدَّد',
        isOnline:    false,
        teachers:    [teacherDoc._id as unknown as Schema.Types.ObjectId],
        maxStudents: halqaJson.totals.students,
      });
      trackCount++;

      for (const studentJson of halqaJson.students) {
        const studentDoc = await Student.create({
          name:  studentJson.name,
          track: track._id,
          level: studentJson.level,
        });
        studentCount++;

        await new User({
          name:               studentJson.name,
          email:              toNewEmail(studentJson.email),
          password:           ROLE_PASSWORD.student,
          role:               'student',
          profileId:          studentDoc._id,
          mustChangePassword: studentJson.mustChangePassword ?? true,
        }).save();
        userCount++;
      }
    }
  }

  console.log(`📚  Tracks:   ${trackCount} (expected ${data.totals.halaqat})`);
  console.log(`👨‍🏫  Teachers: ${teacherCount} (expected ${data.totals.teachers})`);
  console.log(`🧑‍🎓  Students: ${studentCount} (expected ${data.totals.students})`);
  console.log(`👤  Users:    ${userCount} (expected ${data.totals.accounts + 1} — includes 1 admin)`);

  await mongoose.disconnect();
  console.log('✅  Import complete — database disconnected');
}

importData().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
