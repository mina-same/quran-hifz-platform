import { Schema, model, Document } from 'mongoose';

export interface IMasjid extends Document {
  name: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const masjidSchema = new Schema<IMasjid>(
  {
    name:     { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const Masjid = model<IMasjid>('Masjid', masjidSchema);
