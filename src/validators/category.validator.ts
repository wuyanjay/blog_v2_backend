import Joi from 'joi'

export const createCategorySchema = Joi.object({
  name:        Joi.string().trim().min(1).max(50).required(),
  slug:        Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(80).optional(),
  description: Joi.string().trim().max(200).allow('').default(''),
  parent:      Joi.string().hex().length(24).allow(null).default(null),
  order:       Joi.number().integer().min(0).default(0),
})

export const updateCategorySchema = Joi.object({
  name:        Joi.string().trim().min(1).max(50).optional(),
  description: Joi.string().trim().max(200).allow('').optional(),
  parent:      Joi.string().hex().length(24).allow(null).optional(),
  order:       Joi.number().integer().min(0).optional(),
}).min(1)
