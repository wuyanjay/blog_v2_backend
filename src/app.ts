import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import helmet from 'koa-helmet'
import logger from 'koa-logger'
import serve from 'koa-static'
import { env, isProduction } from './config'
import { connectDB } from './config/database'
import { connectRedis } from './config/redis'
import { errorHandler } from './middlewares/errorHandler'
import router from './routes'

const app = new Koa()

void connectDB()
void connectRedis()

app.use(errorHandler)
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
)
app.use(logger())
app.use(
  koaBody({
    multipart: false,
    jsonStrict: false,
  })
)
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads')) {
    ctx.path = ctx.path.replace(/^\/uploads/, '') || '/'
  }
  await next()
})
app.use(serve(env.uploadDir))
app.use(router.routes())
app.use(router.allowedMethods())

if (!isProduction()) {
  app.proxy = true
}

export default app
