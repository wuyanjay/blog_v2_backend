import { Errors } from '../errors'
import { ERROR_CODES } from '../errors'
import { Collection } from '../models/Collection'
import { Post } from '../models/Post'

export const collectionService = {
  async list(userId: string) {
    return Collection.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'post',
        match: { visibility: 'public' },
        populate: { path: 'author', select: 'username nickname avatar' },
      })
      .lean()
  },

  async add(postId: string, userId: string) {
    const post = await Post.findOne({ _id: postId, visibility: 'public' })
    if (!post) throw Errors.notFound('文章不存在')

    const exists = await Collection.exists({ user: userId, post: postId })
    if (exists) throw Errors.conflict('已收藏该文章', ERROR_CODES.ALREADY_COLLECTED)

    await Collection.create({ user: userId, post: postId })
  },

  async remove(postId: string, userId: string) {
    const collection = await Collection.findOneAndDelete({ user: userId, post: postId })
    if (!collection) throw Errors.badRequest('尚未收藏该文章')
  },
}
