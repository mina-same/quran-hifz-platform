/**
 * Idempotent admin bootstrap. Run:  npm run ensure-admin
 *
 * Creates the admin user if missing, or resets its password/role/isActive
 * if it already exists. Safe to run against a populated database — it only
 * touches the one admin account.
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';

const ADMIN = {
  name:     'مدير النظام',
  email:    'admin@rawad.com',
  password: 'admin@123',
};

async function ensureAdmin(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // Need +password so the pre-save hash hook fires on an existing doc too.
  let user = await User.findOne({ email: ADMIN.email }).select('+password');

  if (user) {
    user.name     = ADMIN.name;
    user.password = ADMIN.password; // re-assign so pre('save') re-hashes it
    user.role     = 'admin';
    user.isActive = true;
    await user.save();
    console.log(`♻️   Updated existing admin: ${ADMIN.email}`);
  } else {
    user = await new User({
      name:     ADMIN.name,
      email:    ADMIN.email,
      password: ADMIN.password,
      role:     'admin',
      isActive: true,
    }).save();
    console.log(`👤  Created admin: ${ADMIN.email}`);
  }

  await mongoose.disconnect();
  console.log(`🔑  Login → ${ADMIN.email} / ${ADMIN.password}`);
}

ensureAdmin().catch((err) => {
  console.error('ensure-admin failed:', err);
  process.exit(1);
});
