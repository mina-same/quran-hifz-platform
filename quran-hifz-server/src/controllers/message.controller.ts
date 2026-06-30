import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Message } from '../models/Message.model';
import { AppError } from '../middleware/error';

const messageSchema = z.object({
  recipient:      z.string().min(1, 'المستلم مطلوب'),
  senderName:     z.string().min(1),
  senderInitials: z.string().min(1),
  senderRole:     z.string().min(1),
  body:           z.string().min(1, 'نص الرسالة مطلوب'),
});

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const messages = await Message.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = messages.map((m) => ({
      id:          m._id,
      sender:      m.senderName,
      senderRole:  m.senderRole,
      initials:    m.senderInitials,
      preview:     m.body,
      time:        m.createdAt,
      unread:      !m.readAt,
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = messageSchema.parse(req.body);
    const message = await Message.create({ ...data, sender: req.user!.id });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!.id },
      { readAt: new Date() },
      { new: true },
    );
    if (!message) throw new AppError('الرسالة غير موجودة', 404);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}
