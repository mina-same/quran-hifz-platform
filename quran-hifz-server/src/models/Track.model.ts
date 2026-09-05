import { Schema, model, Document } from 'mongoose';

export interface ITrack extends Document {
  masjid: Schema.Types.ObjectId;
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: Date;
  endDate: Date;
  daysPerWeek: string;
  timeSlot: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: Schema.Types.ObjectId[];
  maxStudents: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const trackSchema = new Schema<ITrack>(
  {
    masjid:           { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
    title:            { type: String, required: true, trim: true },
    type:             { type: String, required: true },
    status:           { type: String, enum: ['active', 'upcoming', 'ended'], default: 'upcoming' },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    daysPerWeek:      { type: String, required: true },
    timeSlot:         { type: String, required: true },
    isOnline:         { type: Boolean, default: false },
    meetLink:         { type: String },
    teachers:         [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    maxStudents:      { type: Number, required: true },
    notes:            { type: String },
  },
  { timestamps: true },
);

trackSchema.index({ masjid: 1 });

export const Track = model<ITrack>('Track', trackSchema);
