import dotenv from 'dotenv';

// Optional per-machine overrides for this branch (git-ignored).
dotenv.config({ path: '.env.saas' });
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

/**
 * quran-hifz-sass: the multi-tenant code must NEVER touch main's
 * single-tenant production database. That database is `.env`'s MONGO_URI —
 * so this branch ignores MONGO_URI entirely and reads SAAS_MONGO_URI, which
 * defaults to a local database. Every connection (server + all seed/CLI
 * scripts) goes through ENV.MONGO_URI below, so this is the single gate.
 */
const SAAS_DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/quran_hifz_saas';
/** main's production database name — refuse it under any URI. */
const MAIN_DB_NAME = 'quran-hifz';

function dbNameOf(uri: string): string {
  const path = uri.replace(/^mongodb(\+srv)?:\/\/[^/]*/, '').replace(/^\//, '');
  return decodeURIComponent(path.split('?')[0] ?? '');
}

function resolveSaasMongoUri(): string {
  const uri = process.env.SAAS_MONGO_URI || SAAS_DEFAULT_MONGO_URI;
  const mainUri = process.env.MONGO_URI;
  const reason =
    mainUri && uri === mainUri ? 'SAAS_MONGO_URI is the same as main\'s MONGO_URI'
    : dbNameOf(uri) === MAIN_DB_NAME ? `the database is named "${MAIN_DB_NAME}" (main's production database)`
    : null;
  if (reason) {
    throw new Error(
      `[quran-hifz-sass] Refusing to start: ${reason}. Set SAAS_MONGO_URI to a separate ` +
        `database (default: ${SAAS_DEFAULT_MONGO_URI}).`,
    );
  }
  return uri;
}

export const ENV = {
  NODE_ENV:       process.env.NODE_ENV ?? 'development',
  PORT:           parseInt(process.env.PORT ?? '5000', 10),
  /** The SaaS database — never main's MONGO_URI (see resolveSaasMongoUri). */
  MONGO_URI:      resolveSaasMongoUri(),
  JWT_SECRET:     required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CLIENT_URL:     process.env.CLIENT_URL ?? 'http://localhost:3000',
  /** SaaS: length of the free trial a new organisation gets on signup. */
  TRIAL_DAYS:     parseInt(process.env.TRIAL_DAYS ?? '7', 10),
  /** SaaS: sales WhatsApp number (digits only, international format). */
  SALES_WHATSAPP: process.env.SALES_WHATSAPP ?? '201273363970',
} as const;
