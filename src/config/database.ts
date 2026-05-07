import mongoose from 'mongoose'
import { env } from './index'
import { logger } from '../utils/logger'

let connected = false

export async function connectDB() {
  if (connected) return

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
    connected = true
    logger.info('MongoDB connected')
  } catch (error) {
    logger.error('MongoDB connection error', { error })
    throw error
  }
}
