import { cookies } from 'next/headers'
import Dashboard from '@/components/Dashboard'
import Login from '@/components/Login'
import { hasValidSession } from '@/lib/session'

export default async function Home() {
  const session = cookies().get('session')

  if (!hasValidSession(session?.value, process.env.DASHBOARD_PASSWORD)) {
    return <Login />
  }

  return <Dashboard />
}
