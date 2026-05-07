import Router from '@koa/router'
import { commentController } from '../controllers/comment.controller'
import { authenticate, optionalAuth } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { createCommentSchema } from '../validators/comment.validator'

const router = new Router()

router.get('/:postId/comments', optionalAuth, commentController.getList)
router.post('/:postId/comments', authenticate, validate(createCommentSchema), commentController.create)
router.delete('/:postId/comments/:commentId', authenticate, commentController.remove)
router.post('/:postId/comments/:commentId/like', authenticate, commentController.like)
router.delete('/:postId/comments/:commentId/like', authenticate, commentController.unlike)

export default router
