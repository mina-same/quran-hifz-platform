/**
 * One-off: rewrite every user's email domain to a new one, keeping the
 * local-part unchanged. Run:  npm run rename-email-domain
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';

const NEW_DOMAIN = 'Tahfeez.com';

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const users = await User.find().select('email');
  let changed = 0;
  for (const u of users) {
    const local = u.email.split('@')[0];
    const next = `${local}@${NEW_DOMAIN}`;
    if (next !== u.email) {
      u.email = next;
      await u.save({ validateBeforeSave: false }); // skip password re-hash / validators
      changed++;
    }
  }

  console.log(`✉️   Rewrote ${changed}/${users.length} emails → @${NEW_DOMAIN}`);
  await mongoose.disconnect();
  console.log('✅  Done — database disconnected');
}
run().catch((e) => { console.error(e); process.exit(1); });
