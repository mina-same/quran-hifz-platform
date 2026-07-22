import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { ENV } from '../config/env';
import { User } from '../models/User.model';

// Default seed passwords by role (import-real-halaqat.ts + ensure-admin.ts).
// Passwords are bcrypt-hashed in the DB, so they can't be read back — these
// are the known plaintext defaults the seeds set.
const ROLE_PASSWORD: Record<string, string> = {
  admin:   'admin@123',
  teacher: 'teacher@123',
  student: 'student@123',
  parent:  'parent123',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'المدير (Admin)', teacher: 'المعلمون (Teachers)',
  student: 'الطلاب (Students)', parent: 'أولياء الأمور (Parents)',
};
const ROLE_ORDER = ['admin', 'teacher', 'student', 'parent'];

async function run(): Promise<void> {
  await mongoose.connect(ENV.MONGO_URI);
  const users = await User.find().select('name email role').sort({ role: 1, email: 1 }).lean();

  let md = `# حسابات المنصة (Platform Accounts)\n\n`;
  md += `> مُولَّد من قاعدة البيانات الحيّة. كلمات المرور مُشفّرة في القاعدة؛ القيم أدناه هي كلمات المرور الافتراضية التي تضبطها سكربتات البذر.\n\n`;
  md += `**عدد الحسابات: ${users.length}**\n\n`;

  for (const role of ROLE_ORDER) {
    const rows = users.filter((u) => u.role === role);
    if (!rows.length) continue;
    md += `## ${ROLE_LABEL[role] ?? role} — ${rows.length}\n\n`;
    md += `كلمة المرور: \`${ROLE_PASSWORD[role] ?? '—'}\`\n\n`;
    md += `| # | الاسم | البريد الإلكتروني |\n|---|------|------------------|\n`;
    rows.forEach((u, i) => {
      md += `| ${i + 1} | ${u.name} | ${u.email} |\n`;
    });
    md += `\n`;
  }

  const out = path.resolve(__dirname, '../../../ACCOUNTS.md');
  fs.writeFileSync(out, md, 'utf-8');
  console.log(`✅  Wrote ${users.length} accounts → ${out}`);
  await mongoose.disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
