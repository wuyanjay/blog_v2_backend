import { Document, Schema, Types, model } from 'mongoose'
import { nanoid } from 'nanoid'
import slugify from 'slugify'

export interface ICategory extends Document {
  name: string
  slug: string
  description: string
  parent: Types.ObjectId | null
  order: number
  postCount: number
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 200,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

CategorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${nanoid(4)}`
  }
  next()
})

export const Category = model<ICategory>('Category', CategorySchema)
