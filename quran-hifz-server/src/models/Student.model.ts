import { Schema, model, Document, Types } from 'mongoose';

/**
 * Saudi national ID (رقم الهوية الوطنية): exactly 10 digits from الأحوال المدنية.
 * The leading digit encodes the holder's class — 1 = citizen (مواطن),
 * 2 = resident (مقيم) — so anything else is a typo, not a valid ID.
 */
export const NATIONAL_ID_RE = /^[12][0-9]{9}$/;

export interface IStudent extends Document {
  name: string;
  /** Optional: existing students predate the field, and not every record has one. */
  nationalId?: string;
  path?: string;
  level?: number;
  plan?: string;
  track: Types.ObjectId;
  attendancePct: number;
  progressPct: number;
  progressPages: number;
  totalPages: number;
  guardian: string;
  guardianPhone: string;
  lastMemorization: string;
  status: 'active' | 'inactive' | 'new';
  homeworkStatus: 'submitted' | 'pending' | 'late';
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    name:             { type: String, required: true, trim: true },
    nationalId:       {
      type: String,
      trim: true,
      match: [NATIONAL_ID_RE, 'رقم الهوية يجب أن يكون ١٠ أرقام ويبدأ بـ ١ أو ٢'],
    },
    path:             { type: String, enum: ['حفظ كامل', 'عشرون جزءاً', 'عشرة أجزاء', 'خمسة أجزاء'] },
    level:            { type: Number, min: 1, max: 10 },
    plan:             { type: String, trim: true },
    track:            { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    attendancePct:    { type: Number, default: 0, min: 0, max: 100 },
    progressPct:      { type: Number, default: 0, min: 0, max: 100 },
    progressPages:    { type: Number, default: 0, min: 0 },
    totalPages:       { type: Number, default: 604, min: 1 },
    guardian:         { type: String, trim: true, default: '' },
    guardianPhone:    { type: String, trim: true, default: '' },
    lastMemorization: { type: String, default: '' },
    status:           { type: String, enum: ['active', 'inactive', 'new'], default: 'new' },
    homeworkStatus:   { type: String, enum: ['submitted', 'pending', 'late'], default: 'pending' },
  },
  { timestamps: true },
);

// Sparse so the many students without an ID don't collide on `null`, unique so
// the same identity can't be registered twice.
studentSchema.index({ nationalId: 1 }, { unique: true, sparse: true });
studentSchema.index({ track: 1 });
studentSchema.index({ status: 1 });

export const Student = model<IStudent>('Student', studentSchema);
