import Router from '@koa/router'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import postRoutes from './post.routes'
import commentRoutes from './comment.routes'
import notificationRoutes from './notification.routes'
import collectionRoutes from './collection.routes'
import searchRoutes from './search.routes'
import uploadRoutes from './upload.routes'
import statsRoutes from './stats.routes'
import categoryRoutes from './category.routes'

const router = new Router({ prefix: '/api' })

router.use('/auth', authRoutes.routes(), authRoutes.allowedMethods())
router.use('/users', userRoutes.routes(), userRoutes.allowedMethods())
router.use('/posts', postRoutes.routes(), postRoutes.allowedMethods())
router.use('/posts', commentRoutes.routes(), commentRoutes.allowedMethods())
router.use('/collections', collectionRoutes.routes(), collectionRoutes.allowedMethods())
router.use('/notifications', notificationRoutes.routes(), notificationRoutes.allowedMethods())
router.use('/search', searchRoutes.routes(), searchRoutes.allowedMethods())
router.use('/upload', uploadRoutes.routes(), uploadRoutes.allowedMethods())
router.use('/stats', statsRoutes.routes(), statsRoutes.allowedMethods())
router.use('/categories', categoryRoutes.routes(), categoryRoutes.allowedMethods())

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: Date.now() }
})

export default router
