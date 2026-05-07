import Joi from 'joi'
import Router from '@koa/router'
import { userController } from '../controllers/user.controller'
import { authenticate, optionalAuth } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { objectIdSchema } from '../validators/common.validator'
import { updateProfileSchema } from '../validators/user.validator'

const router = new Router()
const idParamSchema = Joi.object({ id: objectIdSchema.required() })

router.get('/me', authenticate, userController.getMe)
router.patch('/me', authenticate, validate(updateProfileSchema), userController.updateMe)

// /me/posts 必须在 /:id/posts 之前注册，否则 "me" 会被当作 :id 参数捕获
router.get('/me/posts', authenticate, userController.getMyPosts)

router.get('/:id', optionalAuth, validate(idParamSchema, 'params'), userController.getProfile)
router.get('/:id/posts', optionalAuth, validate(idParamSchema, 'params'), userController.getUserPosts)
router.post('/:id/follow', authenticate, validate(idParamSchema, 'params'), userController.follow)
router.delete('/:id/follow', authenticate, validate(idParamSchema, 'params'), userController.unfollow)

export default router
