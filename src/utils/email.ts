import nodemailer from 'nodemailer'
import { env } from '../config'

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
})

export async function sendEmailVerificationEmail(to: string, token: string) {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: '验证您的邮箱',
    html: `
      <h2>邮箱验证</h2>
      <p>请点击以下链接完成邮箱验证，链接 24 小时内有效：</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: '重置您的密码',
    html: `
      <h2>密码重置</h2>
      <p>请点击以下链接重置密码，链接 30 分钟内有效：</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `,
  })
}
