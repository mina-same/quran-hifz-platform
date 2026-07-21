import { Schema, model, Document, Types } from 'mongoose';

export type PlanType = 'حفظ' | 'مراجعة' | 'ترتيل' | 'تلاوة';

export interface IPointRule {
  label: string;
  amount: number;
  kind: 'خصم' | 'زيادة';
}

export interface IRangePoint {
  surahNumber: number;
  ayah: number;
}

export interface IScheduleEntry {
  occurrenceIndex: number;
  date: Date;
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
  pageStart: number;
  pageEnd: number;
  juz: number;
}

export interface IQuranPlan extends Document {
  name: string;
  type: PlanType;
  description?: string;
  teacher: Types.ObjectId;

  targetType: 'halqa' | 'students' | 'specialTrack';
  halqa?: Types.ObjectId;
  students?: Types.ObjectId[];
  specialTrack?: Types.ObjectId;

  days: string[];
  startDate: Date;

  rangeStart: IRangePoint;
  rangeEnd: IRangePoint;

  pointsEnabled: boolean;
  pointRules: IPointRule[];

  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: Date;

  status: 'نشطة' | 'متوقفة' | 'منتهية';

  // Persisted day-by-day breakdown — normally computed live from the fields
  // above (see quranRange.ts's computeScheduleBreakdown), so this starts empty.
  // The plan's own teacher can freeze the live computation into this array
  // (POST /quran-plans/:id/schedule/generate) once they want to hand-edit
  // individual days without those edits being wiped by every recompute.
  schedule: IScheduleEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const pointRuleSchema = new Schema<IPointRule>(
  {
    label:  { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    kind:   { type: String, enum: ['خصم', 'زيادة'], required: true },
  },
  { _id: false },
);

const rangePointSchema = new Schema<IRangePoint>(
  {
    surahNumber: { type: Number, required: true, min: 1, max: 114 },
    ayah:        { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const scheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    occurrenceIndex: { type: Number, required: true },
    date:            { type: Date, required: true },
    surahStart:      { type: Number, required: true },
    ayahStart:       { type: Number, required: true },
    surahEnd:        { type: Number, required: true },
    ayahEnd:         { type: Number, required: true },
    pageStart:       { type: Number, required: true },
    pageEnd:         { type: Number, required: true },
    juz:             { type: Number, required: true },
  },
  { _id: false },
);

const quranPlanSchema = new Schema<IQuranPlan>(
  {
    name:        { type: String, required: true, trim: true },
    type:        { type: String, enum: ['حفظ', 'مراجعة', 'ترتيل', 'تلاوة'], required: true },
    description: { type: String, trim: true },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },

    targetType:   { type: String, enum: ['halqa', 'students', 'specialTrack'], required: true },
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    students:     [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },

    days:      {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length > 0, 'يجب اختيار يوم واحد على الأقل'],
    },
    startDate: { type: Date, required: true, default: Date.now },

    rangeStart: { type: rangePointSchema, required: true },
    rangeEnd:   { type: rangePointSchema, required: true },

    pointsEnabled: { type: Boolean, default: false },
    pointRules:    { type: [pointRuleSchema], default: [] },

    endType:         { type: String, enum: ['activeDays', 'date'], required: true },
    activeDaysCount: { type: Number, min: 1 },
    endDate:         { type: Date },

    status: { type: String, enum: ['نشطة', 'متوقفة', 'منتهية'], default: 'نشطة' },

    schedule: { type: [scheduleEntrySchema], default: [] },
  },
  { timestamps: true },
);

quranPlanSchema.index({ teacher: 1 });
quranPlanSchema.index({ halqa: 1 });
quranPlanSchema.index({ specialTrack: 1 });

export const QuranPlan = model<IQuranPlan>('QuranPlan', quranPlanSchema);
