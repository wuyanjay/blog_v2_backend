import { createLogger, format, transports } from 'winston'

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, ...meta }) => {
      const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
      return `${timestamp} [${level}] ${message}${suffix}`
    })
  ),
  transports: [new transports.Console()],
})
