import crypto from 'crypto'
import { env } from '../config'
import { msToSeconds, parseDurationToMs } from './time'

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createVerifyToken() {
  return crypto.randomUUID()
}

export function createRefreshToken() {
  return crypto.randomUUID()
}

export function getSessionExpiryDate(rememberMe: boolean) {
  const ms = parseDurationToMs(
    rememberMe ? env.authSessionRememberExpires : env.authSessionExpires
  )
  return new Date(Date.now() + ms)
}

export function getSessionTTLSeconds(expiresAt: Date) {
  return msToSeconds(expiresAt.getTime() - Date.now())
}
