import { Schema, model, Document } from 'mongoose';

export interface IKPI extends Document {
  indicator: string;
  target: string;
  actual: string;
  rating: 'ممتاز' | 'جيد' | 'مقبول' | 'ضعيف';
  period: string;
  createdAt: Date;
  updatedAt: Date;
}

const kpiSchema = new Schema<IKPI>(
  {
    indicator: { type: String, required: true, trim: true },
    target:    { type: String, required: true },
    actual:    { type: String, required: true },
    rating:    { type: String, enum: ['ممتاز', 'جيد', 'مقبول', 'ضعيف'], required: true },
    period:    { type: String, default: 'الفصل الدراسي الحالي' },
  },
  { timestamps: true },
);

export const KPI = model<IKPI>('KPI', kpiSchema);
