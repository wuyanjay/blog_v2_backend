import { Types } from 'mongoose'
import { redis } from '../config/redis'
import { ViewLog } from '../models/ViewLog'
import { Post } from '../models/Post'
import type { SessionCachePayload } from '../types'

export async function cacheSession(sessionId: string, payload: SessionCachePayload, ttl: number) {
  await redis.set(`session:${sessionId}`, JSON.stringify(payload), 'EX', ttl)
}

export async function deleteSessionCache(sessionId: string) {
  await redis.del(`session:${sessionId}`)
}

export async function getSessionCache(sessionId: string) {
  return redis.get(`session:${sessionId}`)
}

export async function blacklistRefreshToken(token: string, ttl: number, value = '1') {
  await redis.set(`blacklist:refresh:${token}`, value, 'EX', ttl)
}

export async function isRefreshTokenBlacklisted(token: string) {
  return (await redis.exists(`blacklist:refresh:${token}`)) === 1
}

export async function recordView(postId: string, ip: string): Promise<boolean> {
  const key = `view:${postId}:${ip}`
  const result = await redis.set(key, '1', 'EX', 86400, 'NX')
  const isNew = result === 'OK'

  if (isNew) {
    const objectId = new Types.ObjectId(postId)

    await Promise.all([
      Post.findByIdAndUpdate(objectId, { $inc: { viewCount: 1 } }),
      ViewLog.create({ post: objectId }).catch(() => {
        // 写入失败不影响主流程
      }),
    ])
  }

  return isNew
}

export async function updateHotScore(postId: string, delta: number) {
  await redis.zincrby('post:trending', delta, postId)
}

export async function getTrendingPostIds(limit = 10) {
  return redis.zrevrange('post:trending', 0, limit - 1)
}

export async function incrUnreadCount(userId: string) {
  await redis.incr(`notify:unread:${userId}`)
}

export async function resetUnreadCount(userId: string) {
  await redis.del(`notify:unread:${userId}`)
}

export async function getUnreadCountFromCache(userId: string) {
  return Number((await redis.get(`notify:unread:${userId}`)) ?? 0)
}
