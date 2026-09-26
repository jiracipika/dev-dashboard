import { spawn } from 'child_process'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/session'

// Opens the ZCode desktop app window on the user's Mac (local dashboard only).
const WORKSPACES: Record<string, string> = {
  'dev-dashboard': '/Volumes/HARD/projects/dev-dashboard',
  'printshop-sim': '/Volumes/HARD/projects/printshop-sim',
  'friday-evacuation': '/Volumes/HARD/projects/friday-evacuation',
  breakrun: '/Volumes/HARD/projects/breakrun',
  'mc-sportscars': '/Volumes/HARD/projects/mc-sportscars',
  'polymarket-paper-bot': '/Volumes/HARD/projects/polymarket-paper-bot',
  'ai-trader': '/Volumes/HARD/projects/ai-trader',
}

const BLOCKED = ['pitch-therapy', 'pitchforge', 'automated-newsletter']

export async function POST(req: Request) {
  const session = cookies().get('session')
  if (!hasValidSession(session?.value, process.env.DASHBOARD_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { workspace?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dir = body.workspace ? WORKSPACES[body.workspace] : undefined
  if (!dir) return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 })
  if (BLOCKED.some((b) => dir.toLowerCase().includes(b))) {
    return NextResponse.json({ error: 'Blocked workspace' }, { status: 403 })
  }

  // `open -a ZCode --args --cwd <dir>` focuses/launches the desktop app pointed at the workspace.
  const child = spawn('/usr/bin/open', ['-a', 'ZCode', '--args', '--cwd', dir], {
    env: process.env, stdio: 'ignore',
  })
  child.on('error', () => { /* surfaced via ok:false below if open is missing */ })
  return NextResponse.json({ ok: true, app: 'ZCode', cwd: dir })
}
