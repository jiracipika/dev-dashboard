import { NextResponse } from 'next/server'
import { createSession, SESSION_MAX_AGE } from '@/lib/session'

export async function POST(request: Request) {
  let password: unknown
  try {
    ({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const correctPassword = process.env.DASHBOARD_PASSWORD

  if (!correctPassword || typeof password !== 'string' || password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: 'session',
    value: createSession(correctPassword),
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: 'session',
    value: '',
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  })
  return response
}
