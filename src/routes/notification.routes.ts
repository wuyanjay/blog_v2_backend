import Router from '@koa/router'
import { notificationController } from '../controllers/notification.controller'
import { authenticate } from '../middlewares/auth'

const router = new Router()

router.get('/', authenticate, notificationController.getList)
router.get('/unread-count', authenticate, notificationController.getUnreadCount)
router.post('/read-all', authenticate, notificationController.markAllRead)

export default router
