import { Schema, model, Document, Types } from 'mongoose';

export interface IHomework extends Document {
  student: Types.ObjectId;
  teacher: Types.ObjectId;
  halqa: Types.ObjectId;
  type: string;
  segment: string;
  dueDate: Date;
  submittedAt?: Date;
  status: 'مراجع' | 'معلق' | 'متأخر';
  rating?: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const homeworkSchema = new Schema<IHomework>(
  {
    student:     { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    halqa:       { type: Schema.Types.ObjectId, ref: 'Halqa',   required: true },
    type:        { type: String, required: true },
    segment:     { type: String, required: true },
    dueDate:     { type: Date, required: true },
    submittedAt: { type: Date },
    status:      { type: String, enum: ['مراجع', 'معلق', 'متأخر'], default: 'معلق' },
    rating:      { type: String, enum: ['ممتاز', 'جيد جداً', 'جيد', 'مقبول'] },
    notes:       { type: String, trim: true },
  },
  { timestamps: true },
);

homeworkSchema.index({ student: 1, dueDate: -1 });
homeworkSchema.index({ teacher: 1, status: 1 });

export const Homework = model<IHomework>('Homework', homeworkSchema);
