/* eslint-disable @typescript-eslint/no-unused-vars */
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const password = searchParams.get('password')
  const correctPassword = process.env.DASHBOARD_PASSWORD

  if (!correctPassword || password !== correctPassword) {
    return new Response('Invalid password', { status: 401 })
  }

  // Simple token - just use the password hash as session
  const token = Buffer.from(`auth:${Date.now()}`).toString('base64')

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
      'Content-Type': 'application/json',
    },
  })
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      'Content-Type': 'application/json',
    },
  })
}
