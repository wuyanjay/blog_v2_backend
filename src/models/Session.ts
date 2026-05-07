import { Document, Schema, Types, model } from 'mongoose'

export interface ISession extends Document {
  user: Types.ObjectId
  sessionId: string
  refreshTokenHash: string
  userAgent: string
  ip: string
  rememberMe: boolean
  expiresAt: Date
  lastSeenAt: Date
  revokedAt?: Date | null
  revokeReason?: string | null
  createdAt: Date
  updatedAt: Date
}

const SessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    rememberMe: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null },
  },
  { timestamps: true }
)

SessionSchema.index({ user: 1, expiresAt: 1 })

export const Session = model<ISession>('Session', SessionSchema)
