import { AsyncLocalStorage } from 'node:async_hooks';
import { Schema, Types, type Query, type Aggregate } from 'mongoose';

/**
 * Multi-tenancy (SaaS) — one shared database, every tenant-owned document
 * carries a `tenant` ObjectId.
 *
 * The current request's tenant lives in AsyncLocalStorage (set by
 * `authenticate`), and `tenantPlugin` — applied to every tenant-owned schema —
 * reads it to:
 *   - add `{ tenant }` to every query filter (find/update/delete/count/distinct)
 *   - prepend `{ $match: { tenant } }` to every aggregate
 *   - stamp `tenant` on every new document (save / insertMany / bulkWrite inserts)
 *   - scope bulkWrite update/delete filters
 *
 * Outside a tenant context (login, signup, seed scripts) nothing is filtered,
 * so cross-tenant code paths must stay deliberate and few.
 */

type TenantStore = { tenantId: Types.ObjectId };

const storage = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(tenantId: string | Types.ObjectId, fn: () => T): T {
  return storage.run({ tenantId: new Types.ObjectId(String(tenantId)) }, fn);
}

export function currentTenantId(): Types.ObjectId | undefined {
  return storage.getStore()?.tenantId;
}

const QUERY_HOOKS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
] as const;

type BulkOp = Record<string, { filter?: Record<string, unknown>; document?: Record<string, unknown> }>;

export function tenantPlugin(schema: Schema): void {
  schema.add({ tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true } });

  for (const hook of QUERY_HOOKS) {
    schema.pre(hook, function (this: Query<unknown, unknown>) {
      const tenantId = currentTenantId();
      if (tenantId) this.where({ tenant: tenantId });
    });
  }

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    const tenantId = currentTenantId();
    if (tenantId) this.pipeline().unshift({ $match: { tenant: tenantId } });
  });

  schema.pre('save', function () {
    const tenantId = currentTenantId();
    if (this.isNew && tenantId && !this.get('tenant')) this.set('tenant', tenantId);
  });

  schema.pre('insertMany', function (next: () => void, docs: unknown) {
    const tenantId = currentTenantId();
    if (tenantId) {
      for (const d of (Array.isArray(docs) ? docs : [docs]) as Record<string, unknown>[]) {
        if (d && !d.tenant) d.tenant = tenantId;
      }
    }
    next();
  });

  schema.pre('bulkWrite', function (next: () => void, ops: BulkOp[]) {
    const tenantId = currentTenantId();
    if (tenantId) {
      for (const op of ops) {
        const [kind] = Object.keys(op);
        const body = op[kind];
        if (kind === 'insertOne' && body.document) body.document.tenant ??= tenantId;
        else if (body.filter) body.filter.tenant = tenantId;
      }
    }
    next();
  });
}
