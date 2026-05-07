import fs from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'
import { Errors } from '../errors'
import { env } from '../config'

fs.mkdirSync(env.uploadDir, { recursive: true })

interface UploadFile {
  filepath: string
  originalFilename?: string | null
  mimetype?: string | null
}

export const uploadService = {
  async saveImage(file: UploadFile) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
      throw Errors.badRequest('仅支持 JPG/PNG/GIF/WEBP 格式')
    }

    const ext = path.extname(file.originalFilename ?? '') || '.jpg'
    const filename = `${nanoid()}-${Date.now()}${ext}`
    const destination = path.join(env.uploadDir, filename)

    await fs.promises.copyFile(file.filepath, destination)
    await fs.promises.unlink(file.filepath)

    return {
      filename,
      url: `${env.fileBaseUrl}/uploads/${filename}`,
    }
  },
}
