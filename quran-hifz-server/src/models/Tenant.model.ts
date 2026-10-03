import { Schema, model, Document } from 'mongoose';

export type TenantOrgType = 'association' | 'masjid' | 'school' | 'center' | 'individual';
export type TenantStatus  = 'trial' | 'active' | 'suspended';

/** Slugs that would collide with app routes (/signup, /api, …). */
export const RESERVED_SLUGS = new Set([
  'api', 'admin', 'app', 'signup', 'login', 'register', 'www', 'static', 'assets',
  'quran', 'blog', 'brand', 'sitemap.xml', 'help', 'support', 'pricing', 'about', 'contact', 'sitemap', 'robots',
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/**
 * A SaaS customer (one organisation). Not tenant-scoped itself — every other
 * collection points at it through the `tenant` field added by tenantPlugin.
 */
export interface ITenant extends Document {
  name: string;
  slug: string;
  orgType: TenantOrgType;
  ownerName: string;
  email: string;
  phone: string;
  country: string;
  city?: string;
  expectedStudents?: number;
  status: TenantStatus;
  trialEndsAt: Date;
  /** Only meaningful when status === 'active' — set by sales after payment. */
  paidUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name:      { type: String, required: true, trim: true },
    slug:      { type: String, required: true, unique: true, lowercase: true, trim: true, match: SLUG_PATTERN },
    orgType:   { type: String, enum: ['association', 'masjid', 'school', 'center', 'individual'], required: true },
    ownerName: { type: String, required: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    country:   { type: String, required: true, trim: true },
    city:      { type: String, trim: true },
    expectedStudents: { type: Number, min: 0 },
    status:      { type: String, enum: ['trial', 'active', 'suspended'], default: 'trial' },
    trialEndsAt: { type: Date, required: true },
    paidUntil:   { type: Date },
  },
  { timestamps: true },
);

/** Whether the tenant may use the platform right now. */
export function tenantHasAccess(t: Pick<ITenant, 'status' | 'trialEndsAt' | 'paidUntil'>, now = new Date()): boolean {
  if (t.status === 'suspended') return false;
  if (t.status === 'active') return !t.paidUntil || t.paidUntil > now;
  return t.trialEndsAt > now;
}

export const Tenant = model<ITenant>('Tenant', tenantSchema);
