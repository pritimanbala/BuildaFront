import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Token & User storage helpers
export function getStoredToken() {
  try {
    return localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  } catch {
    return ''
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem('access_token', token)
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('access_token')
      localStorage.removeItem('token')
    }
  } catch {}
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_user')
    }
  } catch {}
}

export function clearAuth() {
  setStoredToken(null)
  setStoredUser(null)
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
})

// Request interceptor: attach Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: capture access_token from response body
api.interceptors.response.use(
  (response) => {
    const token = response.data?.access_token || response.data?.token
    if (token) {
      setStoredToken(token)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized, clear invalid local token
      clearAuth()
    }
    return Promise.reject(error)
  }
)

// Plugin registry for extending axios behavior
const plugins = []

export function registerPlugin(plugin) {
  if (typeof plugin === 'function') {
    plugin(api)
    plugins.push(plugin)
  }
}

export function apiError(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.detail || error?.message || fallback
}

// Authentication API methods
export async function signIn(email, password) {
  const res = await api.post('/api/auth/signin', { email, password })
  const token = res.data?.access_token || res.data?.token
  if (token) setStoredToken(token)
  if (res.data) setStoredUser(res.data)
  return res.data
}

export async function signUp({ email, password, name, role }) {
  const res = await api.post('/api/auth/signup', { email, password, name, role })
  const token = res.data?.access_token || res.data?.token
  if (token) setStoredToken(token)
  if (res.data) setStoredUser(res.data)
  return res.data
}

export async function signOutUser() {
  try {
    await api.post('/api/auth/signout')
  } catch (err) {
    // Ignore signout network error
  } finally {
    clearAuth()
  }
}

// Default dashboard data matching design
export const DEFAULT_STATS = {
  totalCampaigns: { value: 0, live: 0, paused: 0, draft: 0 },
  totalProspects: { value: 0, live: 0 },
  meetingsBooked: { value: 0, live: 0 },
  totalEscalations: { value: 0, status: 'All resolved' },
}

export const DEFAULT_CAMPAIGNS = []

// Current user loader
export async function fetchCurrentUser() {
  // Check if URL has ?token=... (e.g. from Google OAuth callback)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setStoredToken(urlToken)
      params.delete('token')
      const newQuery = params.toString() ? `?${params.toString()}` : ''
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery}`)
    }
  }

  try {
    const { data } = await api.get('/api/auth/me')
    const user = {
      name: data.name || 'Alex Joe',
      email: data.email || 'alex.joe@example.com',
      role: data.role || 'Manager',
      id: data.id,
    }
    setStoredUser(user)
    return user
  } catch (error) {
    const cached = getStoredUser()
    if (cached) return cached

    // Graceful fallback for offline preview
    return {
      name: 'Alex Joe',
      email: 'alex.joe@example.com',
      role: 'Manager',
      isGuestFallback: true,
    }
  }
}

export async function fetchDashboardOverview() {
  try {
    const { data } = await api.get('/api/sdr/stats')
    return data
  } catch (err) {
    return DEFAULT_STATS
  }
}

export async function fetchActiveCampaigns(params = {}) {
  try {
    const { data } = await api.get('/api/campaigns', { params })
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('Failed to fetch campaigns from backend:', err)
    return []
  }
}

export async function createCampaign(payload) {
  const { data } = await api.post('/api/campaigns', payload)
  return data
}

export async function updateCampaignStatus(campaignId, status) {
  const { data } = await api.patch(`/api/campaigns/${campaignId}/status`, { status })
  return data
}

export async function updateCampaign(campaignId, payload) {
  const { data } = await api.put(`/api/campaigns/${campaignId}`, payload)
  return data
}

export async function deleteCampaign(campaignId) {
  await api.delete(`/api/campaigns/${campaignId}`)
  return true
}

export async function fetchCampaignDetails(campaignId) {
  const { data } = await api.get(`/api/campaigns/${campaignId}`)
  return data
}

export async function toggleKillSwitch(enabled) {
  try {
    const { data } = await api.post('/api/system/kill-switch', { enabled })
    return data.enabled
  } catch (err) {
    return enabled
  }
}

export async function fetchKillSwitch() {
  try {
    const { data } = await api.get('/api/system/kill-switch')
    return data.enabled
  } catch (err) {
    return true
  }
}


export const DEFAULT_SETTINGS = {
  general: {
    workspace_name: 'Autonomous SDR',
    workspace_description: 'AI-powered autonomous sales development platform',
    timezone: 'Asia/Kolkata (IST)',
    language: 'English',
  },
  notifications: {
    email_notifications: true,
    escalation_alerts: true,
    daily_performance_summary: true,
  },
  workspace: {
    default_campaign_limit: 100,
    data_retention_days: 90,
  },
  integrations: {
    gmail_connected: true,
    linkedin_connected: true,
    sms_connected: false,
  },
  permissions: {
    allow_rep_escalations: true,
    require_admin_approval: true,
  },
  security: {
    two_factor_auth: false,
    session_timeout_minutes: 60,
  },
}

export async function fetchSettings() {
  try {
    const { data } = await api.get('/api/settings')
    return data
  } catch (err) {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(payload) {
  try {
    const { data } = await api.put('/api/settings', payload)
    return data
  } catch (err) {
    return payload
  }
}

// Conversations & Escalations Data
export const DEFAULT_CONVERSATION_SUMMARY = {
  active_conversations: 142,
  needs_attention: 8,
  ai_handling: 117,
  human_takeover: 17,
}

export const DEFAULT_RECENT_CONVERSATIONS = [
  {
    id: 'conv-1',
    prospect_name: 'Sarah Chen',
    prospect_initials: 'SC',
    title: 'CTO',
    company: 'Nova Systems',
    time_ago: '8 min ago',
    campaign_name: 'US SaaS CTO Outreach',
    channel: 'Email',
    status: 'NEEDS_ATTENTION',
    status_label: 'Needs Attention',
    latest_message:
      'Can you send me pricing details on your enterprise tier? We have custom security requirements.',
    action_type: 'takeover',
    history: [
      {
        sender: 'AI SDR',
        time: '15 min ago',
        text: 'Hi Sarah, noticed Nova Systems is scaling engineering. PulseOps AI helps engineering leaders reduce on-call fatigue.',
      },
      {
        sender: 'Sarah Chen',
        time: '8 min ago',
        text: 'Can you send me pricing details on your enterprise tier? We have custom security requirements.',
      },
    ],
  },
  {
    id: 'conv-2',
    prospect_name: 'Alex Morgan',
    prospect_initials: 'AM',
    title: 'VP Engineering',
    company: 'Acme AI',
    time_ago: '2 min ago',
    campaign_name: 'US SaaS CTO Outreach',
    channel: 'LinkedIn',
    status: 'AI_HANDLING',
    status_label: 'AI Handling',
    latest_message:
      'Thanks for reaching out. Yes, we are currently exploring outbound automation solutions.',
    action_type: 'review',
    history: [
      {
        sender: 'AI SDR',
        time: '1 hour ago',
        text: 'Hi Alex, following up on your voice AI initiatives. We integrate with major LLMs for automated SDR outreach.',
      },
      {
        sender: 'Alex Morgan',
        time: '2 min ago',
        text: 'Thanks for reaching out. Yes, we are currently exploring outbound automation solutions.',
      },
    ],
  },
  {
    id: 'conv-3',
    prospect_name: 'Rahul Mehta',
    prospect_initials: 'RM',
    title: 'CIO',
    company: 'FinBank India',
    time_ago: '14 min ago',
    campaign_name: 'India BFSI Digital Transformation',
    channel: 'Email',
    status: 'ESCALATED',
    status_label: 'Escalated',
    latest_message:
      "We require fully on-prem hosting with absolute data sovereignty. Let's schedule a deep-dive call next week.",
    action_type: 'review',
    history: [
      {
        sender: 'AI SDR',
        time: '2 hours ago',
        text: 'Dear Mr. Mehta, hope this email finds you well. Are you evaluating enterprise security compliance for automated workflows?',
      },
      {
        sender: 'Rahul Mehta',
        time: '14 min ago',
        text: "We require fully on-prem hosting with absolute data sovereignty. Let's schedule a deep-dive call next week.",
      },
    ],
  },
]

export const DEFAULT_ESCALATIONS = [
  {
    id: 'esc-1',
    priority: 'High',
    prospect_name: 'James Wilson',
    campaign_name: 'Voice AI Founders',
    reason: 'Pricing objection',
    status: 'Open',
  },
  {
    id: 'esc-2',
    priority: 'Medium',
    prospect_name: 'Sarah Chen',
    campaign_name: 'US SaaS CTO',
    reason: 'Integration question',
    status: 'In Progress',
  },
  {
    id: 'esc-3',
    priority: 'Low',
    prospect_name: 'Priya Shah',
    campaign_name: 'India BFSI',
    reason: 'Compliance question',
    status: 'Resolved',
  },
]

export async function fetchConversationSummary() {
  try {
    const { data } = await api.get('/api/conversations/summary')
    return data
  } catch (err) {
    return DEFAULT_CONVERSATION_SUMMARY
  }
}

export async function fetchRecentConversations() {
  try {
    const { data } = await api.get('/api/conversations/recent')
    return data
  } catch (err) {
    return DEFAULT_RECENT_CONVERSATIONS
  }
}

export async function fetchEscalations() {
  try {
    const { data } = await api.get('/api/conversations/escalations')
    return data
  } catch (err) {
    return DEFAULT_ESCALATIONS
  }
}

export async function takeoverConversation(id) {
  try {
    const { data } = await api.post(`/api/conversations/${id}/takeover`)
    return data
  } catch (err) {
    return { status: 'ok', conversation_id: id, mode: 'human_takeover' }
  }
}

export async function resolveEscalation(id) {
  try {
    const { data } = await api.post(`/api/conversations/${id}/resolve`)
    return data
  } catch (err) {
    return { status: 'ok', escalation_id: id, status_label: 'Resolved' }
  }
}

// ───────────────────── ANALYTICS API ─────────────────────

export const DEFAULT_ANALYTICS_OVERVIEW = {
  stats: DEFAULT_STATS,
  trend: {
    dates: ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27'],
    series: [],
  },
  comparison: [],
  channel_metrics: [],
  team_performance: [],
}

export async function fetchAnalyticsOverview(params = {}) {
  try {
    const { data } = await api.get('/api/analytics/overview', { params })
    return data
  } catch (err) {
    console.warn('Failed to fetch analytics overview from API, using fallback data:', err)
    return DEFAULT_ANALYTICS_OVERVIEW
  }
}

export async function fetchAnalyticsTeam() {
  try {
    const { data } = await api.get('/api/analytics/team')
    return Array.isArray(data) ? data : DEFAULT_ANALYTICS_OVERVIEW.team_performance
  } catch (err) {
    return DEFAULT_ANALYTICS_OVERVIEW.team_performance
  }
}

export async function fetchAnalyticsTrend(params = {}) {
  try {
    const { data } = await api.get('/api/analytics/trend', { params })
    return data
  } catch (err) {
    return DEFAULT_ANALYTICS_OVERVIEW.trend
  }
}

export async function fetchAnalyticsComparison() {
  try {
    const { data } = await api.get('/api/analytics/comparison')
    return Array.isArray(data) ? data : DEFAULT_ANALYTICS_OVERVIEW.comparison
  } catch (err) {
    return DEFAULT_ANALYTICS_OVERVIEW.comparison
  }
}

// ───────────────────── CAMPAIGN OUTREACH API ─────────────────────

export async function fetchCampaignOutreach(campaignId) {
  try {
    const { data } = await api.get(`/api/campaigns/${campaignId}/outreach`)
    return data
  } catch (err) {
    console.warn(`Failed to fetch outreach for campaign ${campaignId}:`, err)
    return null
  }
}

export async function searchCampaignOutreach(campaignId, payload = {}) {
  try {
    const { data } = await api.post(`/api/campaigns/${campaignId}/outreach/search`, payload)
    return data
  } catch (err) {
    console.warn(`Failed to search outreach prospects for campaign ${campaignId}:`, err)
    return { success: false, results: [], links: [] }
  }
}

export async function addProspectToCampaign(campaignId, prospectData) {
  try {
    const { data } = await api.post(`/api/campaigns/${campaignId}/outreach/add-prospect`, prospectData)
    return data
  } catch (err) {
    console.error(`Failed to add prospect to campaign ${campaignId}:`, err)
    throw err
  }
}



