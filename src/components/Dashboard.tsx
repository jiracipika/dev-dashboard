'use client'

import { useState, useEffect, useCallback } from 'react'

interface Commit {
  sha: string
  message: string
  author: string
  date: string
  avatar?: string | null
  stats?: { additions: number; deletions: number; total: number } | null
  repo?: string
  fullName?: string
}

interface RepoData {
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  defaultBranch: string
  latestCommit: Commit | null
  commitsToday: number
  recentCommits: Commit[]
}

interface DashboardData {
  repos: RepoData[]
  feed: (Commit & { repo: string; fullName: string })[]
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeRepo, setActiveRepo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/repos')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      // silently retry
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const selectedRepo = data.repos.find(r => r.name === activeRepo)

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 fade-in">
        <div>
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>Dev Dashboard</h1>
          <p className="text-xs opacity-40 mt-0.5">Auto-refreshes every 30s</p>
        </div>
        <button onClick={handleLogout} className="text-xs opacity-40 hover:opacity-70 transition-opacity">
          Sign out
        </button>
      </header>

      {selectedRepo ? (
        /* Repo Detail View */
        <div className="fade-in">
          <button onClick={() => setActiveRepo(null)} className="text-sm opacity-50 hover:opacity-80 mb-4 inline-flex items-center gap-1 transition-opacity">
            ← Back
          </button>
          <h2 className="text-xl font-semibold mb-1" style={{ letterSpacing: '-0.01em' }}>{selectedRepo.fullName}</h2>
          {selectedRepo.description && <p className="text-sm opacity-50 mb-6">{selectedRepo.description}</p>}

          <div className="flex gap-3 mb-6">
            {selectedRepo.language && (
              <span className="text-xs px-3 py-1 rounded-full glass">{selectedRepo.language}</span>
            )}
            <span className="text-xs px-3 py-1 rounded-full glass">⭐ {selectedRepo.stars}</span>
            <span className="text-xs px-3 py-1 rounded-full glass">Today: {selectedRepo.commitsToday} commits</span>
          </div>

          <div className="space-y-3">
            {selectedRepo.recentCommits.map((c, i) => (
              <div key={c.sha + i} className="glass p-4 fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.message}</p>
                    <p className="text-xs opacity-40 mt-1">
                      <span className="font-mono text-[11px] opacity-60">{c.sha}</span>
                      {' · '}
                      {c.author}
                      {' · '}
                      {timeAgo(c.date)}
                    </p>
                  </div>
                  {c.stats && (
                    <div className="flex gap-2 text-[11px] shrink-0 mt-0.5">
                      <span className="text-green-500">+{c.stats.additions}</span>
                      <span className="text-red-400">−{c.stats.deletions}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Overview */
        <>
          {/* Repo Cards */}
          <div className="grid gap-4 sm:grid-cols-2 mb-10">
            {data.repos.map((repo, i) => (
              <button
                key={repo.name}
                onClick={() => setActiveRepo(repo.name)}
                className="glass p-5 text-left hover:scale-[1.01] transition-transform fade-in cursor-pointer"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>{repo.fullName}</h3>
                    {repo.description && (
                      <p className="text-xs opacity-40 mt-1 line-clamp-1">{repo.description}</p>
                    )}
                  </div>
                  {repo.language && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5">{repo.language}</span>
                  )}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  {repo.latestCommit ? (
                    <div className="min-w-0">
                      <p className="text-xs opacity-70 truncate">{repo.latestCommit.message}</p>
                      <p className="text-[11px] opacity-35 mt-0.5">{timeAgo(repo.latestCommit.date)}</p>
                    </div>
                  ) : (
                    <p className="text-xs opacity-30">No commits</p>
                  )}
                  {repo.commitsToday > 0 && (
                    <span className="text-[11px] text-blue-500 font-medium shrink-0 ml-2">
                      {repo.commitsToday} today
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Activity Feed */}
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ letterSpacing: '-0.01em' }}>Activity</h2>
            <div className="space-y-2">
              {data.feed.map((item, i) => (
                <button
                  key={item.sha + i}
                  onClick={() => setActiveRepo(item.repo)}
                  className="glass p-4 w-full text-left hover:scale-[1.005] transition-transform fade-in cursor-pointer"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                      {item.repo.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.message}</p>
                      <p className="text-[11px] opacity-35">
                        {item.fullName} · <span className="font-mono">{item.sha}</span> · {timeAgo(item.date)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {data.feed.length === 0 && (
                <p className="text-sm opacity-30 text-center py-8">No activity yet</p>
              )}
            </div>
          </div>

          {/* Refresh indicator */}
          <div className="fixed bottom-4 right-4 flex items-center gap-2 text-[11px] opacity-30">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
            Live
          </div>
        </>
      )}
    </div>
  )
}
