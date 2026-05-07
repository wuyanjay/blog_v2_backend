import Router from '@koa/router'
import { categoryController } from '../controllers/category.controller'
import { authenticate } from '../middlewares/auth'
import { validate } from '../middlewares/validate'
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator'

const router = new Router()

// Public
router.get('/tree', categoryController.getTree)
router.get('/', categoryController.getList)
router.get('/:slug', categoryController.getBySlug)
router.get('/:id/posts', categoryController.getCategoryPosts)

// Auth required
router.post('/', authenticate, validate(createCategorySchema), categoryController.create)
router.patch('/:id', authenticate, validate(updateCategorySchema), categoryController.update)
router.delete('/:id', authenticate, categoryController.remove)
router.post('/recalculate', authenticate, categoryController.recalculate)

export default router
