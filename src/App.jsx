import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotFound from './pages/NotFound.jsx'

const pages = { '/': Login, '/login': Login, '/signup': Signup, '/dashboard': Dashboard }

export function navigate(to) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function AppLink({ to, children, ...props }) {
  return <a href={to} onClick={(event) => { event.preventDefault(); navigate(to) }} {...props}>{children}</a>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const Page = pages[path] || NotFound
  return <Page />
}
