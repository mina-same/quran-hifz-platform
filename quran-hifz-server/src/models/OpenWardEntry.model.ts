import { Schema, model, Document, Types } from 'mongoose';

export type OpenWardType = 'حفظ' | 'مراجعة';
export type OpenWardStatus = 'recorded' | 'none';

export interface IOpenWardPoint { surahNumber: number; ayah: number }

/**
 * What a student actually memorized on one day of an open-ward plan
 * (QuranPlan.openWard). One document per (plan, student, type, date); re-saving
 * the day overwrites it. `status: 'none'` is the teacher's explicit
 * «لم يُسمِّع اليوم» — distinct from "not recorded yet" (no document).
 */
export interface IOpenWardEntry extends Document {
  plan: Types.ObjectId;
  student: Types.ObjectId;
  type: OpenWardType;
  /** Calendar day YYYY-MM-DD — a string for the same reason as QuranPlan.holidays. */
  date: string;
  status: OpenWardStatus;
  from?: IOpenWardPoint;
  to?: IOpenWardPoint;
  pageStart?: number;
  pageEnd?: number;
  pages?: number;
  ayahs?: number;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema<IOpenWardPoint>(
  {
    surahNumber: { type: Number, required: true, min: 1, max: 114 },
    ayah:        { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const openWardEntrySchema = new Schema<IOpenWardEntry>(
  {
    plan:       { type: Schema.Types.ObjectId, ref: 'QuranPlan', required: true },
    student:    { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    type:       { type: String, enum: ['حفظ', 'مراجعة'], required: true },
    date:       { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status:     { type: String, enum: ['recorded', 'none'], required: true },
    from:       { type: pointSchema },
    to:         { type: pointSchema },
    pageStart:  { type: Number },
    pageEnd:    { type: Number },
    pages:      { type: Number },
    ayahs:      { type: Number },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

openWardEntrySchema.index({ plan: 1, student: 1, type: 1, date: 1 }, { unique: true });
openWardEntrySchema.index({ student: 1, date: -1 });

export const OpenWardEntry = model<IOpenWardEntry>('OpenWardEntry', openWardEntrySchema);
