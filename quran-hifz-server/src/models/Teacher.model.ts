import { Schema, model, Document } from 'mongoose';

export interface ITeacher extends Document {
  name: string;
  specialty: string;
  phone?: string;
  rating: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    name:      { type: String, required: true, trim: true },
    specialty: { type: String, default: 'تحفيظ القرآن الكريم' },
    phone:     { type: String, trim: true },
    rating:    { type: String, default: '٤.٨ / ٥' },
    status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

teacherSchema.virtual('halqatCount', {
  ref: 'Halqa',
  localField: '_id',
  foreignField: 'teacher',
  count: true,
});

teacherSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'halqa.teacher',
  count: true,
});

export const Teacher = model<ITeacher>('Teacher', teacherSchema);
