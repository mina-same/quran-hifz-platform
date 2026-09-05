import { Schema, model, Document, Types } from 'mongoose';

/** Legacy fixed-shape scores. Still written whenever the plan's rubric uses
 *  the four original keys, so existing reports and CSV exports keep working. */
export interface IEvaluationScores {
  attendance: number;
  hifz: number;
  tajweed: number;
  talawah: number;
}

/**
 * One graded line, SNAPSHOTTED at save time. `label` and `max` are copied from
 * the plan's rubric rather than referenced, so editing a plan's rubric later
 * never retroactively rewrites what an old evaluation was scored out of.
 */
export interface IEvaluationCriterion {
  key: string;
  label: string;
  max: number;
  value: number;
}

export interface IEvaluation extends Document {
  student: Types.ObjectId;
  teacher: Types.ObjectId;
  track: Types.ObjectId;
  /** Which plan's rubric graded this record, when one could be resolved. */
  plan?: Types.ObjectId;
  date: Date;
  attendanceStatus: 'حاضر' | 'غائب';
  /** Source of truth for grading. Mirrors the plan's rubric at save time. */
  criteria: IEvaluationCriterion[];
  /** Legacy mirror — present only when the rubric uses the four original keys. */
  scores?: IEvaluationScores;
  total: number;
  /** Sum of criteria[].max — the denominator this record was graded against. */
  totalMax: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const criterionSchema = new Schema<IEvaluationCriterion>(
  {
    key:   { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    max:   { type: Number, required: true, min: 1 },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const evaluationSchema = new Schema<IEvaluation>(
  {
    student:      { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher:      { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    track:        { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    plan:         { type: Schema.Types.ObjectId, ref: 'QuranPlan' },
    date:             { type: Date, required: true },
    attendanceStatus: { type: String, enum: ['حاضر', 'غائب'], required: true },
    criteria: {
      type: [criterionSchema],
      required: true,
      validate: {
        validator: (v: IEvaluationCriterion[]) => v.length > 0,
        message: 'يجب أن يحتوي التقييم على بند واحد على الأقل',
      },
    },
    // Legacy mirror. No per-field max here any more — the rubric is per plan,
    // so the authoritative bound lives in criteria[].max.
    scores: {
      type: new Schema<IEvaluationScores>(
        {
          attendance: { type: Number, min: 0 },
          hifz:       { type: Number, min: 0 },
          tajweed:    { type: Number, min: 0 },
          talawah:    { type: Number, min: 0 },
        },
        { _id: false },
      ),
      required: false,
    },
    total:    { type: Number, required: true, min: 0 },
    totalMax: { type: Number, required: true, min: 1 },
    note:  { type: String, trim: true },
  },
  { timestamps: true },
);

evaluationSchema.index({ student: 1, date: -1 });
evaluationSchema.index({ track: 1, date: -1 });

export const Evaluation = model<IEvaluation>('Evaluation', evaluationSchema);
