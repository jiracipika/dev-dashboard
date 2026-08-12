import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasValidSession } from '@/lib/session'

const REPOS = [
  { owner: 'jiracipika', repo: 'pitch-therapy' },
  { owner: 'jiracipika', repo: 'rent-central' },
]

/* eslint-disable @typescript-eslint/no-explicit-any */

async function fetchRepo(owner: string, repo: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  let commitsRes: Response
  let repoRes: Response
  try {
    [commitsRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, {
        headers, signal: controller.signal, cache: 'no-store',
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers, signal: controller.signal, cache: 'no-store',
      }),
    ])
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }

  if (!commitsRes.ok || !repoRes.ok) {
    return null
  }

  const commits: any[] = await commitsRes.json()
  const repoData: any = await repoRes.json()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = commits.filter((c) => new Date(c.commit.author.date) >= today).length

  return {
    name: repo,
    fullName: `${owner}/${repo}`,
    description: repoData.description,
    language: repoData.language,
    stars: repoData.stargazers_count,
    defaultBranch: repoData.default_branch,
    latestCommit: commits[0] ? {
      sha: commits[0].sha.substring(0, 7),
      message: commits[0].commit.message.split('\n')[0],
      author: commits[0].commit.author.name,
      date: commits[0].commit.author.date,
      avatar: commits[0].author?.avatar_url,
    } : null,
    commitsToday: todayCount,
    recentCommits: commits.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
      avatar: c.author?.avatar_url,
      stats: c.stats ? {
        additions: c.stats.additions,
        deletions: c.stats.deletions,
        total: c.stats.total,
      } : null,
    })),
  }
}

export async function GET() {
  const session = cookies().get('session')
  if (!hasValidSession(session?.value, process.env.DASHBOARD_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all(REPOS.map(r => fetchRepo(r.owner, r.repo)))
  const data = results.filter(Boolean)

  if (data.length === 0) {
    return NextResponse.json(
      { error: 'GitHub data is temporarily unavailable' },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const feed = data
    .flatMap((r: any) =>
      r.recentCommits.map((c: any) => ({ ...c, repo: r.name, fullName: r.fullName }))
    )
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json(
    { repos: data, feed, partial: data.length !== REPOS.length },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
