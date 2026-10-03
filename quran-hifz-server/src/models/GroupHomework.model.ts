import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../lib/tenancy';

export interface IGroupHomework extends Document {
  track: Schema.Types.ObjectId;
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
    track:       { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDay:      { type: String, required: true },
    dueDate:     { type: Date, required: true },
  },
  { timestamps: true },
);

groupHomeworkSchema.index({ track: 1, dueDate: -1 });

groupHomeworkSchema.plugin(tenantPlugin);

export const GroupHomework = model<IGroupHomework>('GroupHomework', groupHomeworkSchema);
