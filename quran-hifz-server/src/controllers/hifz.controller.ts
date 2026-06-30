import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HifzEntry } from '../models/HifzEntry.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

const entrySchema = z.object({
  student:        z.string().min(1),
  surah:          z.string().min(1),
  surahNumber:    z.number().min(1).max(114),
  status:         z.enum(['مكتمل', 'جارٍ', 'لم يبدأ']),
  completionDate: z.string().optional(),
  notes:          z.string().optional(),
});

export async function getHifzPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const entries = await HifzEntry.find({ student: studentId }).sort({ surahNumber: 1 });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function upsertEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = entrySchema.parse(req.body);
    const update: Record<string, unknown> = {
      surah:       data.surah,
      surahNumber: data.surahNumber,
      status:      data.status,
      notes:       data.notes,
    };
    if (data.status === 'مكتمل' && data.completionDate) {
      update.completionDate = new Date(data.completionDate);
    }

    const entry = await HifzEntry.findOneAndUpdate(
      { student: data.student, surahNumber: data.surahNumber },
      { $set: update, $setOnInsert: { student: data.student } },
      { new: true, upsert: true },
    );

    await recalcProgress(data.student);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

async function recalcProgress(studentId: string): Promise<void> {
  const student = await Student.findById(studentId);
  if (!student) return;

  const completed = await HifzEntry.countDocuments({ student: studentId, status: 'مكتمل' });
  const total     = 114;
  const totalPages = student.totalPages;
  const pagesPerSurah = totalPages / total;
  const progressPages = Math.round(completed * pagesPerSurah);
  const progressPct   = Math.round((completed / total) * 100);

  await Student.findByIdAndUpdate(studentId, { progressPages, progressPct });
}

export async function deleteEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = await HifzEntry.findByIdAndDelete(req.params.id);
    if (!entry) throw new AppError('السجل غير موجود', 404);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    next(err);
  }
}
