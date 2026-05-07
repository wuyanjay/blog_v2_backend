import Joi from 'joi'

export const postSchema = Joi.object({
  title: Joi.string().max(100).optional().allow(''),
  content_html: Joi.string().optional().allow(''),
  content_json: Joi.string().optional().allow(''),
  summary: Joi.string().max(300).allow('').default(''),
  cover: Joi.string().uri().allow('').default(''),
  tags: Joi.array().items(Joi.string().max(20)).max(10).default([]),
  category: Joi.string().hex().length(24).allow(null).default(null),
  visibility: Joi.string().valid('private', 'public').default('private'),
})

export const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(100).optional(),
  content_html: Joi.string().min(1).optional(),
  content_json: Joi.string().min(1).optional(),
  summary: Joi.string().max(300).allow('').optional(),
  cover: Joi.string().uri().allow('').optional(),
  tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
  category: Joi.string().hex().length(24).allow(null).optional(),
  visibility: Joi.string().valid('private', 'public').optional(),
}).min(1)
