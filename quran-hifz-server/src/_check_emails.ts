import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { User } from './models/User.model';

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const tahfeez = await User.countDocuments({ role: 'student', email: { $regex: '@tahfeez.com$' } });
  const quranhifz = await User.countDocuments({ role: 'student', email: { $regex: '@quran-hifz.sa$' } });
  const other = await User.countDocuments({ role: 'student', email: { $not: { $regex: '@(tahfeez.com|quran-hifz.sa)$' } } });
  console.log('tahfeez.com student users:', tahfeez, '| quran-hifz.sa:', quranhifz, '| other:', other);

  const teacherTahfeez = await User.countDocuments({ role: 'teacher', email: { $regex: '@tahfeez.com$' } });
  const teacherQH = await User.countDocuments({ role: 'teacher', email: { $regex: '@quran-hifz.sa$' } });
  console.log('teacher users tahfeez:', teacherTahfeez, 'quran-hifz.sa:', teacherQH);

  const parentTahfeez = await User.countDocuments({ role: 'parent', email: { $regex: '@tahfeez.com$' } });
  const parentQH = await User.countDocuments({ role: 'parent', email: { $regex: '@quran-hifz.sa$' } });
  console.log('parent users tahfeez:', parentTahfeez, 'quran-hifz.sa:', parentQH);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
