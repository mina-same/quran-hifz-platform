/**
 * One-time import of real special-track/halqa/teacher/student data.
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
import { SpecialTrack } from '../models/SpecialTrack.model';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';

const DATA_PATH = '/Volumes/Data/work/quran hifz platform/all_6_halaqat_complete_data.json';

// Only 2 tracks in this dataset — hardcoding their masjid/location beats
// fragile regex-parsing of the Arabic track name for a one-off script.
const COURSE_MASJID: Record<string, string> = {
  'rawad-itqan-boys':   'جامع الأمير متعب بن عبد العزيز',
  'raidat-itqan-girls': 'مركز العماير',
};

const EMAIL_DOMAIN = 'rawad.com';
const ROLE_PASSWORD: Record<'teacher' | 'student', string> = {
  teacher: 'teacher@123',
  student: 'student@123',
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
  let halqaCount = 0;
  let teacherCount = 0;
  let studentCount = 0;
  let userCount = 0;

  for (const courseJson of data.courses) {
    const masjidName = COURSE_MASJID[courseJson.id] ?? courseJson.name;
    const masjid = await Masjid.create({ name: masjidName, location: masjidName });

    const maxStudents = courseJson.halaqat.reduce((sum, h) => sum + h.totals.students, 0);

    // startDate/endDate/daysPerWeek/timeSlot are not in the source data —
    // placeholder values, same "لم يُحدَّد" convention as Halqa.days/time below.
    const track = await SpecialTrack.create({
      title:       courseJson.name,
      type:        courseJson.type,
      status:      'active',
      startDate:   generatedDate,
      endDate:     generatedDate,
      daysPerWeek: 'لم يُحدَّد',
      timeSlot:    'لم يُحدَّد',
      location:    masjidName,
      isOnline:    false,
      teachers:    [],
      maxStudents,
      enrolledStudents: [],
    });
    trackCount++;

    // Every halqa's teacher is also considered a teacher of the track that
    // contains it — needed so the track shows up on that teacher's own
    // "special tracks" list. enrolledStudents stays empty though: this
    // track's real enrollment lives on its halaqat, not direct track
    // enrollment, and merging it in here would leak every other halqa's
    // roster into each teacher's student list (see TeacherStudents.tsx).
    const trackTeacherIds: Schema.Types.ObjectId[] = [];

    for (const halqaJson of courseJson.halaqat) {
      const teacherDoc = await Teacher.create({ name: halqaJson.teacher.name });
      teacherCount++;
      trackTeacherIds.push(teacherDoc._id as unknown as Schema.Types.ObjectId);

      await new User({
        name:               halqaJson.teacher.name,
        email:              toNewEmail(halqaJson.teacher.email),
        password:           ROLE_PASSWORD.teacher,
        role:               'teacher',
        profileId:          teacherDoc._id,
        mustChangePassword: halqaJson.teacher.mustChangePassword ?? true,
      }).save();
      userCount++;

      const halqaDoc = await Halqa.create({
        name:         halqaJson.name,
        teacher:      teacherDoc._id,
        masjid:       masjid._id,
        specialTrack: track._id,
        days:         'لم يُحدَّد',
        time:         'لم يُحدَّد',
      });
      halqaCount++;

      for (const studentJson of halqaJson.students) {
        const studentDoc = await Student.create({
          name:   studentJson.name,
          halqa:  halqaDoc._id,
          masjid: masjid._id,
          level:  studentJson.level,
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

    track.teachers = trackTeacherIds;
    await track.save();
  }

  console.log(`📚  Special tracks: ${trackCount} (expected ${data.totals.courses})`);
  console.log(`🕌  Halaqat:  ${halqaCount} (expected ${data.totals.halaqat})`);
  console.log(`👨‍🏫  Teachers: ${teacherCount} (expected ${data.totals.teachers})`);
  console.log(`🧑‍🎓  Students: ${studentCount} (expected ${data.totals.students})`);
  console.log(`👤  Users:    ${userCount} (expected ${data.totals.accounts})`);

  await mongoose.disconnect();
  console.log('✅  Import complete — database disconnected');
}

importData().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
