import { Schema, model, Document, Types } from 'mongoose';

export type StudentOccurrenceStatus = 'pending' | 'done' | 'partial' | 'absent';

export interface IStudentOccurrence {
  occurrenceIndex: number;
  date: Date;

  // Frozen original slice from the shared plan at the time this student's
  // overlay was created — never mutated by reflow or manual edits, kept only
  // so the UI can show "الأصلي" (original) vs "الحالي" (current) for comparison.
  baseSurahStart: number;
  baseAyahStart: number;
  baseSurahEnd: number;
  baseAyahEnd: number;
  basePageStart: number;
  basePageEnd: number;
  baseJuz: number;

  // Current effective slice — mutated by reflowStudentPlan() and by manual
  // per-student schedule edits.
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
  pageStart: number;
  pageEnd: number;
  juz: number;

  status: StudentOccurrenceStatus;
  completedThroughPage?: number;
  // Once true, reflowStudentPlan() excludes this occurrence from the
  // redistribution pool entirely — a teacher's hand-edit is never silently
  // overwritten by a later absence/shortfall.
  manualOverride: boolean;
  carryOverNote?: string;
}

export interface IStudentPlanProgress extends Document {
  plan: Types.ObjectId;
  student: Types.ObjectId;
  occurrences: IStudentOccurrence[];
  // Pages with nowhere left to go once the redistribution pool is exhausted —
  // surfaced to the teacher rather than silently invented into a new day.
  overflowPages: number;
  lastReflowedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentOccurrenceSchema = new Schema<IStudentOccurrence>(
  {
    occurrenceIndex: { type: Number, required: true },
    date:            { type: Date, required: true },

    baseSurahStart: { type: Number, required: true },
    baseAyahStart:  { type: Number, required: true },
    baseSurahEnd:   { type: Number, required: true },
    baseAyahEnd:    { type: Number, required: true },
    basePageStart:  { type: Number, required: true },
    basePageEnd:    { type: Number, required: true },
    baseJuz:        { type: Number, required: true },

    surahStart: { type: Number, required: true },
    ayahStart:  { type: Number, required: true },
    surahEnd:   { type: Number, required: true },
    ayahEnd:    { type: Number, required: true },
    pageStart:  { type: Number, required: true },
    pageEnd:    { type: Number, required: true },
    juz:        { type: Number, required: true },

    status:                { type: String, enum: ['pending', 'done', 'partial', 'absent'], default: 'pending' },
    completedThroughPage:  { type: Number },
    manualOverride:        { type: Boolean, default: false },
    carryOverNote:         { type: String },
  },
  { _id: false },
);

const studentPlanProgressSchema = new Schema<IStudentPlanProgress>(
  {
    plan:          { type: Schema.Types.ObjectId, ref: 'QuranPlan', required: true },
    student:       { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    occurrences:   { type: [studentOccurrenceSchema], default: [] },
    overflowPages: { type: Number, default: 0 },
    lastReflowedAt: { type: Date },
  },
  { timestamps: true },
);

studentPlanProgressSchema.index({ plan: 1, student: 1 }, { unique: true });

export const StudentPlanProgress = model<IStudentPlanProgress>('StudentPlanProgress', studentPlanProgressSchema);
