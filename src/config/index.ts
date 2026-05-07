import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  fileBaseUrl: process.env.FILE_BASE_URL ?? 'http://localhost:3000',
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/blog_v2'),
  redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'replace-with-a-secure-access-secret'),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  authSessionExpires: process.env.AUTH_SESSION_EXPIRES ?? '7d',
  authSessionRememberExpires: process.env.AUTH_SESSION_REMEMBER_EXPIRES ?? '14d',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'blog_refresh_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Blog <no-reply@example.com>',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
}

export function isProduction() {
  return env.nodeEnv === 'production'
}
