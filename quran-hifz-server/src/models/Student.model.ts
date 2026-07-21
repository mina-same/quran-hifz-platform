import { Schema, model, Document, Types } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  path?: string;
  level?: number;
  plan?: string;
  halqa: Types.ObjectId;
  masjid: Types.ObjectId;
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
    path:             { type: String, enum: ['حفظ كامل', 'عشرون جزءاً', 'عشرة أجزاء', 'خمسة أجزاء'] },
    level:            { type: Number, min: 1, max: 10 },
    plan:             { type: String, trim: true },
    halqa:            { type: Schema.Types.ObjectId, ref: 'Halqa',  required: true },
    masjid:           { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
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

studentSchema.index({ halqa: 1 });
studentSchema.index({ masjid: 1 });
studentSchema.index({ status: 1 });

export const Student = model<IStudent>('Student', studentSchema);
