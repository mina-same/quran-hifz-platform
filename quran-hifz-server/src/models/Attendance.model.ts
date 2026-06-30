import { Schema, model, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  student: Types.ObjectId;
  halqa: Types.ObjectId;
  date: Date;
  day: string;
  time: string;
  status: 'حاضر' | 'غائب' | 'متأخر';
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    halqa:   { type: Schema.Types.ObjectId, ref: 'Halqa',   required: true },
    date:    { type: Date, required: true },
    day:     { type: String, required: true },
    time:    { type: String, required: true },
    status:  { type: String, enum: ['حاضر', 'غائب', 'متأخر'], required: true },
  },
  { timestamps: true },
);

attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ halqa: 1, date: -1 });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
