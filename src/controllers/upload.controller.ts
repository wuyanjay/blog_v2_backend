import { Context } from 'koa'
import { uploadService } from '../services/upload/uploadService'
import type { UploadType } from '../services/upload/uploadService'
import { SUCCESS_CODES } from '../utils/successCodes'
import { success } from '../utils/response'

export const uploadController = {
  async uploadImage(ctx: Context) {
    const file = (ctx as any).file as {
      buffer: Buffer
      mimetype: string
      size: number
      originalname: string
    } | undefined

    if (!file) {
      ctx.throw(400, '请选择要上传的文件，字段名必须为 "image"')
    }

    const rawType = ctx.query.type as string | undefined
    const type: UploadType = rawType === 'avatar' ? 'avatar' : 'post'

    const userId = ctx.state.user!.id

    const result = await uploadService.upload(file.buffer, file.mimetype, userId, type)

    success(ctx, result, SUCCESS_CODES.UPLOAD_SUCCESS, 201)
  },
}
