import React, { useEffect, useState, useMemo } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  BarChartIcon,
  SearchIcon,
  AlertCircleIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  TargetIcon,
  LinkedInIcon,
  EmailIcon,
  OutreachIcon,
} from '../components/Icons.jsx'
import {
  fetchCurrentUser,
  fetchKillSwitch,
  toggleKillSwitch,
  signOutUser,
  fetchActiveCampaigns,
  fetchDashboardOverview,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  DEFAULT_STATS,
} from '../api.js'
import '../dashboard.css'

export default function Campaigns() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')

  // Modals & toast
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Create Campaign Form State
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    target_roles: '',
    company_size: '',
    channels: ['LinkedIn', 'Gmail'],
    geography: '',
    daily_limit: 50,
    status: 'LIVE',
    requires_approval: true,
  })

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Load backend data
  const loadData = async () => {
    try {
      setLoading(true)
      const [userData, killData, campList, statsData] = await Promise.all([
        fetchCurrentUser(),
        fetchKillSwitch(),
        fetchActiveCampaigns(),
        fetchDashboardOverview(),
      ])
      if (userData) setUser(userData)
      setKillSwitchActive(killData)
      setCampaigns(Array.isArray(campList) ? campList : [])
      if (statsData) setStats(statsData)
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (user?.role === 'EXECUTIVE' || user?.role === 'EXE') {
      navigate('/conversations')
    }
  }, [user])

  // Handle logout
  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  // Handle Kill Switch
  const handleToggleKillSwitch = async () => {
    const newState = !killSwitchActive
    setKillSwitchActive(newState)
    try {
      await toggleKillSwitch(newState)
      showToast(newState ? 'Global Kill Switch engaged' : 'Global Kill Switch paused')
    } catch (err) {
      console.warn('Kill switch update failed:', err)
    }
  }

  // Navigation from Sidebar
  const handleNavSelect = (tabId) => {
    if (tabId === 'overview') {
      navigate('/dashboard')
    } else if (tabId === 'settings') {
      navigate('/settings')
    } else if (tabId === 'conversations') {
      navigate('/conversations')
    } else if (tabId === 'analytics') {
      navigate('/analytics')
    } else if (tabId === 'campaigns') {
      // already on campaigns
    } else {
      navigate('/dashboard')
    }
  }

  // Computed summary counts from real campaigns
  const summaryCounts = useMemo(() => {
    const total = campaigns.length
    const live = campaigns.filter((c) => c.status === 'LIVE').length
    const paused = campaigns.filter((c) => c.status === 'PAUSED').length
    const draft = campaigns.filter((c) => c.status === 'DRAFT').length
    return { total, live, paused, draft }
  }, [campaigns])

  // Unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set()
    campaigns.forEach((c) => {
      if (c.owner_name) owners.add(c.owner_name)
    })
    return Array.from(owners)
  }, [campaigns])

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = (c.name || c.title || '').toLowerCase().includes(q)
        const icpMatch = (c.icp || '').toLowerCase().includes(q)
        const descMatch = (c.description || c.subtitle || '').toLowerCase().includes(q)
        const ownerMatch = (c.owner_name || '').toLowerCase().includes(q)
        if (!titleMatch && !icpMatch && !descMatch && !ownerMatch) return false
      }

      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false
      }

      // Owner filter
      if (ownerFilter !== 'ALL' && c.owner_name !== ownerFilter) {
        return false
      }

      // Channel filter
      if (channelFilter !== 'ALL') {
        const chList = Array.isArray(c.channels) ? c.channels : []
        const hasChannel = chList.some((ch) => {
          const upper = ch.toUpperCase()
          if (channelFilter === 'EMAIL' && (upper.includes('GMAIL') || upper.includes('EMAIL'))) return true
          if (channelFilter === 'LINKEDIN' && upper.includes('LINKEDIN')) return true
          if (channelFilter === 'SMS' && upper.includes('SMS')) return true
          if (channelFilter === 'VOICE' && (upper.includes('VOICE') || upper.includes('PHONE'))) return true
          return upper.includes(channelFilter)
        })
        if (!hasChannel) return false
      }

      return true
    })
  }, [campaigns, searchQuery, statusFilter, ownerFilter, channelFilter])

  // Channel checkbox toggle in form
  const handleChannelToggle = (channelName) => {
    setFormData((prev) => {
      const exists = prev.channels.includes(channelName)
      const updated = exists
        ? prev.channels.filter((c) => c !== channelName)
        : [...prev.channels, channelName]
      return { ...prev, channels: updated.length > 0 ? updated : [channelName] }
    })
  }

  // Create Campaign Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('Please enter a campaign name')
      return
    }

    try {
      setSubmitting(true)
      const targetRolesArray = formData.target_roles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
      const geographyArray = formData.geography
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)

      const payload = {
        name: formData.name.trim(),
        description: formData.objective.trim() || undefined,
        objective: formData.objective.trim() || undefined,
        target_roles: targetRolesArray,
        company_size: formData.company_size.trim() || undefined,
        geography: geographyArray,
        channels: formData.channels,
        daily_limit: Number(formData.daily_limit) || 50,
        requires_approval: Boolean(formData.requires_approval),
        status: formData.status,
      }

      await createCampaign(payload)
      showToast(`Campaign "${formData.name}" created successfully!`)
      setIsCreateModalOpen(false)
      // Reset form
      setFormData({
        name: '',
        objective: '',
        target_roles: '',
        company_size: '',
        channels: ['LinkedIn', 'Gmail'],
        geography: '',
        daily_limit: 50,
        status: 'LIVE',
        requires_approval: true,
      })
      await loadData()
    } catch (err) {
      console.error('Failed to create campaign:', err)
      showToast('Error creating campaign. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Pause / Resume Toggle
  const handleToggleStatus = async (campaign, e) => {
    e?.stopPropagation()
    try {
      const nextStatus = campaign.status === 'LIVE' ? 'PAUSED' : 'LIVE'
      await updateCampaignStatus(campaign.id, nextStatus)
      showToast(`Campaign ${nextStatus === 'LIVE' ? 'resumed' : 'paused'}`)
      await loadData()
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast('Error updating campaign status')
    }
  }

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId, campaignName, e) => {
    e?.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete "${campaignName}"?`)) return
    try {
      await deleteCampaign(campaignId)
      showToast('Campaign deleted')
      if (selectedCampaign?.id === campaignId) setSelectedCampaign(null)
      await loadData()
    } catch (err) {
      console.error('Failed to delete campaign:', err)
      showToast('Error deleting campaign')
    }
  }

  const isExecutive = user?.role === 'EXECUTIVE' || user?.role === 'EXE'

  if (isExecutive) {
    return (
      <div className="sdr-app-layout">
        {toastMessage && <div className="sdr-toast">{toastMessage}</div>}
        <Sidebar activeTab="campaigns" onSelectTab={handleNavSelect} userRole={user?.role} />
        <main className="sdr-main" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="sdr-container" style={{maxWidth: '1200px'}}>
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search prospects, campaigns..."
              user={user}
              onSignOut={handleSignOut}
              killSwitchActive={killSwitchActive}
              onToggleKillSwitch={handleToggleKillSwitch}
            />

            <section className="sdr-page-header-row" style={{marginBottom: '2rem'}}>
              <h1 className="sdr-page-title" style={{fontSize: '32px'}}>Sales Executive Dashboard</h1>
            </section>

            <div style={{display: 'flex', gap: '2rem'}}>
              <div style={{flex: 1}}>
                {/* Metric Cards */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem'}}>
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600}}>Assigned Campaigns</p>
                    <div style={{fontSize: '32px', fontWeight: 700}}>3 <span style={{fontSize: '16px', color: 'green'}}>↗</span></div>
                    <a href="#" style={{fontSize: '12px', color: '#6b7280', textDecoration: 'none'}}>View Details</a>
                  </div>
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600}}>Prospects with Attention</p>
                    <div style={{fontSize: '32px', fontWeight: 700}}>12 <span style={{fontSize: '16px', color: '#f59e0b'}}>!</span></div>
                    <a href="#" style={{fontSize: '12px', color: '#6b7280', textDecoration: 'none'}}>View Details</a>
                  </div>
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600}}>Positive Replies</p>
                    <div style={{fontSize: '32px', fontWeight: 700}}>9 <span style={{fontSize: '16px', color: 'green'}}>↗</span></div>
                    <a href="#" style={{fontSize: '12px', color: '#6b7280', textDecoration: 'none'}}>View Details</a>
                  </div>
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <p style={{fontSize: '12px', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600}}>Meetings carried</p>
                    <div style={{fontSize: '32px', fontWeight: 700}}>4 <span style={{fontSize: '16px', color: 'green'}}>↗</span></div>
                    <a href="#" style={{fontSize: '12px', color: '#6b7280', textDecoration: 'none'}}>View Details</a>
                  </div>
                </div>

                <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '1rem'}}>My Campaigns:</h3>
                <div className="sdr-settings-card" style={{padding: '1rem', marginBottom: '2rem'}}>
                  <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                        <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Name</th>
                        <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Status</th>
                        <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Prospects</th>
                        <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Outreach</th>
                        <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Meetings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '1rem 0.5rem'}}>Campaign 1</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Live</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Chennai</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>X Days</td>
                        <td style={{padding: '1rem 0.5rem'}}></td>
                      </tr>
                      <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                        <td style={{padding: '1rem 0.5rem'}}>Campaign 2</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Live</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Chennai</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>X Days</td>
                        <td style={{padding: '1rem 0.5rem'}}></td>
                      </tr>
                      <tr>
                        <td style={{padding: '1rem 0.5rem'}}>Campaign 3</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Live</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Chennai</td>
                        <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>X Days</td>
                        <td style={{padding: '1rem 0.5rem'}}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Right Side Info */}
              <div style={{width: '300px'}}>
                <h3 style={{fontSize: '24px', fontWeight: 700, margin: 0}}>Alex,</h3>
                <h4 style={{fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem'}}>ACME Robotics</h4>

                <div className="sdr-settings-card" style={{padding: '1.5rem', backgroundColor: '#f9fafb', marginBottom: '1rem', border: 'none'}}>
                  <p style={{margin: '0 0 0.5rem', fontWeight: 600}}>Alex Chen</p>
                  <p style={{margin: '0 0 0.5rem', fontWeight: 600}}>alex.chen@acme.io</p>
                  <p style={{margin: 0, fontWeight: 600}}>(415) 555-0148</p>
                </div>

                <div className="sdr-settings-card" style={{padding: '1.5rem', backgroundColor: '#f9fafb', marginBottom: '2rem', border: 'none'}}>
                  <p style={{margin: '0 0 1rem', fontWeight: 600}}>Acme Robotics</p>
                  <div style={{fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    <span>Industry: Manufacturing</span>
                    <span>Size: 250-500 employees</span>
                    <span>Need: CRM rollout</span>
                    <span>Status: Demo scheduled</span>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '1rem'}}>
                  <button className="sdr-primary-btn" style={{flex: 1, justifyContent: 'center', backgroundColor: '#5bc0be', border: 'none', color: '#111', fontWeight: 600}}>Draft Mail</button>
                  <button className="sdr-primary-btn" style={{flex: 1, justifyContent: 'center', backgroundColor: '#5bc0be', border: 'none', color: '#111', fontWeight: 600}}>Reject</button>
                </div>
              </div>
            </div>

            <h3 style={{fontSize: '20px', fontWeight: 700, marginBottom: '1rem'}}>Priority Prospects:</h3>
            <div className="sdr-settings-card" style={{padding: '1rem', backgroundColor: '#f9fafb', border: 'none'}}>
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Name</th>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Company</th>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Campaign</th>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Assigned On</th>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600}}>Priority</th>
                    <th style={{padding: '1rem 0.5rem', fontWeight: 600, textAlign: 'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{backgroundColor: '#bce4e1'}}>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Prospect 1</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Company X</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Campaign 1</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>October 2nd</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>High</td>
                    <td style={{padding: '1rem 0.5rem', textAlign: 'right'}}>
                      <button onClick={() => navigate('/conversations')} style={{padding: '0.25rem 1rem', borderRadius: '1rem', border: 'none', backgroundColor: '#8accc7', fontWeight: 600, cursor: 'pointer', color: '#111'}}>Review Email</button>
                    </td>
                  </tr>
                  <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Prospect 2</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Company Y</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Campaign 2</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>November 23rd</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Critical</td>
                    <td style={{padding: '1rem 0.5rem', textAlign: 'right'}}>
                      <button onClick={() => navigate('/conversations')} style={{padding: '0.25rem 1rem', borderRadius: '1rem', border: 'none', backgroundColor: '#8accc7', fontWeight: 600, cursor: 'pointer', color: '#111'}}>View Activity</button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Roy</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Company Z</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Campaign 3</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>December 1st</td>
                    <td style={{padding: '1rem 0.5rem', fontWeight: 600}}>Low</td>
                    <td style={{padding: '1rem 0.5rem', textAlign: 'right'}}>
                      <button onClick={() => navigate('/conversations')} style={{padding: '0.25rem 1rem', borderRadius: '1rem', border: 'none', backgroundColor: '#8accc7', fontWeight: 600, cursor: 'pointer', color: '#111'}}>Open Conversation</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="sdr-app-layout">
      {/* Toast Notification */}
      {toastMessage && <div className="sdr-toast">{toastMessage}</div>}

      {/* Left Sidebar */}
      <Sidebar activeTab="campaigns" onSelectTab={handleNavSelect} userRole={user?.role} />

      {/* Main Content */}
      <main className="sdr-main">
        <div className="sdr-container">
          {/* Header */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search prospects, campaigns..."
            user={user}
            onSignOut={handleSignOut}
            killSwitchActive={killSwitchActive}
            onToggleKillSwitch={handleToggleKillSwitch}
          />

          {/* Campaigns Page Header */}
          <section className="sdr-page-header-row">
            <div className="sdr-page-title-box">
              <h1 className="sdr-page-title">Campaigns</h1>
              <p className="sdr-page-subtitle">
                Create, manage and monitor autonomous SDR outreach campaigns.
              </p>
            </div>
            <button
              type="button"
              className="sdr-primary-btn"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon size={16} />
              <span>Create Campaign</span>
            </button>
          </section>

          {/* Summary Status Pill Bar */}
          <section className="sdr-campaign-summary-bar" aria-label="Campaigns Summary">
            <span className="sdr-summary-total">
              <strong>{summaryCounts.total}</strong> Total Campaigns
            </span>
            <span className="sdr-summary-divider">|</span>
            <span className="sdr-summary-pill live">
              <span className="sdr-status-dot green" />
              <strong>{summaryCounts.live}</strong> Live
            </span>
            <span className="sdr-summary-divider">|</span>
            <span className="sdr-summary-pill paused">
              <span className="sdr-status-dot amber" />
              <strong>{summaryCounts.paused}</strong> Paused
            </span>
            <span className="sdr-summary-divider">|</span>
            <span className="sdr-summary-pill draft">
              <span className="sdr-status-dot gray" />
              <strong>{summaryCounts.draft}</strong> Draft
            </span>
          </section>

          {/* Filter Bar */}
          <section className="sdr-campaign-filter-row" aria-label="Campaign Filters">
            <div className="sdr-filter-search-box">
              <SearchIcon size={16} className="sdr-filter-search-icon" />
              <input
                type="text"
                className="sdr-filter-search-input"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sdr-filter-dropdowns">
              {/* Status Filter */}
              <div className="sdr-select-wrapper">
                <label htmlFor="status-select" className="sdr-select-prefix">Status:</label>
                <select
                  id="status-select"
                  className="sdr-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="LIVE">Live</option>
                  <option value="PAUSED">Paused</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              {/* Owner Filter */}
              <div className="sdr-select-wrapper">
                <label htmlFor="owner-select" className="sdr-select-prefix">Owner:</label>
                <select
                  id="owner-select"
                  className="sdr-filter-select"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="ALL">All Owners</option>
                  {uniqueOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Filter */}
              <div className="sdr-select-wrapper">
                <label htmlFor="channel-select" className="sdr-select-prefix">Channel:</label>
                <select
                  id="channel-select"
                  className="sdr-filter-select"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                >
                  <option value="ALL">All Channels</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="EMAIL">Gmail / Email</option>
                  <option value="SMS">SMS</option>
                  <option value="VOICE">Voice</option>
                </select>
              </div>
            </div>
          </section>

          {/* Campaign List / Empty States */}
          {loading ? (
            <div className="sdr-loading-state">
              <div className="sdr-spinner" />
              <span>Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            /* Empty State: Database has 0 campaigns */
            <div className="sdr-campaign-empty-card">
              <div className="sdr-empty-icon-circle">
                <TargetIcon size={36} />
              </div>
              <h2 className="sdr-empty-title">Add your first campaign</h2>
              <p className="sdr-empty-subtitle">
                There are currently no campaigns in your database. Launch your first autonomous SDR outreach campaign to target decision-makers, book meetings, and scale your pipeline.
              </p>
              <button
                type="button"
                className="sdr-primary-btn empty-cta"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusIcon size={18} />
                <span>Create Your First Campaign</span>
              </button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            /* Empty State: Filters returned 0 matches */
            <div className="sdr-empty-results">
              <p>No campaigns match your search or filter criteria.</p>
              <button
                type="button"
                className="sdr-text-btn"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setOwnerFilter('ALL')
                  setChannelFilter('ALL')
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* 2-Column Campaign Cards Grid matching mockup */
            <section className="sdr-campaigns-grid-two-col" aria-label="Campaign Cards">
              {filteredCampaigns.map((camp) => {
                const isDraft = camp.status === 'DRAFT'
                const isPaused = camp.status === 'PAUSED'
                const isLive = camp.status === 'LIVE'

                return (
                  <article key={camp.id} className={`sdr-campaign-full-card ${isDraft ? 'draft-card' : ''}`}>
                    {/* Top Row: Title & Badge */}
                    <div className="sdr-card-header-row">
                      <h3 className="sdr-card-title">{camp.name || camp.title}</h3>
                      <span className={`sdr-badge ${camp.status?.toLowerCase()}`}>
                        {camp.status}
                      </span>
                    </div>

                    {/* Metadata Specs */}
                    <div className="sdr-card-specs">
                      <div className="sdr-spec-row">
                        <span className="sdr-spec-label">ICP:</span>
                        <span className="sdr-spec-value">{camp.icp || '-'}</span>
                      </div>
                      <div className="sdr-spec-inline-grid">
                        <div className="sdr-spec-row">
                          <span className="sdr-spec-label">Company Size:</span>
                          <span className="sdr-spec-value">{camp.company_size || '-'}</span>
                        </div>
                        <div className="sdr-spec-row">
                          <span className="sdr-spec-label">Channels:</span>
                          <span className="sdr-spec-value">
                            {Array.isArray(camp.channels) && camp.channels.length > 0 ? camp.channels.join(', ') : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="sdr-spec-row">
                        <span className="sdr-spec-label">Owner:</span>
                        <span className="sdr-spec-value">{camp.owner_name || '-'}</span>
                      </div>
                    </div>

                    {/* Metrics Row: Prospects, Qualified, Meetings */}
                    <div className="sdr-card-metrics-row">
                      <div className="sdr-metric-col">
                        <span className="sdr-metric-big-num">{camp.prospects ?? 0}</span>
                        <span className="sdr-metric-sublabel">Prospects</span>
                      </div>
                      <div className="sdr-metric-col">
                        <span className="sdr-metric-big-num">{camp.qualified ?? 0}</span>
                        <span className="sdr-metric-sublabel">Qualified</span>
                      </div>
                      <div className="sdr-metric-col">
                        <span className="sdr-metric-big-num">{camp.meetings ?? 0}</span>
                        <span className="sdr-metric-sublabel">Meetings</span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="sdr-card-footer-actions">
                      {isDraft ? (
                        <>
                          <button
                            type="button"
                            className="sdr-btn-continue-setup"
                            onClick={() => setSelectedCampaign(camp)}
                          >
                            Continue Setup
                          </button>
                          <button
                            type="button"
                            className="sdr-btn-delete-draft"
                            onClick={(e) => handleDeleteCampaign(camp.id, camp.name || camp.title, e)}
                          >
                            Delete Draft
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="sdr-btn-view-campaign"
                            onClick={() => setSelectedCampaign(camp)}
                          >
                            View Campaign
                          </button>
                          <button
                            type="button"
                            className="sdr-btn-pause-resume"
                            onClick={(e) => handleToggleStatus(camp, e)}
                          >
                            {isPaused ? 'Resume' : 'Pause'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="sdr-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="sdr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sdr-modal-header">
              <div>
                <h2 className="sdr-modal-title">Create New Campaign</h2>
                <p className="sdr-modal-subtitle">
                  Configure autonomous outreach parameters and target persona
                </p>
              </div>
              <button
                type="button"
                className="sdr-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="sdr-modal-form">
              {/* Campaign Name */}
              <div className="sdr-form-group">
                <label className="sdr-form-label">
                  Campaign Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="sdr-form-input"
                  placeholder="e.g. US SaaS CTO Outreach"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Objective / Description */}
              <div className="sdr-form-group">
                <label className="sdr-form-label">Objective / Description</label>
                <textarea
                  className="sdr-form-textarea"
                  placeholder="e.g. Book enterprise discovery calls with engineering decision-makers..."
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Target Roles (ICP) */}
              <div className="sdr-form-group">
                <label className="sdr-form-label">
                  Target Roles / ICP (Comma separated)
                </label>
                <input
                  type="text"
                  className="sdr-form-input"
                  placeholder="e.g. CTO, VP Engineering, Head of Engineering"
                  value={formData.target_roles}
                  onChange={(e) => setFormData({ ...formData, target_roles: e.target.value })}
                />
              </div>

              {/* Two Column Row: Company Size & Geography */}
              <div className="sdr-form-two-col">
                <div className="sdr-form-group">
                  <label className="sdr-form-label">Company Size</label>
                  <select
                    className="sdr-form-select"
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  >
                    <option value="1-20">1-20 employees</option>
                    <option value="20-100">20-100 employees</option>
                    <option value="50-500">50-500 employees</option>
                    <option value="500+">500+ employees</option>
                    <option value="Enterprise">1000+ Enterprise</option>
                  </select>
                </div>

                <div className="sdr-form-group">
                  <label className="sdr-form-label">Geography</label>
                  <input
                    type="text"
                    className="sdr-form-input"
                    placeholder="e.g. US, India, Global"
                    value={formData.geography}
                    onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                  />
                </div>
              </div>

              {/* Channels Select */}
              <div className="sdr-form-group">
                <label className="sdr-form-label">Outreach Channels</label>
                <div className="sdr-channel-checkbox-group">
                  {['Gmail', 'LinkedIn', 'SMS', 'Voice'].map((ch) => {
                    const isChecked = formData.channels.includes(ch)
                    return (
                      <button
                        key={ch}
                        type="button"
                        className={`sdr-channel-pill-toggle ${isChecked ? 'active' : ''}`}
                        onClick={() => handleChannelToggle(ch)}
                      >
                        {isChecked && <CheckIcon size={14} />}
                        <span>{ch}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Daily Limit & Initial Status */}
              <div className="sdr-form-two-col">
                <div className="sdr-form-group">
                  <label className="sdr-form-label">Daily Outreach Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="sdr-form-input"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
                  />
                </div>

                <div className="sdr-form-group">
                  <label className="sdr-form-label">Initial Status</label>
                  <select
                    className="sdr-form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="LIVE">Live (Active outreach)</option>
                    <option value="DRAFT">Draft (Pending setup)</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>
              </div>

              {/* Requires Approval Checkbox */}
              <div className="sdr-form-checkbox-row">
                <label className="sdr-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) =>
                      setFormData({ ...formData, requires_approval: e.target.checked })
                    }
                  />
                  <span>Require human review before sending initial outreach drafts</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="sdr-modal-actions">
                <button
                  type="button"
                  className="sdr-modal-btn-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sdr-primary-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / INSPECT CAMPAIGN MODAL */}
      {selectedCampaign && (
        <div className="sdr-modal-backdrop" onClick={() => setSelectedCampaign(null)}>
          <div className="sdr-modal-card detail-view" onClick={(e) => e.stopPropagation()}>
            <div className="sdr-modal-header">
              <div>
                <div className="sdr-modal-header-badge-row">
                  <h2 className="sdr-modal-title">
                    {selectedCampaign.name || selectedCampaign.title}
                  </h2>
                  <span className={`sdr-badge ${selectedCampaign.status?.toLowerCase()}`}>
                    {selectedCampaign.status}
                  </span>
                </div>
                <p className="sdr-modal-subtitle">
                  {selectedCampaign.description || selectedCampaign.subtitle || 'Autonomous outreach campaign'}
                </p>
              </div>
              <button
                type="button"
                className="sdr-modal-close"
                onClick={() => setSelectedCampaign(null)}
                aria-label="Close modal"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="sdr-modal-body">
              {/* Campaign Metrics */}
              <div className="sdr-modal-metrics-grid">
                <div className="sdr-modal-metric-card">
                  <span className="num">{selectedCampaign.prospects ?? 0}</span>
                  <span className="lbl">Total Prospects</span>
                </div>
                <div className="sdr-modal-metric-card">
                  <span className="num">{selectedCampaign.qualified ?? 0}</span>
                  <span className="lbl">Qualified Leads</span>
                </div>
                <div className="sdr-modal-metric-card">
                  <span className="num">{selectedCampaign.meetings ?? 0}</span>
                  <span className="lbl">Meetings Booked</span>
                </div>
              </div>

              {/* Configurations List */}
              <div className="sdr-modal-detail-specs">
                <div className="sdr-modal-detail-row">
                  <span className="key">Target Roles (ICP)</span>
                  <span className="val">{selectedCampaign.icp || '-'}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Company Size</span>
                  <span className="val">{selectedCampaign.company_size || '-'}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Channels</span>
                  <span className="val">
                    {Array.isArray(selectedCampaign.channels) && selectedCampaign.channels.length > 0
                      ? selectedCampaign.channels.join(', ')
                      : '-'}
                  </span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Daily Outreach Limit</span>
                  <span className="val">{selectedCampaign.daily_limit || 0} contacts / day</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Owner</span>
                  <span className="val">{selectedCampaign.owner_name || '-'}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Human Approval</span>
                  <span className="val">
                    {selectedCampaign.requires_approval ? 'Required' : 'Autonomous auto-send'}
                  </span>
                </div>
              </div>
            </div>

            <div className="sdr-modal-actions space-between">
              <button
                type="button"
                className="sdr-btn-delete-draft"
                onClick={(e) => handleDeleteCampaign(selectedCampaign.id, selectedCampaign.name || selectedCampaign.title, e)}
              >
                <TrashIcon size={14} />
                <span>Delete Campaign</span>
              </button>

              <div className="sdr-modal-right-actions">
                <button
                  type="button"
                  className="sdr-modal-btn-cancel"
                  onClick={() => setSelectedCampaign(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="sdr-primary-btn"
                  onClick={(e) => {
                    handleToggleStatus(selectedCampaign, e)
                    setSelectedCampaign(null)
                  }}
                >
                  {selectedCampaign.status === 'LIVE' ? 'Pause Campaign' : 'Launch Campaign'}
                </button>
              </div>
            </div>

            {/* Campaign-Specific Outreach Entry */}
            <div className="sdr-modal-outreach-section">
              <button
                type="button"
                className="sdr-campaign-outreach-btn"
                onClick={() => {
                  navigate(`/outreach?campaign_id=${selectedCampaign.id}`)
                }}
              >
                <OutreachIcon size={18} />
                <span>Campaign Outreach & Prospect Finder</span>
                <span className="sdr-outreach-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
