import { Schema, model, Document, Types } from 'mongoose';

/**
 * One re-save of a student's day that changed something (attendance and/or
 * grades) — «سجل تعديل الدرجات». Written by bulkEvaluate; read by the admin /
 * supervisor. Names are snapshotted so the log reads the same later.
 */
export interface IEvaluationChange extends Document {
  track: Types.ObjectId;
  trackTitle: string;
  student: Types.ObjectId;
  studentName: string;
  /** The evaluation's day (UTC midnight, like Evaluation.date). */
  date: Date;
  editedBy: Types.ObjectId;
  editedByName: string;
  editedByRole: string;
  changes: { label: string; from: string; to: string }[];
  createdAt: Date;
}

const evaluationChangeSchema = new Schema<IEvaluationChange>(
  {
    track:        { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    trackTitle:   { type: String, default: '' },
    student:      { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName:  { type: String, default: '' },
    date:         { type: Date, required: true },
    editedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editedByName: { type: String, default: '' },
    editedByRole: { type: String, default: '' },
    changes: [{ _id: false, label: String, from: String, to: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

evaluationChangeSchema.index({ createdAt: -1 });
evaluationChangeSchema.index({ track: 1, date: 1 });

export const EvaluationChange = model<IEvaluationChange>('EvaluationChange', evaluationChangeSchema);
