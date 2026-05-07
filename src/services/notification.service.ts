import { Notification } from '../models/Notification'
import { getUnreadCountFromCache, incrUnreadCount, resetUnreadCount } from '../utils/redis'

interface CreateNotificationInput {
  receiver: string
  sender: string
  type: 'like' | 'comment' | 'follow' | 'reply'
  target?: string
  targetType?: 'post' | 'comment'
}

export const notificationService = {
  async create(data: CreateNotificationInput) {
    if (data.receiver === data.sender) return
    await Notification.create(data)
    await incrUnreadCount(data.receiver)
  },

  async getList(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [notifications, total] = await Promise.all([
      Notification.find({ receiver: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'username nickname avatar')
        .lean(),
      Notification.countDocuments({ receiver: userId }),
    ])

    return { notifications, total, page, limit }
  },

  async markAllRead(userId: string) {
    await Notification.updateMany({ receiver: userId, isRead: false }, { isRead: true })
    await resetUnreadCount(userId)
  },

  async getUnreadCount(userId: string) {
    const cached = await getUnreadCountFromCache(userId)
    if (cached > 0) return cached
    return Notification.countDocuments({ receiver: userId, isRead: false })
  },
}
