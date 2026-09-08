import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { User } from './models/User.model';
import { Student } from './models/Student.model';
import { Track } from './models/Track.model';

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const studentUsers = await User.countDocuments({ role: 'student' });
  const studentUsersWithProfile = await User.countDocuments({ role: 'student', profileId: { $exists: true, $ne: null } });
  console.log('student Users:', studentUsers, 'with profileId:', studentUsersWithProfile);
  const students = await Student.find({}).select('name');
  console.log('existing Student names:', students.map((s) => s.name));
  const tracks = await Track.find({}).select('title maxStudents');
  console.log('tracks:', tracks.map((t) => ({ id: t._id.toString(), title: t.title, max: t.maxStudents })));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
