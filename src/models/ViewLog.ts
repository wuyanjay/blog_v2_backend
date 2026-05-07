import { Document, Schema, Types, model } from 'mongoose'

export interface IViewLog extends Document {
  post: Types.ObjectId
  createdAt: Date
}

const ViewLogSchema = new Schema<IViewLog>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

ViewLogSchema.index({ post: 1, createdAt: -1 })
ViewLogSchema.index({ createdAt: -1 })

export const ViewLog = model<IViewLog>('ViewLog', ViewLogSchema)
