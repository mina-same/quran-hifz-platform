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
  },
  { timestamps: true },
);

quranPlanSchema.index({ teacher: 1 });
quranPlanSchema.index({ halqa: 1 });
quranPlanSchema.index({ specialTrack: 1 });

export const QuranPlan = model<IQuranPlan>('QuranPlan', quranPlanSchema);
