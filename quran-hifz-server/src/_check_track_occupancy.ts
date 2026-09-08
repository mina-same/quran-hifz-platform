import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { Track } from './models/Track.model';
import { Student } from './models/Student.model';

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const tracks = await Track.find({}).select('title maxStudents');
  for (const t of tracks) {
    const count = await Student.countDocuments({ track: t._id });
    console.log(t.title, '| max:', t.maxStudents, '| current:', count, '| remaining:', t.maxStudents - count, '| id:', t._id.toString());
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
