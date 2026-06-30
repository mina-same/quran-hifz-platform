import { Request, Response, NextFunction } from 'express';
import { ParentStudent } from '../models/ParentStudent.model';
import { Attendance } from '../models/Attendance.model';
import { Homework } from '../models/Homework.model';
import { GroupHomework } from '../models/GroupHomework.model';
import { LessonRecording } from '../models/LessonRecording.model';
import { Message } from '../models/Message.model';
import { HifzEntry } from '../models/HifzEntry.model';
import { Student } from '../models/Student.model';
import { AppError } from '../middleware/error';

export async function getChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const links = await ParentStudent.find({ parent: req.user!.id })
      .populate('student', 'name path juz halqa attendancePct progressPct progressPages');
    res.json({ success: true, data: links.map((l) => l.student) });
  } catch (err) {
    next(err);
  }
}

async function assertChild(parentId: string, studentId: string): Promise<void> {
  const link = await ParentStudent.findOne({ parent: parentId, student: studentId });
  if (!link) throw new AppError('غير مصرح بالوصول إلى هذا الطالب', 403);
}

export async function getChildHifz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertChild(req.user!.id, req.params.studentId);
    const entries = await HifzEntry.find({ student: req.params.studentId }).sort({ date: -1 });
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
}

export async function getChildAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertChild(req.user!.id, req.params.studentId);
    const records = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
}

export async function getChildHomework(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertChild(req.user!.id, req.params.studentId);
    const student = await Student.findById(req.params.studentId).select('halqa');
    if (!student) throw new AppError('الطالب غير موجود', 404);

    const [individual, group] = await Promise.all([
      Homework.find({ student: req.params.studentId }).sort({ dueDate: -1 }),
      GroupHomework.find({ halqa: student.halqa }).sort({ dueDate: -1 }),
    ]);
    res.json({ success: true, data: { individual, group } });
  } catch (err) {
    next(err);
  }
}

export async function getChildRecordings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertChild(req.user!.id, req.params.studentId);
    const recordings = await LessonRecording.find({ student: req.params.studentId })
      .populate('teacher', 'name')
      .sort({ recordedAt: -1 });
    res.json({ success: true, data: recordings });
  } catch (err) {
    next(err);
  }
}

export async function getChildMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertChild(req.user!.id, req.params.studentId);
    const messages = await Message.find({ student: req.params.studentId })
      .populate('sender', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}
