import Joi from 'joi'
import { objectIdSchema } from './common.validator'

export const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
  parent: objectIdSchema.allow(null).optional(),
  replyTo: objectIdSchema.allow(null).optional(),
})
