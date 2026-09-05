/**
 * Seed script — populates MongoDB with the same mock data used in the Next.js client.
 * Run:  npm run seed
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';
import { Teacher } from '../models/Teacher.model';
import { Masjid } from '../models/Masjid.model';
import { Track } from '../models/Track.model';
import { Student } from '../models/Student.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { KPI } from '../models/KPI.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { QuranPlan } from '../models/QuranPlan.model';

async function seed(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // ── Wipe existing data ─────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Masjid.deleteMany({}),
    Track.deleteMany({}),
    Student.deleteMany({}),
    HifzEntry.deleteMany({}),
    Attendance.deleteMany({}),
    Homework.deleteMany({}),
    GroupHomework.deleteMany({}),
    LessonRecording.deleteMany({}),
    KPI.deleteMany({}),
    ParentStudent.deleteMany({}),
    QuranPlan.deleteMany({}),
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
    { name: 'الفاروق', location: 'حي العماير الشمالي',       gender: 'male'   },
    { name: 'النور',   location: 'حي العماير الجنوبي',       gender: 'male'   },
    { name: 'التقوى',  location: 'حي العماير الغربي',        gender: 'male'   },
    { name: 'الهدى',   location: 'حي العماير الشرقي',        gender: 'male'   },
    { name: 'خديجة',   location: 'حي العماير الجنوبي الغربي', gender: 'female' },
  ]);
  console.log(`🕌  Seeded ${masajid.length} masajid`);

  const [mFaruq, mNur, mTaqwa, mHuda, mKhadija] = masajid;
  const [tNasir, tSaad, tFaisal, tMohammad] = teachers;

  // ── Tracks (masjid-linked memorization/review groups, incl. multi-teacher
  //    special tracks — both are the same shape now) ─────────────────────────
  const tracks = await Track.insertMany([
    { masjid: mFaruq._id,   title: 'مسار عمر بن الخطاب',        type: 'تحفيظ', status: 'active',   startDate: new Date('2024-09-01'), endDate: new Date('2025-06-01'), daysPerWeek: 'السبت، الاثنين، الخميس',    timeSlot: '٥:٠٠ م - ٦:٣٠ م', isOnline: false, teachers: [tNasir._id],           maxStudents: 15 },
    { masjid: mNur._id,     title: 'مسار أبي بكر الصديق',        type: 'تحفيظ', status: 'active',   startDate: new Date('2024-09-01'), endDate: new Date('2025-06-01'), daysPerWeek: 'الأحد، الثلاثاء، الجمعة',  timeSlot: '٤:٣٠ م - ٦:٠٠ م', isOnline: false, teachers: [tSaad._id],            maxStudents: 15 },
    { masjid: mTaqwa._id,   title: 'مسار علي بن أبي طالب',       type: 'تحفيظ', status: 'active',   startDate: new Date('2024-09-01'), endDate: new Date('2025-06-01'), daysPerWeek: 'السبت، الاثنين، الأربعاء', timeSlot: '٥:٣٠ م - ٧:٠٠ م', isOnline: false, teachers: [tFaisal._id],          maxStudents: 15 },
    { masjid: mFaruq._id,   title: 'مسار عثمان بن عفان',         type: 'تحفيظ', status: 'active',   startDate: new Date('2024-09-01'), endDate: new Date('2025-06-01'), daysPerWeek: 'الثلاثاء، الخميس، السبت',  timeSlot: '٤:٠٠ م - ٥:٣٠ م', isOnline: false, teachers: [tMohammad._id],        maxStudents: 12 },
    { masjid: mHuda._id,    title: 'مسار عبدالرحمن بن عوف',      type: 'تحفيظ', status: 'active',   startDate: new Date('2024-09-01'), endDate: new Date('2025-06-01'), daysPerWeek: 'الأحد، الثلاثاء، الخميس',  timeSlot: '٦:٠٠ م - ٧:٣٠ م', isOnline: false, teachers: [tNasir._id],           maxStudents: 15 },
    { masjid: mKhadija._id, title: 'مسار الطالبات لحفظ القرآن',  type: 'تحفيظ', status: 'upcoming', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-01'), daysPerWeek: 'الأحد، الثلاثاء، الخميس',  timeSlot: '٤:٠٠ م - ٥:٣٠ م', isOnline: false, teachers: [tMohammad._id],        maxStudents: 15 },
    {
      masjid: mFaruq._id,
      title: 'دورة رمضان المكثفة',
      type: 'رمضاني',
      status: 'active',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-12-01'),
      daysPerWeek: 'السبت، الأحد، الثلاثاء',
      timeSlot: '٨:٠٠ م - ٩:٣٠ م',
      isOnline: false,
      teachers: [tNasir._id, tSaad._id],
      maxStudents: 20,
      notes: 'مسار مكثف لختم جزء إضافي خلال الفترة',
    },
  ]);
  console.log(`📚  Seeded ${tracks.length} مسارات`);

  const [tOmar, tAbuBakr, tAli, tOthman, tAbdulRahman, , tRamadan] = tracks;

  // ── Students ───────────────────────────────────────────────────────────────
  const students = await Student.insertMany([
    { name: 'عبدالله الحميداني', path: 'حفظ كامل',      track: tOmar._id,         attendancePct: 94,  progressPct: 68, progressPages: 408, totalPages: 604, guardian: 'محمد الحميداني', guardianPhone: '0512345678', lastMemorization: 'البقرة ١-٢٠',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'يوسف العمري',       path: 'حفظ كامل',      track: tOmar._id,         attendancePct: 88,  progressPct: 52, progressPages: 314, totalPages: 604, guardian: 'عمر العمري',    guardianPhone: '0523456789', lastMemorization: 'آل عمران ١-١٥',   status: 'active', homeworkStatus: 'pending'   },
    { name: 'سلطان المطيري',     path: 'عشرون جزءاً',  track: tAbuBakr._id,      attendancePct: 100, progressPct: 78, progressPages: 235, totalPages: 302, guardian: 'فيصل المطيري',   guardianPhone: '0534567890', lastMemorization: 'النساء ٥-١٢',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'فهد الشمري',        path: 'عشرة أجزاء',   track: tAbuBakr._id,      attendancePct: 75,  progressPct: 45, progressPages: 68,  totalPages: 151, guardian: 'خالد الشمري',    guardianPhone: '0545678901', lastMemorization: 'المائدة ١-٨',      status: 'active', homeworkStatus: 'late'      },
    { name: 'ماجد القحطاني',     path: 'حفظ كامل',      track: tAli._id,          attendancePct: 82,  progressPct: 35, progressPages: 211, totalPages: 604, guardian: 'ناصر القحطاني',  guardianPhone: '0556789012', lastMemorization: 'الأنعام ١-٦',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'عمر الدوسري',       path: 'عشرون جزءاً',  track: tAli._id,          attendancePct: 91,  progressPct: 62, progressPages: 187, totalPages: 302, guardian: 'سعد الدوسري',    guardianPhone: '0567890123', lastMemorization: 'الأعراف ١-١٠',    status: 'active', homeworkStatus: 'submitted' },
    { name: 'خالد العنزي',       path: 'عشرة أجزاء',   track: tOthman._id,       attendancePct: 85,  progressPct: 60, progressPages: 91,  totalPages: 151, guardian: 'محمد العنزي',    guardianPhone: '0578901234', lastMemorization: 'الأنفال ١-٥',      status: 'active', homeworkStatus: 'submitted' },
    { name: 'عبدالرحمن الغامدي', path: 'حفظ كامل',      track: tAbdulRahman._id,  attendancePct: 97,  progressPct: 85, progressPages: 513, totalPages: 604, guardian: 'أحمد الغامدي',   guardianPhone: '0589012345', lastMemorization: 'التوبة ١-٢٠',      status: 'active', homeworkStatus: 'submitted' },
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
    attendanceSeed.map((a) => ({ ...a, student: students[0]._id, track: tOmar._id })),
  );
  console.log(`✅  Seeded attendance records`);

  // ── Homework ───────────────────────────────────────────────────────────────
  await Homework.insertMany([
    { student: students[0]._id, teacher: tNasir._id, track: tOmar._id,    type: 'حفظ جديد',   segment: 'البقرة ٢١-٤٠',       dueDate: new Date('2024-10-24'), status: 'معلق',  rating: undefined },
    { student: students[1]._id, teacher: tNasir._id, track: tOmar._id,    type: 'مراجعة',      segment: 'آل عمران ١-١٥',      dueDate: new Date('2024-10-24'), status: 'مراجع', rating: 'جيد' },
    { student: students[2]._id, teacher: tSaad._id,  track: tAbuBakr._id, type: 'تلاوة',       segment: 'النساء ٥-١٢',         dueDate: new Date('2024-10-22'), status: 'مراجع', rating: 'ممتاز' },
    { student: students[3]._id, teacher: tSaad._id,  track: tAbuBakr._id, type: 'مراجعة',      segment: 'المائدة ١-٨',         dueDate: new Date('2024-10-20'), status: 'متأخر', rating: undefined },
  ]);
  console.log(`📝  Seeded homework records`);

  // ── Group homework (both track-linked) ─────────────────────────────────────
  await GroupHomework.insertMany([
    { track: tOmar._id,    teacher: tNasir._id, title: 'مراجعة جماعية', description: 'مراجعة سورة البقرة كاملة', dueDay: 'الخميس',    dueDate: new Date('2024-10-24') },
    { track: tRamadan._id, teacher: tNasir._id, title: 'ورد رمضان',      description: 'حفظ نصف جزء إضافي',        dueDay: 'الثلاثاء', dueDate: new Date('2024-10-29') },
  ]);
  console.log(`📋  Seeded group homework records`);

  // ── Lesson recordings (both track-linked) ──────────────────────────────────
  await LessonRecording.insertMany([
    { student: students[0]._id, teacher: tNasir._id, track: tOmar._id,    type: 'تسميع', segment: 'البقرة ١-٢٠', points: 9, teacherNote: 'أداء ممتاز' },
    { student: students[0]._id, teacher: tNasir._id, track: tRamadan._id, type: 'تسميع', segment: 'جزء إضافي',   points: 8, teacherNote: 'التزام جيد بورد المسار' },
  ]);
  console.log(`🎙️  Seeded lesson recordings`);

  // ── Track attendance (cross-track roster for the Ramadan track) ───────────
  await Attendance.insertMany([
    { student: students[0]._id, track: tRamadan._id, date: new Date('2024-10-15'), day: 'الثلاثاء', time: '٨:٠٠ م', status: 'حاضر' },
    { student: students[2]._id, track: tRamadan._id, date: new Date('2024-10-15'), day: 'الثلاثاء', time: '٨:٠٠ م', status: 'غائب' },
  ]);
  console.log(`✅  Seeded track attendance records`);

  // ── Quran plans (track- and students-targeted) ─────────────────────────────
  const today = new Date();
  const inAMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  await QuranPlan.insertMany([
    {
      name: 'خطة حفظ سورة البقرة',
      type: 'حفظ',
      description: 'حفظ سورة البقرة كاملة على مدار الشهر',
      teacher: tNasir._id,
      targetType: 'track',
      track: tOmar._id,
      days: ALL_WEEK_DAYS,
      rangeStart: { surahNumber: 1, ayah: 1 },
      rangeEnd: { surahNumber: 2, ayah: 286 },
      pointsEnabled: true,
      pointRules: [
        { label: 'خطأ في التجويد', amount: 2, kind: 'خصم' },
        { label: 'تلاوة ممتازة', amount: 5, kind: 'زيادة' },
      ],
      endType: 'activeDays',
      activeDaysCount: 30,
    },
    {
      name: 'مراجعة جزء عمّ',
      type: 'مراجعة',
      description: 'مراجعة أسبوعية لجزء عمّ',
      teacher: tNasir._id,
      targetType: 'students',
      students: [students[0]._id, students[1]._id],
      days: ['السبت', 'الاثنين', 'الأربعاء'],
      rangeStart: { surahNumber: 78, ayah: 1 },
      rangeEnd: { surahNumber: 114, ayah: 6 },
      pointsEnabled: false,
      endType: 'date',
      startDate: today,
      endDate: inAMonth,
    },
    {
      name: 'ورد مراجعة المسار الرمضاني',
      type: 'مراجعة',
      description: 'ورد مراجعة يومي لمتابعي مسار رمضان المكثف',
      teacher: tNasir._id,
      targetType: 'track',
      track: tRamadan._id,
      days: ['السبت', 'الأحد', 'الثلاثاء'],
      rangeStart: { surahNumber: 1, ayah: 1 },
      rangeEnd: { surahNumber: 2, ayah: 50 },
      pointsEnabled: true,
      pointRules: [{ label: 'إتمام الورد', amount: 3, kind: 'زيادة' }],
      endType: 'activeDays',
      activeDaysCount: 15,
    },
    // Demo plan for the same-day multi-segment feature: حفظ and مراجعة share
    // every one of their weekdays, so التاريخ نفسه produces both wards at once.
    {
      name: 'خطة حفظ ومراجعة في نفس اليوم (تجريبية)',
      description: 'خطة تجريبية لاختبار الحفظ والمراجعة في نفس الأيام على مسار علي بن أبي طالب',
      teacher: tFaisal._id,
      targetType: 'track',
      track: tAli._id,
      segments: [
        {
          type: 'حفظ',
          days: ['السبت', 'الاثنين', 'الأربعاء'],
          rangeStart: { surahNumber: 67, ayah: 1 },
          rangeEnd: { surahNumber: 77, ayah: 50 },
          schedule: [],
        },
        {
          type: 'مراجعة',
          days: ['السبت', 'الاثنين', 'الأربعاء'],
          rangeStart: { surahNumber: 1, ayah: 1 },
          rangeEnd: { surahNumber: 2, ayah: 141 },
          schedule: [],
        },
      ],
      pointsEnabled: false,
      endType: 'activeDays',
      activeDaysCount: 9,
    },
  ]);
  console.log(`🎯  Seeded 4 Quran plans (incl. 1 same-day حفظ+مراجعة demo)`);

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

  // ── Users (admin + teachers + student + parent) ───────────────────────────
  const [, , , , parentUser] = await Promise.all([
    new User({ name: 'مدير النظام',       email: 'admin@quran-hifz.sa',    password: 'admin123',   role: 'admin',   isActive: true }).save(),
    new User({ name: 'ناصر الحميداني',   email: 'nasir@quran-hifz.sa',    password: 'teacher123', role: 'teacher', profileId: tNasir._id,    isActive: true }).save(),
    // Owns the same-day حفظ+مراجعة demo plan (مسار علي بن أبي طالب).
    new User({ name: 'فيصل العتيبي',     email: 'faisal@quran-hifz.sa',   password: 'teacher123', role: 'teacher', profileId: tFaisal._id,   isActive: true }).save(),
    new User({ name: 'عبدالله الحميداني', email: 'abdullah@quran-hifz.sa', password: 'student123', role: 'student', profileId: students[0]._id, isActive: true }).save(),
    new User({ name: 'محمد الحميداني',   email: 'parent@quran-hifz.sa',   password: 'parent123',  role: 'parent',  isActive: true }).save(),
  ]);
  console.log(`👤  Seeded 5 user accounts`);

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
