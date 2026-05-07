import Router from '@koa/router'
import { collectionController } from '../controllers/collection.controller'
import { authenticate } from '../middlewares/auth'

const router = new Router()

router.get('/', authenticate, collectionController.list)
router.post('/:postId', authenticate, collectionController.add)
router.delete('/:postId', authenticate, collectionController.remove)

export default router
