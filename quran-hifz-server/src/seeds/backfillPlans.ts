/**
 * Additive-only script — for every Track that has no QuranPlan producing a
 * "today" assignment, creates one so the merged "الحضور والتقييم" page
 * always has something to show. Never deletes or modifies existing data
 * (unlike seed.ts, which wipes the database — do NOT use that for this).
 * Run:  npx ts-node src/seeds/backfillPlans.ts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { Track } from '../models/Track.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { WEEK_DAYS, computeMultiTodayAssignments, pageRangeOfAyahRange } from '../lib/quranRange';

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

  const [tracks, existingPlans] = await Promise.all([
    Track.find({}).select('title teachers'),
    QuranPlan.find({}).select('track segments days startDate endType activeDaysCount endDate rangeStart rangeEnd type'),
  ]);

  const today = new Date();
  let created = 0;

  /** Whether a plan has a ward due today, reading through its segments and
   * migrating a legacy single-track document on the fly (mirrors
   * normalizePlanSegments in quran-plan.controller.ts). */
  const hasWardToday = (p: typeof existingPlans[number]) => {
    const segments = (p.segments && p.segments.length > 0)
      ? p.segments.map((s) => ({ type: s.type, days: s.days, rangeStart: s.rangeStart, rangeEnd: s.rangeEnd }))
      : (p.type && p.days && p.rangeStart && p.rangeEnd)
        ? [{ type: p.type, days: p.days, rangeStart: p.rangeStart, rangeEnd: p.rangeEnd }]
        : [];
    if (segments.length === 0) return false;
    return computeMultiTodayAssignments({
      startDate: p.startDate, holidays: p.holidays,
      endType: p.endType, activeDaysCount: p.activeDaysCount, endDate: p.endDate,
      segments,
    }, today).length > 0;
  };

  for (const track of tracks) {
    if (!track.teachers || track.teachers.length === 0) continue;
    const hasToday = existingPlans
      .filter((p) => p.track && String(p.track) === String(track._id))
      .some(hasWardToday);
    if (hasToday) continue;

    await QuranPlan.create({
      name: `خطة حفظ يومية — ${track.title}`,
      description: 'خطة تلقائية لضمان وجود مقرر يومي (تمت إضافتها تلقائيًا، لا تحذف البيانات الأخرى).',
      teacher: track.teachers[0],
      targetType: 'track',
      track: track._id,
      // One segment: these auto-plans exist only to guarantee a daily ward.
      segments: [{ type: 'حفظ', days: [...WEEK_DAYS], ...DEFAULT_RANGE, schedule: [] }],
      startDate: today,
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
