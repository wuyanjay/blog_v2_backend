import { Document, Schema, Types, model } from 'mongoose'

export interface ILike extends Document {
  user: Types.ObjectId
  target: Types.ObjectId
  targetType: 'post' | 'comment'
}

const LikeSchema = new Schema<ILike>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
  },
  { timestamps: true }
)

LikeSchema.index({ user: 1, target: 1, targetType: 1 }, { unique: true })

export const Like = model<ILike>('Like', LikeSchema)
