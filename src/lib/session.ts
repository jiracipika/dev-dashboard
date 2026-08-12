import { createHmac, timingSafeEqual } from 'crypto'

export const SESSION_MAX_AGE = 60 * 60 * 24

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createSession(secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }),
  ).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

export function hasValidSession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const received = Buffer.from(signature)
  const expected = Buffer.from(sign(payload, secret))
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }
    return typeof exp === 'number' && Number.isSafeInteger(exp) && exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
