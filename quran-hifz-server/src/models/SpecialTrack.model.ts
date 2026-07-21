import { Schema, model, Document } from 'mongoose';

export interface ISpecialTrack extends Document {
  title: string;
  type: string;
  status: 'active' | 'upcoming' | 'ended';
  startDate: Date;
  endDate: Date;
  daysPerWeek: string;
  timeSlot: string;
  location: string;
  isOnline: boolean;
  meetLink?: string;
  teachers: Schema.Types.ObjectId[];
  maxStudents: number;
  enrolledStudents: Schema.Types.ObjectId[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const specialTrackSchema = new Schema<ISpecialTrack>(
  {
    title:            { type: String, required: true, trim: true },
    type:             { type: String, required: true },
    status:           { type: String, enum: ['active', 'upcoming', 'ended'], default: 'upcoming' },
    startDate:        { type: Date, required: true },
    endDate:          { type: Date, required: true },
    daysPerWeek:      { type: String, required: true },
    timeSlot:         { type: String, required: true },
    location:         { type: String, required: true },
    isOnline:         { type: Boolean, default: false },
    meetLink:         { type: String },
    teachers:         [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    maxStudents:      { type: Number, required: true },
    enrolledStudents: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    notes:            { type: String },
  },
  { timestamps: true },
);

export const SpecialTrack = model<ISpecialTrack>('SpecialTrack', specialTrackSchema);
