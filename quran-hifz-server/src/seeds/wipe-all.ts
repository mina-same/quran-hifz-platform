/**
 * One-time full wipe of the local dev database before importing real data.
 * Run: npx ts-node --transpile-only src/seeds/wipe-all.ts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { Attendance } from '../models/Attendance.model';
import { Evaluation } from '../models/Evaluation.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { Halqa } from '../models/Halqa.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Homework } from '../models/Homework.model';
import { IndividualPlan } from '../models/IndividualPlan.model';
import { KPI } from '../models/KPI.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { Masjid } from '../models/Masjid.model';
import { Message } from '../models/Message.model';
import { ParentStudent } from '../models/ParentStudent.model';
import { QuranPlan } from '../models/QuranPlan.model';
import { SpecialTrack } from '../models/SpecialTrack.model';
import { Student } from '../models/Student.model';
import { StudentPlanProgress } from '../models/StudentPlanProgress.model';
import { Teacher } from '../models/Teacher.model';
import { User } from '../models/User.model';

const MODELS: mongoose.Model<any>[] = [
  Attendance, Evaluation, GroupHomework, Halqa, HifzEntry, Homework,
  IndividualPlan, KPI, LessonRecording, Masjid, Message, ParentStudent,
  QuranPlan, SpecialTrack, Student, StudentPlanProgress, Teacher, User,
];

async function wipeAll(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB:', ENV.MONGO_URI);

  for (const m of MODELS) {
    const { deletedCount } = await m.deleteMany({});
    console.log(`🗑️   ${m.modelName}: ${deletedCount} deleted`);
  }

  await mongoose.disconnect();
  console.log('✅  Wipe complete — database disconnected');
}

wipeAll().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
