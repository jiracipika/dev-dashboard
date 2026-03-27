import { cookies } from 'next/headers'
import Dashboard from '@/components/Dashboard'
import Login from '@/components/Login'

export default async function Home() {
  const session = cookies().get('session')

  if (!session) {
    return <Login />
  }

  return <Dashboard />
}
