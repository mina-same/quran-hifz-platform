/**
 * Additive-only script — for every Halqa or SpecialTrack that has no QuranPlan
 * producing a "today" assignment, creates one so the merged "الحضور والتقييم"
 * page always has something to show. Never deletes or modifies existing data
 * (unlike seed.ts, which wipes the database — do NOT use that for this).
 * Run:  npx ts-node src/seeds/backfillPlans.ts
 */
import mongoose, { Types } from 'mongoose';
import { ENV } from '../config/env';
import { Halqa } from '../models/Halqa.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { WEEK_DAYS, computeTodayAssignment, pageRangeOfAyahRange } from '../lib/quranRange';

// A modest, multi-page starting range (Al-Fatiha + most of Al-Baqarah's first
// juz') so the day's assignment banner has something meaningful to show.
const DEFAULT_RANGE = {
  rangeStart: { surahNumber: 1, ayah: 1 },
  rangeEnd:   { surahNumber: 2, ayah: 141 },
};
// sliceForOccurrence divides by whole mushaf pages, not ayahs — activeDaysCount
// must not exceed the range's page count, or every non-final day gets nothing
// assigned (dailyPages floors to 0). One page/day keeps every day non-empty.
const DEFAULT_ACTIVE_DAYS = pageRangeOfAyahRange(DEFAULT_RANGE.rangeStart, DEFAULT_RANGE.rangeEnd).pageCount;

async function backfill(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const [halqat, tracks, existingPlans] = await Promise.all([
    Halqa.find({}).select('name teacher'),
    SpecialTrack.find({}).select('title teachers'),
    QuranPlan.find({}).select('halqa specialTrack days startDate endType activeDaysCount endDate rangeStart rangeEnd'),
  ]);

  const today = new Date();
  let created = 0;

  for (const halqa of halqat) {
    const hasToday = existingPlans
      .filter((p) => p.halqa && String(p.halqa) === String(halqa._id))
      .some((p) => computeTodayAssignment(p, today) !== null);
    if (hasToday) continue;

    await QuranPlan.create({
      name: `خطة حفظ يومية — ${halqa.name}`,
      type: 'حفظ',
      description: 'خطة تلقائية لضمان وجود مقرر يومي (تمت إضافتها تلقائيًا، لا تحذف البيانات الأخرى).',
      teacher: halqa.teacher,
      targetType: 'halqa',
      halqa: halqa._id,
      days: [...WEEK_DAYS],
      startDate: today,
      ...DEFAULT_RANGE,
      pointsEnabled: false,
      pointRules: [],
      endType: 'activeDays',
      activeDaysCount: DEFAULT_ACTIVE_DAYS,
      status: 'نشطة',
    });
    created++;
    console.log(`  + خطة جديدة لحلقة "${halqa.name}"`);
  }

  for (const track of tracks) {
    if (!track.teachers || track.teachers.length === 0) continue;
    const hasToday = existingPlans
      .filter((p) => p.specialTrack && String(p.specialTrack) === String(track._id))
      .some((p) => computeTodayAssignment(p, today) !== null);
    if (hasToday) continue;

    await QuranPlan.create({
      name: `خطة حفظ يومية — ${track.title}`,
      type: 'حفظ',
      description: 'خطة تلقائية لضمان وجود مقرر يومي (تمت إضافتها تلقائيًا، لا تحذف البيانات الأخرى).',
      teacher: track.teachers[0],
      targetType: 'specialTrack',
      specialTrack: track._id,
      days: [...WEEK_DAYS],
      startDate: today,
      ...DEFAULT_RANGE,
      pointsEnabled: false,
      pointRules: [],
      endType: 'activeDays',
      activeDaysCount: DEFAULT_ACTIVE_DAYS,
      status: 'نشطة',
    });
    created++;
    console.log(`  + خطة جديدة لمسار "${track.title}"`);
  }

  console.log(`\n✅  اكتمل — تمت إضافة ${created} خطة جديدة (لم يُحذف أي شيء).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
