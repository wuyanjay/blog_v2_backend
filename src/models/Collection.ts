import { Document, Schema, Types, model } from 'mongoose'

export interface ICollection extends Document {
  user: Types.ObjectId
  post: Types.ObjectId
}

const CollectionSchema = new Schema<ICollection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true }
)

CollectionSchema.index({ user: 1, post: 1 }, { unique: true })

export const Collection = model<ICollection>('Collection', CollectionSchema)
