import { nanoid } from 'nanoid'
import { getOssClient, buildOssUrl } from '../../config/oss'
import { logger } from '../../utils/logger'

export type UploadType = 'avatar' | 'post'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

export interface UploadResult {
  url: string
  key: string
  filename: string
}

export const ossUploadService = {
  async upload(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    type: UploadType = 'post'
  ): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw Object.assign(new Error('仅支持 JPG / PNG / GIF / WEBP 格式'), { status: 400 })
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw Object.assign(new Error('文件大小不能超过 5 MB'), { status: 400 })
    }

    const ext = MIME_TO_EXT[mimeType]
    const dir = type === 'avatar' ? 'avatars' : 'posts'
    const filename = `${nanoid(8)}.${ext}`
    const objectKey = `${dir}/${userId}/${filename}`

    const client = getOssClient()

    try {
      await client.put(objectKey, buffer, {
        headers: {
          'x-oss-object-acl': 'public-read',
          'Content-Type': mimeType,
        },
      })
    } catch (err) {
      logger.error('[OSS] 上传失败', { objectKey, userId, error: err })
      throw Object.assign(new Error('文件上传失败，请稍后重试'), { status: 500 })
    }

    const url = buildOssUrl(objectKey)

    logger.info('[OSS] 上传成功', { objectKey, url, userId })

    return { url, key: objectKey, filename }
  },

  async delete(objectKey: string): Promise<void> {
    const client = getOssClient()
    try {
      await client.delete(objectKey)
      logger.info('[OSS] 删除成功', { objectKey })
    } catch (err) {
      logger.warn('[OSS] 删除失败（非致命）', { objectKey, error: err })
    }
  },
}
