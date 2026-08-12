'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)' }}>
      <form onSubmit={handleSubmit} className="glass p-8 w-full max-w-sm fade-in">
        <h1 className="text-2xl font-semibold mb-1 text-center" style={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <p className="text-sm opacity-50 text-center mb-8">Enter password to continue</p>

        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl border border-black/10 bg-white/50 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all"
          autoFocus
        />

        {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-4 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 disabled:opacity-30 transition-all"
        >
          {loading ? '…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
