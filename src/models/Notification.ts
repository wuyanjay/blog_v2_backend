import { Document, Schema, Types, model } from 'mongoose'

export interface INotification extends Document {
  receiver: Types.ObjectId
  sender: Types.ObjectId
  type: 'like' | 'comment' | 'follow' | 'reply'
  target?: Types.ObjectId | null
  targetType?: 'post' | 'comment' | null
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'follow', 'reply'], required: true },
    target: { type: Schema.Types.ObjectId, default: null },
    targetType: { type: String, enum: ['post', 'comment'], default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

export const Notification = model<INotification>('Notification', NotificationSchema)
