import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../lib/tenancy';

export interface IIndividualPlan extends Document {
  student: Types.ObjectId;
  teacher: Types.ObjectId;
  annualTarget: number;
  completed: number;
  status: 'متقدم' | 'في الموعد' | 'متأخر';
  academicYear: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IIndividualPlan>(
  {
    student:      { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    teacher:      { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    annualTarget: { type: Number, required: true, min: 1 },
    completed:    { type: Number, default: 0, min: 0 },
    status:       { type: String, enum: ['متقدم', 'في الموعد', 'متأخر'], default: 'في الموعد' },
    academicYear: { type: String, required: true },
    notes:        { type: String, trim: true },
  },
  { timestamps: true },
);

planSchema.index({ student: 1, academicYear: 1 }, { unique: true });

planSchema.plugin(tenantPlugin);

export const IndividualPlan = model<IIndividualPlan>('IndividualPlan', planSchema);
