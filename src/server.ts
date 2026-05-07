import app from './app'
import { env } from './config'
import { logger } from './utils/logger'

app.listen(env.port, () => {
  logger.info(`Server running on http://localhost:${env.port}`)
})
