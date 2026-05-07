import { Document, Schema, Types, model } from 'mongoose'
import { nanoid } from 'nanoid'
import slugify from 'slugify'
import type { PostVisibility } from '../types'
import { plainTextExcerpt } from '../utils/sanitize'

export interface IPost extends Document {
  author: Types.ObjectId
  title: string
  slug: string
  content_html: string
  content_json: string
  summary: string
  cover: string
  tags: string[]
  category: Types.ObjectId | null
  visibility: PostVisibility
  viewCount: number
  likeCount: number
  commentCount: number
  readTime: number
  createdAt: Date
  updatedAt: Date
}

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, maxlength: 100, trim: true, default: '' },
    slug: { type: String, unique: true, index: true },
    content_html: { type: String, default: '' },
    content_json: { type: String, default: '' },
    summary: { type: String, default: '', maxlength: 300 },
    cover: { type: String, default: '' },
    tags: { type: [String], default: [], index: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
      index: true,
    },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 1 },
  },
  { timestamps: true }
)

PostSchema.index({ title: 'text', content_html: 'text', tags: 'text' })
PostSchema.index({ author: 1, visibility: 1, createdAt: -1 })
PostSchema.index({ visibility: 1, createdAt: -1 })
PostSchema.index({ category: 1, visibility: 1, createdAt: -1 })

PostSchema.pre('save', function preSave(next) {
  if (this.isModified('title')) {
    this.slug = `${slugify(this.title, { lower: true, strict: true })}-${nanoid(6)}`
  }

  if (this.isModified('content_html')) {
    if (!this.summary) {
      this.summary = plainTextExcerpt(this.content_html, 200)
    }
    this.readTime = Math.max(1, Math.ceil(this.content_html.length / 300))
  }
  next()
})

export const Post = model<IPost>('Post', PostSchema)
