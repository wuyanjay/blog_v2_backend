import Router from '@koa/router'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimit } from '../middlewares/rateLimit'
import { validate } from '../middlewares/validate'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator'

const router = new Router()

router.post(
  '/register',
  rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'register' }),
  validate(registerSchema),
  authController.register
)
router.get('/verify-email', validate(verifyEmailSchema, 'query'), authController.verifyEmail)
router.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'login' }),
  validate(loginSchema),
  authController.login
)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)
router.post(
  '/forgot-password',
  rateLimit({ windowMs: 60_000, max: 3, keyPrefix: 'forgot-password' }),
  validate(forgotPasswordSchema),
  authController.forgotPassword
)
router.post(
  '/resend-verification',
  rateLimit({ windowMs: 60_000, max: 1, keyPrefix: 'resend-verification' }),
  validate(resendVerificationSchema),
  authController.resendVerification
)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

export default router
