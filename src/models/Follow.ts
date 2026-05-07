import { Document, Schema, Types, model } from 'mongoose'

export interface IFollow extends Document {
  follower: Types.ObjectId
  following: Types.ObjectId
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

FollowSchema.index({ follower: 1, following: 1 }, { unique: true })

export const Follow = model<IFollow>('Follow', FollowSchema)
