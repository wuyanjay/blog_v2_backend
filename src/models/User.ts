import bcrypt from 'bcryptjs'
import { Document, Schema, model } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  nickname: string
  avatar: string
  bio: string
  emailVerified: boolean
  emailVerifyTokenHash?: string | null
  emailVerifyExpires?: Date | null
  loginLockedUntil?: Date | null
  followersCount: number
  followingCount: number
  postsCount: number
  totalLikes: number
  resetPasswordToken?: string | null
  resetPasswordExpires?: Date | null
  comparePassword(password: string): Promise<boolean>
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nickname: { type: String, default: '', maxlength: 50 },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    loginLockedUntil: { type: Date, default: null },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash)
}

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const output = ret as unknown as Record<string, unknown>
    delete output.passwordHash
    delete output.emailVerifyTokenHash
    delete output.emailVerifyExpires
    delete output.resetPasswordToken
    delete output.resetPasswordExpires
    return ret
  },
})

export const User = model<IUser>('User', UserSchema)
