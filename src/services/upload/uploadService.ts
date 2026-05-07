import { isOssEnabled } from '../../config/oss'
import { ossUploadService } from './ossUploadService'
import { localUploadService } from './localUploadService'
import type { UploadType, UploadResult } from './ossUploadService'

export const uploadService = {
  upload(
    buffer: Buffer,
    mimeType: string,
    userId: string,
    type: UploadType = 'post'
  ): Promise<UploadResult> {
    return isOssEnabled()
      ? ossUploadService.upload(buffer, mimeType, userId, type)
      : localUploadService.upload(buffer, mimeType, userId, type)
  },

  delete(objectKey: string): Promise<void> {
    return isOssEnabled()
      ? ossUploadService.delete(objectKey)
      : localUploadService.delete(objectKey)
  },
}

export type { UploadType, UploadResult }
