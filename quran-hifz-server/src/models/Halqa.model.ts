import { Schema, model, Document, Types } from 'mongoose';

export interface IHalqa extends Document {
  name: string;
  teacher: Types.ObjectId;
  masjid: Types.ObjectId;
  specialTrack?: Types.ObjectId;
  days: string;
  time: string;
  capacity: number;
  attendancePct: number;
  completionPct: number;
  createdAt: Date;
  updatedAt: Date;
}

const halqaSchema = new Schema<IHalqa>(
  {
    name:          { type: String, required: true, trim: true },
    teacher:       { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    masjid:        { type: Schema.Types.ObjectId, ref: 'Masjid',  required: true },
    specialTrack:  { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },
    days:          { type: String, required: true },
    time:          { type: String, required: true },
    capacity:      { type: Number, default: 15, min: 1 },
    attendancePct: { type: Number, default: 0, min: 0, max: 100 },
    completionPct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

halqaSchema.virtual('studentCount', {
  ref:        'Student',
  localField: '_id',
  foreignField: 'halqa',
  count:      true,
});

export const Halqa = model<IHalqa>('Halqa', halqaSchema);
