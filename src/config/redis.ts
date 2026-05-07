import Redis from 'ioredis'
import { env } from './index'
import { logger } from '../utils/logger'

export const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  lazyConnect: true,
  maxRetriesPerRequest: 2,
})

let connected = false

export async function connectRedis() {
  if (connected) return

  try {
    await redis.connect()
    connected = true
    logger.info('Redis connected')
  } catch (error) {
    logger.error('Redis connection error', { error })
  }
}
