/**
 * One-off: rebuild every teacher/student email from their (Arabic) name.
 *
 * Rule: the email local-part is the person's FIRST name, transliterated to
 * Latin. If the first name is a compound "عبد ..." name (عبد الله /
 * عبد الرحمن / عبد العزيز) the whole compound is used. Duplicate first names
 * get a numeric suffix (abdullah, abdullah2, abdullah3, …). The admin account
 * is left untouched.
 *
 * Run:  npm run regenerate-emails
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';

const EMAIL_DOMAIN = 'Tahfeez.com';

// Words that form a compound first name together with the following word.
const COMPOUND_HEADS = new Set(['عبد', 'أبو', 'ابو', 'ام', 'أم']);

// Curated transliteration of every distinct first-name unit in the dataset.
// Arabic omits short vowels, so a naïve letter-map yields ugly clusters
// (msud, hsn) — a hand-checked map keeps names readable.
const FIRST_NAME_MAP: Record<string, string> = {
  // teachers
  'مسعود': 'masoud',
  'عتيقة': 'atiqa',
  'جميله': 'jamila',
  'فاطمة': 'fatima',
  'ناصر': 'nasser',
  'إبراهيم': 'ibrahim',
  // students — single
  'فجحان': 'fajhan',
  'سعد': 'saad',
  'سعود': 'saud',
  'راكان': 'rakan',
  'سعيد': 'saeed',
  'فهد': 'fahd',
  'خالد': 'khalid',
  'سلطان': 'sultan',
  'غالية': 'ghalia',
  'مريم': 'maryam',
  'سمو': 'sumu',
  'فلوه': 'falwa',
  'شيخة': 'shaikha',
  'امينة': 'amina',
  'دلال': 'dalal',
  'قمرا': 'qamra',
  'مها': 'maha',
  'منيرة': 'munira',
  'فضة': 'fidda',
  'اسما': 'asma',
  'سارة': 'sara',
  'عائشة': 'aisha',
  'هيا': 'haya',
  'الريم': 'alreem',
  'رزان': 'razan',
  'جواهر': 'jawaher',
  'نورة': 'noura',
  'مزا': 'maza',
  'سعاد': 'suad',
  'حماس': 'hamas',
  'زينة': 'zina',
  'الكادي': 'alkadi',
  'العنود': 'alanoud',
  'وتين': 'wateen',
  'جازا': 'jaza',
  'نوف': 'nouf',
  'مبارك': 'mubarak',
  'وافي': 'wafi',
  'بدر': 'badr',
  'مسفر': 'musfir',
  'جاسر': 'jasser',
  'محمد': 'mohammed',
  'نايف': 'naif',
  'مشعل': 'mishaal',
  'عايض': 'ayed',
  'فارس': 'fares',
  'حسن': 'hasan',
  'معيض': 'muaid',
  // students — compound
  'عبد الله': 'abdullah',
  'عبد الرحمن': 'abdulrahman',
  'عبد العزيز': 'abdulaziz',
};

/** Return the Arabic first-name unit (compound-aware) of a full name. */
function firstUnit(name: string): string {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length >= 2 && COMPOUND_HEADS.has(tokens[0])) {
    return `${tokens[0]} ${tokens[1]}`;
  }
  return tokens[0];
}

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // Deterministic order → reproducible "who gets the un-suffixed email".
  const users = await User.find({ role: { $in: ['teacher', 'student'] } })
    .select('name email role')
    .sort({ email: 1 });

  const used = new Set<string>();
  const unknown: string[] = [];
  let changed = 0;

  for (const u of users) {
    const unit = firstUnit(u.name);
    const base = FIRST_NAME_MAP[unit];
    if (!base) {
      unknown.push(`${u.name}  (unit: "${unit}")`);
      continue;
    }

    let local = base;
    for (let n = 2; used.has(local); n++) local = `${base}${n}`;
    used.add(local);

    const next = `${local}@${EMAIL_DOMAIN}`;
    if (next !== u.email) {
      const before = u.email;
      u.email = next;
      await u.save({ validateBeforeSave: false }); // skip password re-hash
      changed++;
      console.log(`  ${u.name}  ${before} → ${next}`);
    }
  }

  console.log(`\n✉️   Rewrote ${changed}/${users.length} emails from names`);
  if (unknown.length) {
    console.warn(`⚠️   ${unknown.length} name(s) had no transliteration and were skipped:`);
    unknown.forEach((n) => console.warn(`   - ${n}`));
  }

  await mongoose.disconnect();
  console.log('✅  Done — database disconnected');
}

run().catch((e) => { console.error(e); process.exit(1); });
