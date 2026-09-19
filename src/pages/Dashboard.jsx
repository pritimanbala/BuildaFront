import { useEffect, useState } from 'react'
import { navigate } from '../App.jsx'
import { api } from '../api.js'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => setUser(data)).catch(() => navigate('/login'))
  }, [])
  const signOut = async () => { await api.post('/api/auth/signout'); navigate('/login') }
  if (!user) return <main className="dashboard"><p>Loading your account…</p></main>
  return <main className="dashboard"><h1>Welcome back{user.name ? `, ${user.name}` : ''}!</h1><p>{user.email} · {user.role}</p><button className="sign-in" onClick={signOut}>Sign out</button></main>
}
