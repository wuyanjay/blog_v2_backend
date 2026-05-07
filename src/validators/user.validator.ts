import Joi from 'joi'

export const updateProfileSchema = Joi.object({
  nickname: Joi.string().max(50).allow('').optional(),
  avatar: Joi.string().uri().allow('').optional(),
  bio: Joi.string().max(200).allow('').optional(),
})
