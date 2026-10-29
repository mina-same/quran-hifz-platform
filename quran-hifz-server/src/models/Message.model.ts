import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  /** Absent for system notices (`system: true`). */
  sender?: Types.ObjectId;
  /** Automatic notice from «مدير النظام» (absence, daily evaluation, grade edits) — never part of a person-to-person chat. */
  system?: boolean;
  recipient: Types.ObjectId;
  student?: Types.ObjectId;
  senderRole: string;
  senderName: string;
  senderInitials: string;
  body: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender:          { type: Schema.Types.ObjectId, ref: 'User' },
    system:          { type: Boolean, default: false },
    recipient:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    student:         { type: Schema.Types.ObjectId, ref: 'Student' },
    senderRole:      { type: String, required: true },
    senderName:      { type: String, required: true, trim: true },
    senderInitials:  { type: String, required: true, trim: true },
    body:            { type: String, required: true, trim: true },
    readAt:          { type: Date },
  },
  { timestamps: true },
);

messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ student: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', messageSchema);
