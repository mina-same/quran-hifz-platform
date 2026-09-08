import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { User } from './models/User.model';
import { Student } from './models/Student.model';

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const students = await Student.find({}).select('name');
  for (const s of students) {
    const users = await User.find({ role: 'student', name: s.name }).select('email profileId');
    console.log(s.name, '->', s._id.toString(), '| matching Users:', users.map((u) => ({ email: u.email, profileId: u.profileId?.toString() })));
  }
  const withProfile = await User.find({ role: 'student', profileId: { $exists: true, $ne: null } }).select('name email profileId');
  console.log('--- users WITH profileId ---');
  console.log(withProfile.map((u) => ({ name: u.name, email: u.email, profileId: u.profileId?.toString() })));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
