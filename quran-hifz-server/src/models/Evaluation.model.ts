import { Schema, model, Document, Types } from 'mongoose';
import { applyContextValidation } from '../validators/context';

export interface IEvaluationScores {
  attendance: number;
  hifz: number;
  tajweed: number;
  talawah: number;
}

export interface IEvaluation extends Document {
  student: Types.ObjectId;
  teacher: Types.ObjectId;
  halqa?: Types.ObjectId;
  specialTrack?: Types.ObjectId;
  date: Date;
  attendanceStatus: 'حاضر' | 'غائب';
  scores: IEvaluationScores;
  total: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const evaluationSchema = new Schema<IEvaluation>(
  {
    student:      { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher:      { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
    date:             { type: Date, required: true },
    attendanceStatus: { type: String, enum: ['حاضر', 'غائب'], required: true },
    scores: {
      attendance: { type: Number, required: true, min: 0, max: 3 },
      hifz:       { type: Number, required: true, min: 0, max: 4 },
      tajweed:    { type: Number, required: true, min: 0, max: 2 },
      talawah:    { type: Number, required: true, min: 0, max: 1 },
    },
    total: { type: Number, required: true, min: 0, max: 10 },
    note:  { type: String, trim: true },
  },
  { timestamps: true },
);

evaluationSchema.index({ student: 1, date: -1 });
evaluationSchema.index({ halqa: 1, date: -1 });
evaluationSchema.index({ specialTrack: 1, date: -1 });
applyContextValidation(evaluationSchema);

export const Evaluation = model<IEvaluation>('Evaluation', evaluationSchema);
