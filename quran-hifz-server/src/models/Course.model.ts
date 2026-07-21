import { Schema, model, Document, Types } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  type: 'boys' | 'girls';
  masjid: Types.ObjectId;
  plan?: string;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name:   { type: String, required: true, trim: true },
    type:   { type: String, enum: ['boys', 'girls'], required: true },
    masjid: { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
    plan:   { type: String, trim: true },
  },
  { timestamps: true },
);

export const Course = model<ICourse>('Course', courseSchema);
