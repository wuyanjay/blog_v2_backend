import 'koa'

export interface AuthUser {
  id: string
  email: string
  roles: string[]
  sessionId: string
}

export interface SessionCachePayload {
  userId: string
  email: string
  roles: string[]
  expiresAt: string
}

export type PostVisibility = 'private' | 'public'

declare module 'koa' {
  interface DefaultState {
    user?: AuthUser
    token?: string
  }
}
