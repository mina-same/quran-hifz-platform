import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

export const ENV = {
  NODE_ENV:       process.env.NODE_ENV ?? 'development',
  PORT:           parseInt(process.env.PORT ?? '5000', 10),
  MONGO_URI:      required('MONGO_URI'),
  JWT_SECRET:     required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CLIENT_URL:     process.env.CLIENT_URL ?? 'http://localhost:3000',
  /** SaaS: length of the free trial a new organisation gets on signup. */
  TRIAL_DAYS:     parseInt(process.env.TRIAL_DAYS ?? '7', 10),
  /** SaaS: sales WhatsApp number (digits only, international format). */
  SALES_WHATSAPP: process.env.SALES_WHATSAPP ?? '201273363970',
} as const;
