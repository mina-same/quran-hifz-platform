import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profileId?: Schema.Types.ObjectId;  // ref to Student / Teacher doc
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 6, select: false },
    role:      { type: String, enum: ['admin', 'teacher', 'student', 'parent'], required: true },
    profileId: { type: Schema.Types.ObjectId, refPath: 'roleModel' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>('User', userSchema);
