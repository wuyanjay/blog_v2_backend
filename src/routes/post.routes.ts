import Router from '@koa/router'
import { postController } from '../controllers/post.controller'
import { authenticate, optionalAuth } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { postSchema, updatePostSchema } from '../validators/post.validator'

const router = new Router()

router.get('/feed', authenticate, postController.getFeed)
router.get('/trending', optionalAuth, postController.getTrending)
router.get('/', optionalAuth, postController.getList)
router.post('/', authenticate, validate(postSchema), postController.create)
router.get('/:id', optionalAuth, postController.getDetail)
router.patch('/:id', authenticate, validate(updatePostSchema), postController.update)
router.delete('/:id', authenticate, postController.remove)
router.post('/:id/like', authenticate, postController.like)
router.delete('/:id/like', authenticate, postController.unlike)

export default router
