import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const REPOS = [
  { owner: 'jiracipika', repo: 'pitch-therapy' },
  { owner: 'jiracipika', repo: 'rent-central' },
]

/* eslint-disable @typescript-eslint/no-explicit-any */

async function fetchRepo(owner: string, repo: string) {
  const [commitsRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`),
    fetch(`https://api.github.com/repos/${owner}/${repo}`),
  ])

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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all(REPOS.map(r => fetchRepo(r.owner, r.repo)))
  const data = results.filter(Boolean)

  const feed = data
    .flatMap((r: any) =>
      r.recentCommits.map((c: any) => ({ ...c, repo: r.name, fullName: r.fullName }))
    )
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ repos: data, feed })
}
