'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Task {
  id: string
  prompt: string
  workspace: string
  mode: string
  status: 'running' | 'done' | 'error'
  exitCode?: number | null
  outputTail?: string
  startedAt: string
  finishedAt?: string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function ZCodePanel() {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [mode, setMode] = useState('build')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/zcode')
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok) return
      const json = await res.json()
      if (Array.isArray(json.tasks)) setTasks(json.tasks)
      if (Array.isArray(json.workspaces)) {
        setWorkspaces(json.workspaces)
        setWorkspace((w) => w || json.workspaces[0] || '')
      }
    } catch { /* dashboard offline */ }
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
    pollRef.current = setInterval(refresh, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [open, refresh])

  const submit = async () => {
    if (!prompt.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/zcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, workspace, mode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Spawn failed')
      setPrompt('')
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spawn failed')
    } finally {
      setSubmitting(false)
    }
  }

  const openWeb = async () => {
    setError(null)
    try {
      // Launch the ZCode desktop app pointed at the workspace.
      const res = await fetch('/api/zcode-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to open ZCode')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open ZCode')
    }
  }

  const running = tasks.filter((t) => t.status === 'running').length

  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass p-4 w-full flex items-center justify-between cursor-pointer hover:scale-[1.005] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold">Z</div>
          <div className="text-left">
            <p className="text-sm font-medium">ZCode Tasks</p>
            <p className="text-[11px] opacity-40">
              {running > 0 ? `${running} running` : 'Idle'} · headless GLM agent · 0.67x usage
            </p>
          </div>
        </div>
        <span className="text-xs opacity-40">{open ? 'Hide' : 'Open'}</span>
      </button>

      {open && (
        <div className="glass p-4 mt-3 fade-in space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border-0 outline-none"
            >
              {workspaces.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border-0 outline-none"
            >
              <option value="build">build</option>
              <option value="edit">edit</option>
              <option value="plan">plan</option>
              <option value="yolo">yolo</option>
            </select>
            <button
              onClick={openWeb}
              className="text-xs px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:opacity-70 shrink-0"
            >
              Open ZCode app ↗
            </button>
          </div>

          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              placeholder="Task for ZCode… (⌘+Enter to spawn)"
              rows={2}
              className="flex-1 text-sm px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border-0 outline-none resize-none"
            />
            <button
              onClick={submit}
              disabled={submitting || !prompt.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 self-end shrink-0"
            >
              {submitting ? '…' : 'Spawn'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs truncate flex-1">{t.prompt}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                    t.status === 'running' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                    : t.status === 'done' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                    : 'bg-red-500/20 text-red-500'
                  }`}>
                    {t.status === 'running' ? '● running' : t.status === 'done' ? `✓ exit ${t.exitCode ?? 0}` : `✗ exit ${t.exitCode}`}
                  </span>
                </div>
                <p className="text-[10px] opacity-35 mt-1">
                  {t.workspace || '~'} · {t.mode} · {timeAgo(t.startedAt)}
                </p>
                {t.outputTail && t.status !== 'running' && (
                  <pre className="text-[10px] opacity-50 mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">{t.outputTail}</pre>
                )}
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs opacity-30 text-center py-4">No ZCode tasks yet</p>}
          </div>
        </div>
      )}
    </div>
  )
}
