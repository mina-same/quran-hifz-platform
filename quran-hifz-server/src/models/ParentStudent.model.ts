import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../lib/tenancy';

export interface IParentStudent extends Document {
  parent: Schema.Types.ObjectId;
  student: Schema.Types.ObjectId;
  createdAt: Date;
}

const parentStudentSchema = new Schema<IParentStudent>(
  {
    parent:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  },
  { timestamps: true },
);

parentStudentSchema.index({ parent: 1, student: 1 }, { unique: true });

parentStudentSchema.plugin(tenantPlugin);

export const ParentStudent = model<IParentStudent>('ParentStudent', parentStudentSchema);
