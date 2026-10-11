import { Schema, model, Document, Types } from 'mongoose';

/** One student line in a daily report (struggling / absent / excused). */
export interface IDailyReportLine {
  student: Types.ObjectId;
  name: string;
  /** Struggling only: what the student struggled in (e.g. الحفظ، المراجعة). */
  area?: string;
  /** Free text — the reason for an absence/excuse, or the teacher's remark. */
  note?: string;
}

/**
 * «التقرير اليومي للحلقة» — sent by the teacher after the session and read by
 * the supervisor and admin, by date. One document per (track, date); sending
 * again for the same day overwrites it. Student names are SNAPSHOTS so an old
 * report still reads correctly after a student is renamed or removed.
 */
export interface IDailyReport extends Document {
  track: Types.ObjectId;
  masjid: Types.ObjectId;
  /** Calendar day YYYY-MM-DD (same convention as OpenWardEntry.date). */
  date: string;
  /** Snapshots for display: «حلقة …» in «جامع …». */
  trackTitle: string;
  masjidName: string;
  teacherName: string;
  struggling: IDailyReportLine[];
  absent: IDailyReportLine[];
  excused: IDailyReportLine[];
  presentCount: number;
  totalCount: number;
  notes?: string;
  sentBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const lineSchema = new Schema<IDailyReportLine>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    name:    { type: String, required: true, trim: true },
    area:    { type: String, trim: true },
    note:    { type: String, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const dailyReportSchema = new Schema<IDailyReport>(
  {
    track:        { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    masjid:       { type: Schema.Types.ObjectId, ref: 'Masjid', required: true },
    date:         { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    trackTitle:   { type: String, required: true },
    masjidName:   { type: String, required: true },
    teacherName:  { type: String, required: true },
    struggling:   { type: [lineSchema], default: [] },
    absent:       { type: [lineSchema], default: [] },
    excused:      { type: [lineSchema], default: [] },
    presentCount: { type: Number, default: 0 },
    totalCount:   { type: Number, default: 0 },
    notes:        { type: String, trim: true, maxlength: 1000 },
    sentBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

dailyReportSchema.index({ track: 1, date: 1 }, { unique: true });
dailyReportSchema.index({ date: -1 });

export const DailyReport = model<IDailyReport>('DailyReport', dailyReportSchema);
