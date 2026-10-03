/**
 * Create (or reset the password of) a platform super admin.
 *
 *   npm run create-super-admin -- <email> "<name>" <password>
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { PlatformAdmin } from '../models/PlatformAdmin.model';

async function main(): Promise<void> {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password || password.length < 8) {
    console.error('usage: create-super-admin <email> "<name>" <password (8+ chars)>');
    process.exit(1);
  }
  await mongoose.connect(ENV.MONGO_URI);
  const existing = await PlatformAdmin.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.name = name;
    existing.password = password;
    existing.isActive = true;
    await existing.save();
    console.log(`updated super admin ${email}`);
  } else {
    await PlatformAdmin.create({ email, name, password });
    console.log(`created super admin ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
