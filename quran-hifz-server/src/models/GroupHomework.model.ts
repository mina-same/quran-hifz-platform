import { Schema, model, Document } from 'mongoose';

export interface IGroupHomework extends Document {
  halqa: Schema.Types.ObjectId;
  teacher: Schema.Types.ObjectId;
  title: string;
  description: string;
  dueDay: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const groupHomeworkSchema = new Schema<IGroupHomework>(
  {
    halqa:       { type: Schema.Types.ObjectId, ref: 'Halqa', required: true },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDay:      { type: String, required: true },
    dueDate:     { type: Date, required: true },
  },
  { timestamps: true },
);

export const GroupHomework = model<IGroupHomework>('GroupHomework', groupHomeworkSchema);
