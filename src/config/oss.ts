import OSS from 'ali-oss'

export interface OssClientOptions {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  authorizationV4: boolean
  endpoint?: string
}

let _client: OSS | null = null

export function getOssClient(): OSS {
  if (_client) return _client

  const region = process.env.OSS_REGION
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
  const bucket = process.env.OSS_BUCKET

  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw new Error(
      '[OSS] 配置不完整，请检查环境变量：OSS_REGION / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET'
    )
  }

  const options: OssClientOptions = {
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    authorizationV4: true,
  }


  const customDomain = process.env.OSS_CUSTOM_DOMAIN
  if (customDomain) {
    options.endpoint = customDomain.replace(/^https?:\/\//, '')
  }

  console.log("[debug:ossConfig] OSS Client Options:", options)


  _client = new OSS(options)
  return _client
}

export function isOssEnabled(): boolean {
  return process.env.OSS_ENABLED === 'true'
}

export function buildOssUrl(objectKey: string): string {
  const customDomain = process.env.OSS_CUSTOM_DOMAIN
  if (customDomain) {
    return `${customDomain.replace(/\/$/, '')}/${objectKey}`
  }

  const region = process.env.OSS_REGION!
  const bucket = process.env.OSS_BUCKET!
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`
}
