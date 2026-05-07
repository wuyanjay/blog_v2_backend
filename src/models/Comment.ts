import { Document, Schema, Types, model } from 'mongoose'

export interface IComment extends Document {
  post: Types.ObjectId
  author: Types.ObjectId
  parent?: Types.ObjectId | null
  replyTo?: Types.ObjectId | null
  content: string
  likeCount: number
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    replyTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    content: { type: String, required: true, maxlength: 1000 },
    likeCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

CommentSchema.index({ post: 1, createdAt: 1 })

export const Comment = model<IComment>('Comment', CommentSchema)
