import { Schema, model, Document, Types } from 'mongoose';

export interface IHifzEntry extends Document {
  student: Types.ObjectId;
  surah: string;
  surahNumber: number;
  status: 'مكتمل' | 'جارٍ' | 'لم يبدأ';
  completionDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hifzEntrySchema = new Schema<IHifzEntry>(
  {
    student:        { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    surah:          { type: String, required: true, trim: true },
    surahNumber:    { type: Number, required: true, min: 1, max: 114 },
    status:         { type: String, enum: ['مكتمل', 'جارٍ', 'لم يبدأ'], default: 'لم يبدأ' },
    completionDate: { type: Date },
    notes:          { type: String, trim: true },
  },
  { timestamps: true },
);

hifzEntrySchema.index({ student: 1, surahNumber: 1 }, { unique: true });

export const HifzEntry = model<IHifzEntry>('HifzEntry', hifzEntrySchema);
