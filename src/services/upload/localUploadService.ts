import fs from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'
import type { UploadType, UploadResult } from './ossUploadService'

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

export const localUploadService = {
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

    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const destDir = path.join(uploadDir, dir, userId)
    fs.mkdirSync(destDir, { recursive: true })

    const destPath = path.join(destDir, filename)
    fs.writeFileSync(destPath, buffer)

    const baseUrl = process.env.FILE_BASE_URL || 'http://localhost:3000'
    const url = `${baseUrl}/uploads/${dir}/${userId}/${filename}`

    return { url, key: `${dir}/${userId}/${filename}`, filename }
  },

  async delete(objectKey: string): Promise<void> {
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const filePath = path.join(uploadDir, objectKey)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch {
      // 删除失败不抛出
    }
  },
}
