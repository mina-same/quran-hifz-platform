import { Schema, model, Document } from 'mongoose';

export type MasjidGender = 'male' | 'female';

export interface IMasjid extends Document {
  name: string;
  location: string;
  /** Drives the جامع (male) / دار (female) display label on the client —
   * the server stores and returns the raw value only. */
  gender: MasjidGender;
  createdAt: Date;
  updatedAt: Date;
}

const masjidSchema = new Schema<IMasjid>(
  {
    name:     { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    gender:   { type: String, enum: ['male', 'female'], required: true },
  },
  { timestamps: true },
);

export const Masjid = model<IMasjid>('Masjid', masjidSchema);
