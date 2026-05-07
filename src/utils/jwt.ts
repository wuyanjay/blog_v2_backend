import jwt from 'jsonwebtoken'
import { env } from '../config'

export interface AccessTokenPayload {
  userId: string
  email: string
  roles: string[]
  sessionId: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpires as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload
}
