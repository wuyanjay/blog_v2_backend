import Router from '@koa/router'
import multer from '@koa/multer'
import { uploadController } from '../controllers/upload.controller'
import { authenticate } from '../middlewares/auth'

const router = new Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.post('/image', authenticate, upload.single('image'), uploadController.uploadImage)

export default router
