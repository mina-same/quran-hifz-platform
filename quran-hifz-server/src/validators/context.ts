import { RefinementCtx, ZodIssueCode } from 'zod';
import { Schema } from 'mongoose';

export const CONTEXT_ERROR = 'يجب تحديد إما حلقة أو مسار استثنائي، وليس كلاهما ولا أي منهما';

export function hasExactlyOneContext(halqa: unknown, specialTrack: unknown): boolean {
  return Boolean(halqa) !== Boolean(specialTrack);
}

export function contextRefinement(
  data: { halqa?: string; specialTrack?: string },
  ctx: RefinementCtx,
): void {
  if (!hasExactlyOneContext(data.halqa, data.specialTrack)) {
    ctx.addIssue({ code: ZodIssueCode.custom, message: CONTEXT_ERROR, path: ['halqa'] });
  }
}

export function applyContextValidation(schema: Schema): void {
  schema.pre('validate', function (next) {
    if (!hasExactlyOneContext(this.get('halqa'), this.get('specialTrack'))) {
      next(new Error(CONTEXT_ERROR));
      return;
    }
    next();
  });
}
