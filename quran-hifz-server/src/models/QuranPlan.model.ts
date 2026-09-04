import { Schema, model, Document, Types } from 'mongoose';

export type PlanType = 'حفظ' | 'مراجعة';
export const PLAN_TYPE_VALUES: PlanType[] = ['حفظ', 'مراجعة'];

export interface IPointRule {
  label: string;
  amount: number;
  kind: 'خصم' | 'زيادة';
}

/**
 * One line of a plan's daily grading rubric: what is graded and out of how
 * many degrees. Teachers compose these per plan; `DEFAULT_GRADE_RUBRIC` below
 * reproduces the split that used to be hard-coded platform-wide.
 *
 * `auto` marks a criterion the teacher never types — it is awarded in full
 * when the student is present and zeroed when absent (حضور). Every other
 * criterion is entered by hand and is also forced to 0 for an absent student.
 */
export interface IGradeCriterion {
  key: string;
  label: string;
  max: number;
  auto: boolean;
}

/** Every plan's rubric must add up to exactly this. Daily grades are compared
 *  across plans, halqas and reports, so a shared denominator is required. */
export const RUBRIC_TOTAL_DEGREES = 10;

/** The historical fixed rubric: حضور 3 + حفظ 4 + تجويد 2 + تلاوة 1 = 10. */
export const DEFAULT_GRADE_RUBRIC: IGradeCriterion[] = [
  { key: 'attendance', label: 'حضور',  max: 3, auto: true  },
  { key: 'hifz',       label: 'حفظ',   max: 4, auto: false },
  { key: 'tajweed',    label: 'تجويد', max: 2, auto: false },
  { key: 'talawah',    label: 'تلاوة', max: 1, auto: false },
];

export interface IRangePoint {
  surahNumber: number;
  ayah: number;
}

export interface IScheduleEntry {
  occurrenceIndex: number;
  date: Date;
  surahStart: number;
  ayahStart: number;
  surahEnd: number;
  ayahEnd: number;
  pageStart: number;
  pageEnd: number;
  juz: number;
}

/**
 * One type's track inside a plan: its own weekdays, its own stretch of the
 * mushaf, and its own frozen day-by-day breakdown.
 *
 * A weekday may now be shared by more than one segment (حفظ + مراجعة on the
 * same day) — see validateSegmentDays in lib/quranRange.ts. Ward and
 * occurrence tracking stay per-segment, so each type counts and tracks
 * independently even when sharing a calendar day.
 *
 * `schedule[].occurrenceIndex` is 1-based WITHIN THIS SEGMENT, so an
 * occurrence is addressed by the pair (type, occurrenceIndex) — never by index
 * alone, which is no longer unique across a plan.
 */
export interface IPlanSegment {
  type: PlanType;
  days: string[];
  rangeStart: IRangePoint;
  rangeEnd: IRangePoint;
  schedule: IScheduleEntry[];
}

export interface IQuranPlan extends Document {
  name: string;
  description?: string;

  /** One track per type. Always populated on read — a legacy single-type
   * document is normalized into a one-element array by `normalizePlan()` in
   * quran-plan.controller.ts, so nothing downstream sees the old shape. */
  segments: IPlanSegment[];

  /* ── legacy single-track fields ──────────────────────────────────────────
   * Pre-segments documents still carry these and are migrated on read, never
   * in place. Optional so new plans simply omit them; do not write them. */
  type?: PlanType;
  teacher: Types.ObjectId;

  targetType: 'halqa' | 'students' | 'specialTrack';
  halqa?: Types.ObjectId;
  students?: Types.ObjectId[];
  specialTrack?: Types.ObjectId;

  days?: string[];
  rangeStart?: IRangePoint;
  rangeEnd?: IRangePoint;
  schedule?: IScheduleEntry[];
  /* ─────────────────────────────────────────────────────────────────────── */

  startDate: Date;
  /** Calendar days (YYYY-MM-DD) the plan pauses on — Eid, exams, travel.
   * A holiday produces no occurrence even when it lands on one of `days`,
   * so the day's portion shifts onto the next working day. Stored as plain
   * date strings, not Dates: a holiday is a calendar day, and a Date would
   * re-introduce a midnight/timezone shift on every read. */
  holidays: string[];

  pointsEnabled: boolean;
  pointRules: IPointRule[];

  /** Daily grading rubric for this plan. Defaults to DEFAULT_GRADE_RUBRIC. */
  gradeRubric: IGradeCriterion[];

  endType: 'activeDays' | 'date';
  activeDaysCount?: number;
  endDate?: Date;

  status: 'نشطة' | 'متوقفة' | 'منتهية';

  createdAt: Date;
  updatedAt: Date;
}

const pointRuleSchema = new Schema<IPointRule>(
  {
    label:  { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    kind:   { type: String, enum: ['خصم', 'زيادة'], required: true },
  },
  { _id: false },
);

const gradeCriterionSchema = new Schema<IGradeCriterion>(
  {
    key:   { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    max:   { type: Number, required: true, min: 1 },
    auto:  { type: Boolean, default: false },
  },
  { _id: false },
);

const rangePointSchema = new Schema<IRangePoint>(
  {
    surahNumber: { type: Number, required: true, min: 1, max: 114 },
    ayah:        { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const scheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    occurrenceIndex: { type: Number, required: true },
    date:            { type: Date, required: true },
    surahStart:      { type: Number, required: true },
    ayahStart:       { type: Number, required: true },
    surahEnd:        { type: Number, required: true },
    ayahEnd:         { type: Number, required: true },
    pageStart:       { type: Number, required: true },
    pageEnd:         { type: Number, required: true },
    juz:             { type: Number, required: true },
  },
  { _id: false },
);

const planSegmentSchema = new Schema<IPlanSegment>(
  {
    type: { type: String, enum: PLAN_TYPE_VALUES, required: true },
    days: {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length > 0, 'يجب اختيار يوم واحد على الأقل'],
    },
    rangeStart: { type: rangePointSchema, required: true },
    rangeEnd:   { type: rangePointSchema, required: true },
    // Frozen day-by-day breakdown for THIS type — normally computed live (see
    // computeMultiScheduleBreakdown), so it starts empty. Freezing it
    // (POST /quran-plans/:id/schedule/generate) lets a teacher hand-edit
    // individual days without every recompute wiping them.
    schedule: { type: [scheduleEntrySchema], default: [] },
  },
  { _id: false },
);

const quranPlanSchema = new Schema<IQuranPlan>(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    segments: {
      type: [planSegmentSchema],
      default: [],
      // Not `required` at the schema level: a legacy document predates the
      // field entirely and must still load. New writes are validated in the
      // controller via validateSegmentDays, which also enforces the
      // one-type-per-day partition that a mongoose validator cannot express.
    },

    // ── legacy single-track fields — read-only, migrated on read ──
    type:        { type: String, enum: PLAN_TYPE_VALUES },
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },

    targetType:   { type: String, enum: ['halqa', 'students', 'specialTrack'], required: true },
    halqa:        { type: Schema.Types.ObjectId, ref: 'Halqa' },
    students:     [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    specialTrack: { type: Schema.Types.ObjectId, ref: 'SpecialTrack' },

    days:       { type: [String] },
    rangeStart: { type: rangePointSchema },
    rangeEnd:   { type: rangePointSchema },
    schedule:   { type: [scheduleEntrySchema] },
    // ─────────────────────────────────────────────────────────────

    startDate: { type: Date, required: true, default: Date.now },
    holidays:  {
      type: [String],
      default: [],
      validate: [(v: string[]) => v.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)), 'تاريخ عطلة غير صالح'],
    },

    pointsEnabled: { type: Boolean, default: false },
    pointRules:    { type: [pointRuleSchema], default: [] },

    gradeRubric: {
      type: [gradeCriterionSchema],
      default: () => DEFAULT_GRADE_RUBRIC.map((c) => ({ ...c })),
    },

    endType:         { type: String, enum: ['activeDays', 'date'], required: true },
    activeDaysCount: { type: Number, min: 1 },
    endDate:         { type: Date },

    status: { type: String, enum: ['نشطة', 'متوقفة', 'منتهية'], default: 'نشطة' },
  },
  { timestamps: true },
);

quranPlanSchema.index({ teacher: 1 });
quranPlanSchema.index({ halqa: 1 });
quranPlanSchema.index({ specialTrack: 1 });

export const QuranPlan = model<IQuranPlan>('QuranPlan', quranPlanSchema);
