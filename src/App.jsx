import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Campaigns from './pages/Campaigns.jsx'
import Settings from './pages/Settings.jsx'
import Conversations from './pages/Conversations.jsx'
import Analytics from './pages/Analytics.jsx'
import Outreach from './pages/Outreach.jsx'
import NotFound from './pages/NotFound.jsx'
import ConversationReview from './pages/ConversationReview.jsx'
import JoinWorkspace from './components/JoinWorkspace.jsx'
import { getStoredToken, getStoredUser, fetchCurrentUser } from './api.js'

const pages = {
  '/': Login,
  '/login': Login,
  '/signup': Signup,
  '/dashboard': Dashboard,
  '/campaigns': Campaigns,
  '/outreach': Outreach,
  '/settings': Settings,
  '/conversations': Conversations,
  '/analytics': Analytics,
}

export function navigate(to) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function AppLink({ to, children, ...props }) {
  return <a href={to} onClick={(event) => { event.preventDefault(); navigate(to) }} {...props}>{children}</a>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [user, setUser] = useState(() => getStoredUser())

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname)
      setUser(getStoredUser())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (getStoredToken()) {
      fetchCurrentUser().then((u) => {
        if (u) setUser(u)
      }).catch(() => {})
    }
  }, [path])

  const isExecutive = user && (user.role === 'EXECUTIVE' || user.role === 'EXE')

  // Redirection & protection for executives:
  useEffect(() => {
    if (isExecutive) {
      if (user.admin_linked) {
        if (path === '/' || path === '/dashboard' || path === '/campaigns') {
          navigate('/conversations')
        }
      }
    }
  }, [isExecutive, user?.admin_linked, path])

  if (path.startsWith('/review/')) {
    return <ConversationReview />
  }

  // If user is executive and NOT admin_linked, gate all protected routes
  const isAuthPage = path === '/' || path === '/login' || path === '/signup'
  if (isExecutive && !user.admin_linked && !isAuthPage) {
    return <JoinWorkspace onLinked={(updated) => { setUser(updated); navigate('/conversations'); }} />
  }

  // If executive tries to access campaigns directly, redirect to conversations
  if (isExecutive && user.admin_linked && path === '/campaigns') {
    return <Conversations />
  }

  const Page = pages[path] || NotFound
  return <Page />
}

