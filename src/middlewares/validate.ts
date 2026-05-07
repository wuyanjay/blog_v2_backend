import { Context, Next } from 'koa'
import Joi from 'joi'
import { Errors } from '../errors'

type Target = 'body' | 'query' | 'params'

export function validate(schema: Joi.Schema, target: Target = 'body') {
  return async (ctx: Context, next: Next) => {
    const source =
      target === 'body'
        ? ctx.request.body
        : target === 'query'
          ? ctx.request.query
          : ctx.params
    const { error, value } = schema.validate(source, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      throw Errors.validation(
        '参数校验失败',
        error.details.map((d) => d.message)
      )
    }

    if (target === 'body') {
      ctx.request.body = value
    } else if (target === 'query') {
      ;(ctx.request as any).query = value
    } else {
      ;(ctx as any).params = value
    }

    await next()
  }
}
