import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * SaaS platform owner ("super admin"). Deliberately NOT tenant-scoped and NOT
 * a User: it belongs to no organisation, signs in at /super, and its token
 * (scope 'platform') can never reach organisation data routes. Created only
 * from the CLI: `npm run create-super-admin`.
 */
export interface IPlatformAdmin extends Document {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  lastLoginAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const platformAdminSchema = new Schema<IPlatformAdmin>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

platformAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

platformAdminSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const PlatformAdmin = model<IPlatformAdmin>('PlatformAdmin', platformAdminSchema);
