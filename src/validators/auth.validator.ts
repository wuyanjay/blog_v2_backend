import Joi from 'joi'

const passwordSchema = Joi.string()
  .min(8)
  .max(72)
  .custom((value, helpers) => {
    const classes = [
      /[A-Za-z]/.test(value),
      /\d/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length

    if (classes < 2) {
      return helpers.error('password.strength')
    }

    return value
  })
  .messages({
    'string.min': '密码至少 8 位',
    'password.strength': '密码至少包含字母、数字、特殊字符中的两类',
  })

export const registerSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[A-Za-z0-9_]{3,30}$/)
    .required()
    .messages({
      'string.pattern.base': '用户名只能包含字母、数字和下划线，长度 3 到 30 位',
    }),
  email: Joi.string().email().required(),
  password: passwordSchema.required(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().default(false),
})

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
})

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
})

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
})

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema.required(),
})
