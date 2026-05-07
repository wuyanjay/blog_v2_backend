import Joi from 'joi'
import Router from '@koa/router'
import { statsController } from '../controllers/stats.controller'
import { optionalAuth } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { objectIdSchema } from '../validators/common.validator'

const idParamSchema = Joi.object({ id: objectIdSchema.required() })
const periodQuerySchema = Joi.object({
  period: Joi.number().integer().valid(7).optional(),
})

const router = new Router()

router.get(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  validate(periodQuerySchema, 'query'),
  statsController.getStats
)

export default router
