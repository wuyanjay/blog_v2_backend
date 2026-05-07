import Joi from 'joi'

export const objectIdSchema = Joi.string().hex().length(24)
