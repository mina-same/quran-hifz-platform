import { Schema, model, Document } from 'mongoose';

export interface ILessonRecording extends Document {
  student: Schema.Types.ObjectId;
  teacher: Schema.Types.ObjectId;
  halqa: Schema.Types.ObjectId;
  type: string;
  segment: string;
  points: number;
  teacherNote?: string;
  audioUrl?: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lessonRecordingSchema = new Schema<ILessonRecording>(
  {
    student:     { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    halqa:       { type: Schema.Types.ObjectId, ref: 'Halqa', required: true },
    type:        { type: String, required: true },
    segment:     { type: String, required: true },
    points:      { type: Number, default: 0 },
    teacherNote: { type: String },
    audioUrl:    { type: String },
    recordedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const LessonRecording = model<ILessonRecording>('LessonRecording', lessonRecordingSchema);
