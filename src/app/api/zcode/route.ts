import { spawn } from 'child_process'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/session'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Registry of local project workspaces ZCode can be spawned into.
const WORKSPACES: Record<string, string> = {
  'dev-dashboard': '/Volumes/HARD/projects/dev-dashboard',
  'printshop-sim': '/Volumes/HARD/projects/printshop-sim',
  'friday-evacuation': '/Volumes/HARD/projects/friday-evacuation',
  breakrun: '/Volumes/HARD/projects/breakrun',
  'mc-sportscars': '/Volumes/HARD/projects/mc-sportscars',
  'polymarket-paper-bot': '/Volumes/HARD/projects/polymarket-paper-bot',
  'ai-trader': '/Volumes/HARD/projects/ai-trader',
}

// Absolute exclusions per standing user directive.
const BLOCKED = ['pitch-therapy', 'pitchforge', 'automated-newsletter']

interface Task {
  id: string
  prompt: string
  cwd: string
  workspace: string
  mode: string
  status: 'running' | 'done' | 'error'
  exitCode: number | null
  output: string
  startedAt: string
  finishedAt?: string
}

// In-memory task registry (per server process; dev-friendly).
const g = globalThis as any
g.__zcodeTasks = g.__zcodeTasks || new Map<string, Task>()
const tasks: Map<string, Task> = g.__zcodeTasks

function runZCode(task: Task) {
  const child = spawn('/usr/local/bin/zcode-run', ['-p', task.prompt, '--cwd', task.cwd, '--mode', task.mode], {
    env: { ...process.env, HOME: process.env.HOME || '/Users/rs-mac' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let out = ''
  const cap = 60_000
  child.stdout.on('data', (d) => { if (out.length < cap) out += d.toString() })
  child.stderr.on('data', (d) => { if (out.length < cap) out += d.toString() })
  child.on('exit', (code) => {
    task.exitCode = code
    task.status = code === 0 ? 'done' : 'error'
    task.output = out
    task.finishedAt = new Date().toISOString()
  })
  child.on('error', (err) => {
    task.status = 'error'
    task.exitCode = -1
    task.output = String(err)
    task.finishedAt = new Date().toISOString()
  })
}

export async function GET() {
  const session = cookies().get('session')
  if (!hasValidSession(session?.value, process.env.DASHBOARD_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const list = Array.from(tasks.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return NextResponse.json(
    {
      tasks: list.map(({ output, ...t }) => ({ ...t, outputTail: output.slice(-400) })),
      workspaces: Object.keys(WORKSPACES),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST(req: Request) {
  const session = cookies().get('session')
  if (!hasValidSession(session?.value, process.env.DASHBOARD_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 8000) : ''
  const workspace = typeof body.workspace === 'string' ? body.workspace : ''
  const mode = ['build', 'edit', 'plan', 'yolo'].includes(body.mode) ? body.mode : 'build'
  const web = Boolean(body.web)

  // ZCode Web window mode: return a spawn command the client opens via its own shell.
  if (web) {
    const dir = WORKSPACES[workspace]
    if (!dir) return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 })
    return NextResponse.json({
      ok: true,
      web: true,
      command: `/usr/local/bin/zcode-run --web --workspace ${dir}`,
      url: `http://127.0.0.1:3030`,
    })
  }

  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  if (!workspace || !WORKSPACES[workspace]) {
    return NextResponse.json({ error: 'Unknown workspace' }, { status: 400 })
  }

  const cwd = WORKSPACES[workspace]
  const lower = `${prompt} ${workspace} ${cwd}`.toLowerCase()
  if (BLOCKED.some((b) => lower.includes(b))) {
    return NextResponse.json({ error: 'Blocked workspace/exclusion list' }, { status: 403 })
  }

  const id = `zc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const task: Task = {
    id, prompt, cwd, workspace, mode, status: 'running', exitCode: null, output: '',
    startedAt: new Date().toISOString(),
  }
  tasks.set(id, task)
  // Cap the registry.
  if (tasks.size > 50) {
    const oldest = Array.from(tasks.values()).sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]
    tasks.delete(oldest.id)
  }
  runZCode(task)
  return NextResponse.json({ ok: true, id, cwd, mode })
}
