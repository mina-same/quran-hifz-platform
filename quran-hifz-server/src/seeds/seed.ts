/**
 * Seed script — populates MongoDB with the same mock data used in the Next.js client.
 * Run:  npm run seed
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid } from '../models/Masjid.model';
import { Halqa } from '../models/Halqa.model';
import { Student } from '../models/Student.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { KPI } from '../models/KPI.model';
import { ParentStudent } from '../models/ParentStudent.model';

async function seed(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // ── Wipe existing data ─────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Masjid.deleteMany({}),
    Halqa.deleteMany({}),
    Student.deleteMany({}),
    HifzEntry.deleteMany({}),
    Attendance.deleteMany({}),
    Homework.deleteMany({}),
    GroupHomework.deleteMany({}),
    LessonRecording.deleteMany({}),
    SpecialTrack.deleteMany({}),
    KPI.deleteMany({}),
    ParentStudent.deleteMany({}),
  ]);
  console.log('🗑   Cleared existing collections');

  // ── Teachers ───────────────────────────────────────────────────────────────
  const teachers = await Teacher.insertMany([
    { name: 'ناصر الحميداني', specialty: 'تحفيظ القرآن الكريم', rating: '٤.٩ / ٥', status: 'active' },
    { name: 'سعد المالكي',    specialty: 'تحفيظ القرآن الكريم', rating: '٤.٧ / ٥', status: 'active' },
    { name: 'فيصل العتيبي',  specialty: 'تحفيظ القرآن الكريم', rating: '٤.٨ / ٥', status: 'active' },
    { name: 'محمد الزهراني', specialty: 'تحفيظ القرآن الكريم', rating: '٤.٦ / ٥', status: 'active' },
  ]);
  console.log(`👨‍🏫  Seeded ${teachers.length} teachers`);

  // ── Masajid ────────────────────────────────────────────────────────────────
  const masajid = await Masjid.insertMany([
    { name: 'مسجد الفاروق', location: 'حي العماير الشمالي' },
    { name: 'مسجد النور',   location: 'حي العماير الجنوبي' },
    { name: 'مسجد التقوى', location: 'حي العماير الغربي' },
    { name: 'مسجد الهدى',  location: 'حي العماير الشرقي' },
  ]);
  console.log(`🕌  Seeded ${masajid.length} masajid`);

  const [mFaruq, mNur, mTaqwa, mHuda] = masajid;
  const [tNasir, tSaad, tFaisal, tMohammad] = teachers;

  // ── Halqat ─────────────────────────────────────────────────────────────────
  const halqat = await Halqa.insertMany([
    { name: 'حلقة عمر بن الخطاب',      teacher: tNasir._id,    masjid: mFaruq._id,    days: 'السبت، الاثنين، الخميس',    time: '٥:٠٠ م - ٦:٣٠ م', capacity: 15, attendancePct: 92, completionPct: 65 },
    { name: 'حلقة أبي بكر الصديق',      teacher: tSaad._id,     masjid: mNur._id,      days: 'الأحد، الثلاثاء، الجمعة',  time: '٤:٣٠ م - ٦:٠٠ م', capacity: 15, attendancePct: 87, completionPct: 72 },
    { name: 'حلقة علي بن أبي طالب',     teacher: tFaisal._id,   masjid: mTaqwa._id,    days: 'السبت، الاثنين، الأربعاء', time: '٥:٣٠ م - ٧:٠٠ م', capacity: 15, attendancePct: 95, completionPct: 58 },
    { name: 'حلقة عثمان بن عفان',       teacher: tMohammad._id, masjid: mFaruq._id,    days: 'الثلاثاء، الخميس، السبت',  time: '٤:٠٠ م - ٥:٣٠ م', capacity: 12, attendancePct: 83, completionPct: 80 },
    { name: 'حلقة عبدالرحمن بن عوف',   teacher: tNasir._id,    masjid: mHuda._id,     days: 'الأحد، الثلاثاء، الخميس',  time: '٦:٠٠ م - ٧:٣٠ م', capacity: 15, attendancePct: 90, completionPct: 70 },
  ]);
  console.log(`📚  Seeded ${halqat.length} halqat`);

  const [hOmar, hAbuBakr, hAli, hOthman, hAbdulRahman] = halqat;

  // ── Students ───────────────────────────────────────────────────────────────
  const students = await Student.insertMany([
    { name: 'عبدالله الحميداني', path: 'حفظ كامل',      halqa: hOmar._id,          masjid: mFaruq._id,  attendancePct: 94,  progressPct: 68, progressPages: 408, totalPages: 604, guardian: 'محمد الحميداني', guardianPhone: '0512345678', lastMemorization: 'البقرة ١-٢٠',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'يوسف العمري',       path: 'حفظ كامل',      halqa: hOmar._id,          masjid: mFaruq._id,  attendancePct: 88,  progressPct: 52, progressPages: 314, totalPages: 604, guardian: 'عمر العمري',    guardianPhone: '0523456789', lastMemorization: 'آل عمران ١-١٥',   status: 'active', homeworkStatus: 'pending'   },
    { name: 'سلطان المطيري',     path: 'عشرون جزءاً',  halqa: hAbuBakr._id,       masjid: mNur._id,    attendancePct: 100, progressPct: 78, progressPages: 235, totalPages: 302, guardian: 'فيصل المطيري',   guardianPhone: '0534567890', lastMemorization: 'النساء ٥-١٢',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'فهد الشمري',        path: 'عشرة أجزاء',   halqa: hAbuBakr._id,       masjid: mNur._id,    attendancePct: 75,  progressPct: 45, progressPages: 68,  totalPages: 151, guardian: 'خالد الشمري',    guardianPhone: '0545678901', lastMemorization: 'المائدة ١-٨',      status: 'active', homeworkStatus: 'late'      },
    { name: 'ماجد القحطاني',     path: 'حفظ كامل',      halqa: hAli._id,           masjid: mTaqwa._id,  attendancePct: 82,  progressPct: 35, progressPages: 211, totalPages: 604, guardian: 'ناصر القحطاني',  guardianPhone: '0556789012', lastMemorization: 'الأنعام ١-٦',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'عمر الدوسري',       path: 'عشرون جزءاً',  halqa: hAli._id,           masjid: mTaqwa._id,  attendancePct: 91,  progressPct: 62, progressPages: 187, totalPages: 302, guardian: 'سعد الدوسري',    guardianPhone: '0567890123', lastMemorization: 'الأعراف ١-١٠',    status: 'active', homeworkStatus: 'submitted' },
    { name: 'خالد العنزي',       path: 'عشرة أجزاء',   halqa: hOthman._id,        masjid: mFaruq._id,  attendancePct: 85,  progressPct: 60, progressPages: 91,  totalPages: 151, guardian: 'محمد العنزي',    guardianPhone: '0578901234', lastMemorization: 'الأنفال ١-٥',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'عبدالرحمن الغامدي', path: 'حفظ كامل',      halqa: hAbdulRahman._id,   masjid: mHuda._id,   attendancePct: 97,  progressPct: 85, progressPages: 513, totalPages: 604, guardian: 'أحمد الغامدي',   guardianPhone: '0589012345', lastMemorization: 'التوبة ١-٢٠',      status: 'active', homeworkStatus: 'submitted' },
  ]);
  console.log(`🧑‍🎓  Seeded ${students.length} students`);

  // ── Hifz entries (for first student) ──────────────────────────────────────
  const hifzData = [
    { surah: 'الفاتحة',   surahNumber: 1,  status: 'مكتمل', completionDate: new Date('2024-01-10') },
    { surah: 'البقرة',    surahNumber: 2,  status: 'مكتمل', completionDate: new Date('2024-03-22') },
    { surah: 'آل عمران', surahNumber: 3,  status: 'مكتمل', completionDate: new Date('2024-06-15') },
    { surah: 'النساء',   surahNumber: 4,  status: 'جارٍ'   },
    { surah: 'المائدة',  surahNumber: 5,  status: 'لم يبدأ' },
    { surah: 'الأنعام',  surahNumber: 6,  status: 'لم يبدأ' },
    { surah: 'الأعراف',  surahNumber: 7,  status: 'لم يبدأ' },
    { surah: 'الأنفال',  surahNumber: 8,  status: 'لم يبدأ' },
  ] as const;

  await HifzEntry.insertMany(
    hifzData.map((e) => ({ ...e, student: students[0]._id })),
  );
  console.log(`📖  Seeded hifz entries for ${students[0].name}`);

  // ── Attendance records (last 8 sessions for student 0) ────────────────────
  const attendanceSeed = [
    { date: new Date('2024-10-19'), day: 'السبت',   time: '٥:٠٠ م', status: 'حاضر'  },
    { date: new Date('2024-10-17'), day: 'الخميس',  time: '٥:٠٠ م', status: 'حاضر'  },
    { date: new Date('2024-10-14'), day: 'الاثنين', time: '٥:٠٠ م', status: 'حاضر'  },
    { date: new Date('2024-10-12'), day: 'السبت',   time: '٥:٠٠ م', status: 'متأخر' },
    { date: new Date('2024-10-10'), day: 'الخميس',  time: '٥:٠٠ م', status: 'غائب'  },
    { date: new Date('2024-10-07'), day: 'الاثنين', time: '٥:٠٠ م', status: 'حاضر'  },
    { date: new Date('2024-10-05'), day: 'السبت',   time: '٥:٠٠ م', status: 'حاضر'  },
    { date: new Date('2024-10-03'), day: 'الخميس',  time: '٥:٠٠ م', status: 'حاضر'  },
  ] as const;

  await Attendance.insertMany(
    attendanceSeed.map((a) => ({ ...a, student: students[0]._id, halqa: hOmar._id })),
  );
  console.log(`✅  Seeded attendance records`);

  // ── Homework ───────────────────────────────────────────────────────────────
  await Homework.insertMany([
    { student: students[0]._id, teacher: tNasir._id, halqa: hOmar._id, type: 'حفظ جديد',   segment: 'البقرة ٢١-٤٠',       dueDate: new Date('2024-10-24'), status: 'معلق',  rating: undefined },
    { student: students[1]._id, teacher: tNasir._id, halqa: hOmar._id, type: 'مراجعة',      segment: 'آل عمران ١-١٥',      dueDate: new Date('2024-10-24'), status: 'مراجع', rating: 'جيد' },
    { student: students[2]._id, teacher: tSaad._id,  halqa: hAbuBakr._id, type: 'تلاوة',   segment: 'النساء ٥-١٢',         dueDate: new Date('2024-10-22'), status: 'مراجع', rating: 'ممتاز' },
    { student: students[3]._id, teacher: tSaad._id,  halqa: hAbuBakr._id, type: 'مراجعة',  segment: 'المائدة ١-٨',         dueDate: new Date('2024-10-20'), status: 'متأخر', rating: undefined },
  ]);
  console.log(`📝  Seeded homework records`);

  // ── Special Tracks (multi-teacher, many-to-many enrollment) ───────────────
  const specialTracks = await SpecialTrack.insertMany([
    {
      title: 'دورة رمضان المكثفة',
      type: 'رمضاني',
      status: 'active',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-01'),
      daysPerWeek: 'السبت، الأحد، الثلاثاء',
      timeSlot: '٨:٠٠ م - ٩:٣٠ م',
      location: mFaruq.name,
      isOnline: false,
      teachers: [tNasir._id, tSaad._id],
      maxStudents: 20,
      enrolledStudents: [students[0]._id, students[2]._id],
      notes: 'مسار مكثف لختم جزء إضافي خلال الفترة',
    },
  ]);
  console.log(`🌙  Seeded ${specialTracks.length} special tracks`);
  const [trackRamadan] = specialTracks;

  // ── Group homework (one halqa-linked, one specialTrack-linked) ────────────
  await GroupHomework.insertMany([
    { halqa: hOmar._id, teacher: tNasir._id, title: 'مراجعة جماعية', description: 'مراجعة سورة البقرة كاملة', dueDay: 'الخميس', dueDate: new Date('2024-10-24') },
    { specialTrack: trackRamadan._id, teacher: tNasir._id, title: 'ورد رمضان', description: 'حفظ نصف جزء إضافي', dueDay: 'الثلاثاء', dueDate: new Date('2024-10-29') },
  ]);
  console.log(`📋  Seeded group homework records`);

  // ── Lesson recordings (one halqa-linked, one specialTrack-linked) ─────────
  await LessonRecording.insertMany([
    { student: students[0]._id, teacher: tNasir._id, halqa: hOmar._id, type: 'تسميع', segment: 'البقرة ١-٢٠', points: 9, teacherNote: 'أداء ممتاز' },
    { student: students[0]._id, teacher: tNasir._id, specialTrack: trackRamadan._id, type: 'تسميع', segment: 'جزء إضافي', points: 8, teacherNote: 'التزام جيد بورد المسار' },
  ]);
  console.log(`🎙️  Seeded lesson recordings`);

  // ── Special-track attendance (cross-halqa roster) ──────────────────────────
  await Attendance.insertMany([
    { student: students[0]._id, specialTrack: trackRamadan._id, date: new Date('2024-10-15'), day: 'الثلاثاء', time: '٨:٠٠ م', status: 'حاضر' },
    { student: students[2]._id, specialTrack: trackRamadan._id, date: new Date('2024-10-15'), day: 'الثلاثاء', time: '٨:٠٠ م', status: 'غائب' },
  ]);
  console.log(`✅  Seeded special-track attendance records`);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  await KPI.insertMany([
    { indicator: 'نسبة الحضور الكلية',             target: '٩٠٪',      actual: '٩١٪',      rating: 'ممتاز' },
    { indicator: 'متوسط الصفحات المحفوظة شهرياً', target: '١٥ صفحة', actual: '١٣ صفحة', rating: 'جيد'   },
    { indicator: 'نسبة إكمال الواجبات',             target: '٨٥٪',      actual: '٧٨٪',      rating: 'مقبول' },
    { indicator: 'رضا أولياء الأمور',               target: '٩٠٪',      actual: '٩٤٪',      rating: 'ممتاز' },
    { indicator: 'تقييم أداء المعلمين',             target: 'ممتاز',    actual: 'ممتاز',    rating: 'ممتاز' },
    { indicator: 'معدل الاحتفاظ بالطلاب',           target: '٩٥٪',      actual: '٩٢٪',      rating: 'جيد'   },
    { indicator: 'معدل إتمام الختمات السنوية',      target: '٦٠٪',      actual: '٤٥٪',      rating: 'ضعيف'  },
  ]);
  console.log(`📊  Seeded ${7} KPIs`);

  // ── Users (admin + teacher + student + parent) ────────────────────────────
  const [, , , parentUser] = await Promise.all([
    new User({ name: 'مدير النظام',       email: 'admin@quran-hifz.sa',    password: 'admin123',   role: 'admin',   isActive: true }).save(),
    new User({ name: 'ناصر الحميداني',   email: 'nasir@quran-hifz.sa',    password: 'teacher123', role: 'teacher', profileId: tNasir._id,    isActive: true }).save(),
    new User({ name: 'عبدالله الحميداني', email: 'abdullah@quran-hifz.sa', password: 'student123', role: 'student', profileId: students[0]._id, isActive: true }).save(),
    new User({ name: 'محمد الحميداني',   email: 'parent@quran-hifz.sa',   password: 'parent123',  role: 'parent',  isActive: true }).save(),
  ]);
  console.log(`👤  Seeded 4 user accounts`);

  // ── Parent → Student links ─────────────────────────────────────────────────
  await ParentStudent.create([
    { parent: parentUser._id, student: students[0]._id },
    { parent: parentUser._id, student: students[1]._id },
  ]);
  console.log(`🔗  Linked parent to ${students[0].name} and ${students[1].name}`);

  console.log('\n──────────────────────────────────────────');
  console.log('🔑  Login credentials:');
  console.log('   Admin:   admin@quran-hifz.sa   / admin123');
  console.log('   Teacher: nasir@quran-hifz.sa   / teacher123');
  console.log('   Student: abdullah@quran-hifz.sa / student123');
  console.log('   Parent:  parent@quran-hifz.sa  / parent123');
  console.log('──────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✅  Seed complete — database disconnected');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
