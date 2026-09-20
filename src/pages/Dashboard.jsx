import React, { useEffect, useState, useMemo } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import JoinWorkspace from '../components/JoinWorkspace.jsx'
import {
  MenuIcon,
  UsersIcon,
  CalendarIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  TargetIcon,
  PlusIcon,
} from '../components/Icons.jsx'
import {
  fetchCurrentUser,
  fetchDashboardOverview,
  fetchActiveCampaigns,
  toggleKillSwitch,
  signOutUser,
  linkAdminCode,
  DEFAULT_STATS,
  DEFAULT_CAMPAIGNS,
} from '../api.js'
import '../dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [campaigns, setCampaigns] = useState(DEFAULT_CAMPAIGNS)
  const [loading, setLoading] = useState(true)

  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  // Load user profile and dashboard stats using axios
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, statsData, campaignList] = await Promise.all([
          fetchCurrentUser(),
          fetchDashboardOverview(),
          fetchActiveCampaigns(),
        ])

        if (isMounted) {
          if (userData) setUser(userData)
          if (statsData) setStats(statsData)
          if (Array.isArray(campaignList)) setCampaigns(campaignList)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Handle logout
  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  // Handle Kill Switch Toggle
  const handleToggleKillSwitch = async () => {
    const newState = !killSwitchActive
    setKillSwitchActive(newState)
    try {
      await toggleKillSwitch(newState)
    } catch (err) {
      console.warn('Kill switch update failed:', err)
    }
  }

  // Filter campaigns by search query
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns
    const q = searchQuery.toLowerCase()
    return campaigns.filter(
      (c) =>
        (c.name || c.title || '').toLowerCase().includes(q) ||
        (c.description || c.subtitle || '').toLowerCase().includes(q) ||
        (c.icp || '').toLowerCase().includes(q) ||
        (c.company_size || c.companySize || '').toLowerCase().includes(q) ||
        (Array.isArray(c.channels) && c.channels.some((ch) => ch.toLowerCase().includes(q)))
    )
  }, [campaigns, searchQuery])

  // Personalized dynamic first name
  const firstName = useMemo(() => {
    if (!user?.name) return 'Alex'
    return user.name.split(' ')[0]
  }, [user?.name])

  const handleSelectTab = (tabId) => {
    if (tabId === 'campaigns') {
      navigate('/campaigns')
    } else if (tabId === 'settings') {
      navigate('/settings')
    } else if (tabId === 'conversations') {
      navigate('/conversations')
    } else if (tabId === 'analytics') {
      navigate('/analytics')
    } else {
      setActiveTab(tabId)
    }
  }

  useEffect(() => {
    if (user?.role === 'EXECUTIVE' || user?.role === 'EXE') {
      if (user?.admin_linked) {
        navigate('/conversations')
      }
    }
  }, [user])

  if (!loading && (user?.role === 'EXECUTIVE' || user?.role === 'EXE') && !user?.admin_linked) {
    return <JoinWorkspace onLinked={(u) => { setUser(u); navigate('/conversations') }} />
  }

  return (
    <div className="sdr-app-layout">
      {/* Left Sidebar */}
      <Sidebar activeTab="overview" onSelectTab={handleSelectTab} userRole={user?.role} />

      {/* Main Content Area */}
      <main className="sdr-main">
        <div className="sdr-container">
          {/* Header with Search and Profile Pill */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            user={user}
            onSignOut={handleSignOut}
            killSwitchActive={killSwitchActive}
            onToggleKillSwitch={handleToggleKillSwitch}
          />

          {/* Greeting and Kill Switch Row */}
          <section className="sdr-welcome-row" aria-label="Overview Greeting">
            <div className="sdr-greeting-box">
              <h1 className="sdr-greeting-title">Good Morning, {firstName}!</h1>
              <p className="sdr-greeting-subtitle">
                Here's what's happening with your Autonomous SDR
              </p>
            </div>

            <div className="sdr-kill-switch-pill">
              <span className="sdr-kill-switch-icon" aria-hidden="true">
                <AlertCircleIcon size={22} />
              </span>
              <div className="sdr-kill-switch-text">
                <span className="sdr-kill-switch-title">Global Kill Switch</span>
                <span className="sdr-kill-switch-desc">
                  Pause all autonomous activities
                </span>
              </div>
              <label className="sdr-toggle-switch" title="Toggle Kill Switch">
                <input
                  type="checkbox"
                  checked={killSwitchActive}
                  onChange={handleToggleKillSwitch}
                  aria-label="Global Kill Switch"
                />
                <span className="sdr-toggle-slider" />
              </label>
            </div>
          </section>

          {/* Key Metrics Overview Cards (4 cards) */}
          <section className="sdr-metrics-grid" aria-label="Key Metrics">
            {/* Card 1: Total Campaigns */}
            <div className="sdr-metric-card">
              <div className="sdr-metric-header">
                <span className="sdr-metric-icon">
                  <MenuIcon size={18} />
                </span>
                <span className="sdr-metric-title">Total Campaigns</span>
              </div>
              <div className="sdr-metric-value">{stats.totalCampaigns?.value ?? campaigns.length}</div>
              <div className="sdr-metric-footer">
                <span className="sdr-metric-tag">{stats.totalCampaigns?.live ?? 0} Live</span>
                <span className="sdr-metric-tag">{stats.totalCampaigns?.paused ?? 0} Pause</span>
              </div>
            </div>

            {/* Card 2: Total Prospects */}
            <div className="sdr-metric-card">
              <div className="sdr-metric-header">
                <span className="sdr-metric-icon">
                  <UsersIcon size={18} />
                </span>
                <span className="sdr-metric-title">Total Prospects</span>
              </div>
              <div className="sdr-metric-value">{stats.totalProspects?.value ?? 0}</div>
              <div className="sdr-metric-footer">
                <span className="sdr-metric-tag">{stats.totalProspects?.live ?? 0} Live</span>
              </div>
            </div>

            {/* Card 3: Meetings Booked */}
            <div className="sdr-metric-card">
              <div className="sdr-metric-header">
                <span className="sdr-metric-icon">
                  <CalendarIcon size={18} />
                </span>
                <span className="sdr-metric-title">Meetings Booked</span>
              </div>
              <div className="sdr-metric-value">{stats.meetingsBooked?.value ?? 0}</div>
              <div className="sdr-metric-footer">
                <span className="sdr-metric-tag">{stats.meetingsBooked?.live ?? 0} Live</span>
              </div>
            </div>

            {/* Card 4: Total Escalations */}
            <div className="sdr-metric-card">
              <div className="sdr-metric-header">
                <span className="sdr-metric-icon">
                  <AlertTriangleIcon size={18} />
                </span>
                <span className="sdr-metric-title">Total Escalations</span>
              </div>
              <div className="sdr-metric-value">{stats.totalEscalations?.value ?? 0}</div>
              <div className="sdr-metric-footer">
                <span className={`sdr-metric-tag ${stats.totalEscalations?.value > 0 ? 'alert' : ''}`}>
                  {stats.totalEscalations?.status ?? 'All resolved'}
                </span>
              </div>
            </div>
          </section>

          {/* Active Campaigns Section */}
          <section className="sdr-campaigns-section" aria-label="Active Campaigns">
            <div className="sdr-section-header-row">
              <h2 className="sdr-section-title">Active Campaigns</h2>
              {campaigns.length > 0 && (
                <button
                  type="button"
                  className="sdr-view-all-link"
                  onClick={() => navigate('/campaigns')}
                >
                  View all campaigns &rarr;
                </button>
              )}
            </div>

            {campaigns.length === 0 ? (
              <div className="sdr-campaign-empty-card dashboard-inline">
                <div className="sdr-empty-icon-circle">
                  <TargetIcon size={32} />
                </div>
                <h3 className="sdr-empty-title">Add your first campaign</h3>
                <p className="sdr-empty-subtitle">
                  There are currently no campaigns in your database. Launch your first autonomous SDR outreach campaign to start discovering leads and booking meetings.
                </p>
                <button
                  type="button"
                  className="sdr-primary-btn"
                  onClick={() => navigate('/campaigns')}
                >
                  <PlusIcon size={16} />
                  <span>Create Your First Campaign</span>
                </button>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="sdr-empty-results">
                No campaigns match "<strong>{searchQuery}</strong>". Try clearing your search.
              </div>
            ) : (
              <div className="sdr-campaigns-grid">
                {filteredCampaigns.map((campaign) => (
                  <article key={campaign.id} className="sdr-campaign-card">
                    <div className="sdr-campaign-top">
                      <div className="sdr-campaign-top-badge-row">
                        <h3 className="sdr-campaign-title">{campaign.name || campaign.title}</h3>
                        <span className={`sdr-badge ${campaign.status?.toLowerCase()}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="sdr-campaign-subtitle">
                        {campaign.description || campaign.subtitle || ''}
                      </p>
                    </div>

                    <div className="sdr-campaign-meta-table">
                      <div className="sdr-campaign-meta-row">
                        <span className="sdr-campaign-meta-key">ICP</span>
                        <span className="sdr-campaign-meta-value">{campaign.icp || '-'}</span>
                      </div>
                      <div className="sdr-campaign-meta-row">
                        <span className="sdr-campaign-meta-key">Company Size</span>
                        <span className="sdr-campaign-meta-value">
                          {campaign.company_size || campaign.companySize || '-'}
                        </span>
                      </div>
                      <div className="sdr-campaign-meta-row">
                        <span className="sdr-campaign-meta-key">Channels</span>
                        <div className="sdr-campaign-meta-value channels">
                          {(Array.isArray(campaign.channels) && campaign.channels.length > 0 ? campaign.channels : []).map((channel) => (
                            <span key={channel}>{channel}</span>
                          ))}
                          {(!Array.isArray(campaign.channels) || campaign.channels.length === 0) && (
                            <span>-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sdr-campaign-stats-list">
                      <div className="sdr-campaign-stat-item">
                        <span className="sdr-campaign-stat-number">{campaign.prospects ?? 0}</span>
                        <span className="sdr-campaign-stat-label">Prospects</span>
                      </div>
                      <div className="sdr-campaign-stat-item">
                        <span className="sdr-campaign-stat-number">{campaign.qualified ?? 0}</span>
                        <span className="sdr-campaign-stat-label">Qualified</span>
                      </div>
                      <div className="sdr-campaign-stat-item">
                        <span className="sdr-campaign-stat-number">{campaign.meetings ?? 0}</span>
                        <span className="sdr-campaign-stat-label">Meetings</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

