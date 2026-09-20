import React, { useEffect, useState, useMemo } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  fetchCurrentUser,
  fetchSettings,
  saveSettings,
  fetchKillSwitch,
  toggleKillSwitch,
  signOutUser,
  fetchJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  DEFAULT_SETTINGS,
} from '../api.js'
import '../dashboard.css'

const SETTINGS_TABS = [
  { id: 'General', label: 'General' },
  { id: 'Workspace', label: 'Workspace' },
  { id: 'Notifications', label: 'Notifications' },
  { id: 'Integrations', label: 'Integrations' },
  { id: 'Permissions', label: 'Permissions' },
  { id: 'Security', label: 'Security' },
  { id: 'Collaboration', label: 'Collaboration' },
]

const TIMEZONE_OPTIONS = [
  'Asia/Kolkata (IST)',
  'America/New_York (EST)',
  'America/Los_Angeles (PST)',
  'Europe/London (GMT)',
  'Europe/Berlin (CET)',
  'Asia/Singapore (SGT)',
  'Asia/Tokyo (JST)',
]

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Japanese']

export default function Settings() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [activeSubTab, setActiveSubTab] = useState('General')
  const [searchQuery, setSearchQuery] = useState('')
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [formData, setFormData] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Dynamic Workspace Members and Join Requests from DB
  const [members, setMembers] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [actionProcessingId, setActionProcessingId] = useState(null)

  // Load user, settings, kill switch status, members, and join requests
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, settingsData, killSwitchData, membersData, reqsData] = await Promise.all([
          fetchCurrentUser(),
          fetchSettings(),
          fetchKillSwitch(),
          fetchWorkspaceMembers(),
          fetchJoinRequests(),
        ])

        if (isMounted) {
          if (userData) setUser(userData)
          if (settingsData) {
            setFormData({
              ...DEFAULT_SETTINGS,
              ...settingsData,
              general: { ...DEFAULT_SETTINGS.general, ...(settingsData.general || {}) },
              notifications: {
                ...DEFAULT_SETTINGS.notifications,
                ...(settingsData.notifications || {}),
              },
              workspace: {
                ...DEFAULT_SETTINGS.workspace,
                ...(settingsData.workspace || {}),
              },
              integrations: {
                ...DEFAULT_SETTINGS.integrations,
                ...(settingsData.integrations || {}),
              },
              permissions: {
                ...DEFAULT_SETTINGS.permissions,
                ...(settingsData.permissions || {}),
              },
              security: {
                ...DEFAULT_SETTINGS.security,
                ...(settingsData.security || {}),
              },
              collaboration: {
                ...DEFAULT_SETTINGS.collaboration,
                ...(settingsData.collaboration || {}),
              },
            })
          }
          setKillSwitchActive(killSwitchData)
          if (Array.isArray(membersData)) setMembers(membersData)
          if (Array.isArray(reqsData)) setJoinRequests(reqsData)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Refresh collaboration data whenever switching to Collaboration tab
  useEffect(() => {
    if (activeSubTab === 'Collaboration') {
      Promise.all([fetchWorkspaceMembers(), fetchJoinRequests()])
        .then(([m, r]) => {
          if (Array.isArray(m)) setMembers(m)
          if (Array.isArray(r)) setJoinRequests(r)
        })
        .catch((err) => console.warn('Could not refresh collaboration data:', err))
    }
  }, [activeSubTab])

  // Handlers for approving/rejecting join requests and removing members
  const handleApproveRequest = async (requestId, memberName) => {
    setActionProcessingId(requestId)
    try {
      await approveJoinRequest(requestId)
      showToast(`Approved ${memberName || 'member'} into workspace!`)
      const [updatedReqs, updatedMembers] = await Promise.all([
        fetchJoinRequests(),
        fetchWorkspaceMembers(),
      ])
      setJoinRequests(updatedReqs)
      setMembers(updatedMembers)
    } catch (err) {
      showToast('Failed to approve join request.')
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleRejectRequest = async (requestId) => {
    setActionProcessingId(requestId)
    try {
      await rejectJoinRequest(requestId)
      showToast('Rejected join request.')
      const updatedReqs = await fetchJoinRequests()
      setJoinRequests(updatedReqs)
    } catch (err) {
      showToast('Failed to reject join request.')
    } finally {
      setActionProcessingId(null)
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || 'this user'} from the workspace?`)) {
      return
    }
    setActionProcessingId(memberId)
    try {
      await removeWorkspaceMember(memberId)
      showToast(`Removed ${memberName || 'user'} from workspace.`)
      const updatedMembers = await fetchWorkspaceMembers()
      setMembers(updatedMembers)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to remove member.')
    } finally {
      setActionProcessingId(null)
    }
  }

  // Dynamic invite code expiry calculation
  const expiryDateString = useMemo(() => {
    const days = formData.collaboration?.invite_code_expiry_days || 7
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }, [formData.collaboration?.invite_code_expiry_days])

  // Sidebar navigation handler
  const handleNavSelect = (tabId) => {
    if (tabId === 'overview') {
      navigate('/dashboard')
    } else if (tabId === 'campaigns') {
      navigate('/campaigns')
    } else if (tabId === 'conversations') {
      navigate('/conversations')
    } else if (tabId === 'analytics') {
      navigate('/analytics')
    } else if (tabId === 'settings') {
      // already here
    } else {
      navigate('/dashboard')
    }
  }

  // Handle Kill Switch Toggle
  const handleToggleKillSwitch = async () => {
    const newState = !killSwitchActive
    setKillSwitchActive(newState)
    try {
      await toggleKillSwitch(newState)
      showToast(
        newState
          ? 'Global Kill Switch engaged: activities paused'
          : 'Global Kill Switch disengaged: activities active'
      )
    } catch (err) {
      console.warn('Kill switch update failed:', err)
    }
  }

  // Handle field change in General
  const handleGeneralChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        [field]: value,
      },
    }))
  }

  // Handle toggle change in Notifications
  const handleNotificationToggle = (field) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: !prev.notifications[field],
      },
    }))
  }

  // Save changes via Axios
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await saveSettings(formData)
      if (updated) {
        setFormData((prev) => ({ ...prev, ...updated }))
      }
      showToast('Settings saved successfully!')
    } catch (err) {
      showToast('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage('')
    }, 3500)
  }

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  return (
    <div className="sdr-app-layout">
      {/* Left Sidebar */}
      <Sidebar activeTab="settings" onSelectTab={handleNavSelect} userRole={user?.role} />

      {/* Main Content Area */}
      <main className="sdr-main">
        <div className="sdr-container">
          {/* Header */}
          <Header
            variant="settings"
            placeholder="Search prospects, campaigns, decisions..."
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            user={user}
            onSignOut={handleSignOut}
            killSwitchActive={killSwitchActive}
            onToggleKillSwitch={handleToggleKillSwitch}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div className="sdr-toast" role="status">
              {toastMessage}
            </div>
          )}

          {/* Page Heading */}
          <section className="sdr-page-header">
            <h1 className="sdr-page-title">Settings</h1>
            <p className="sdr-page-desc">
              Manage workspace, notifications, integrations, permissions and security.
            </p>
          </section>

          {/* Settings Grid: Sub-nav & Form */}
          <div className="sdr-settings-layout">
            {/* Left Sub-nav Card */}
            <aside className="sdr-subnav-card" aria-label="Settings Categories">
              <nav className="sdr-subnav-list">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`sdr-subnav-btn ${activeSubTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveSubTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Right Settings Form & Content */}
            <form className="sdr-settings-form" onSubmit={handleSave}>
              {activeSubTab === 'General' && (
                <>
                  {/* General Settings Card */}
                  <div className="sdr-settings-card">
                    <h2 className="sdr-card-section-title">GENERAL SETTINGS</h2>

                    <div className="sdr-form-field">
                      <label className="sdr-form-label" htmlFor="workspace-name">
                        WORKSPACE NAME
                      </label>
                      <input
                        id="workspace-name"
                        type="text"
                        className="sdr-form-input"
                        value={formData.general.workspace_name}
                        onChange={(e) =>
                          handleGeneralChange('workspace_name', e.target.value)
                        }
                      />
                    </div>

                    <div className="sdr-form-field">
                      <label className="sdr-form-label" htmlFor="workspace-desc">
                        WORKSPACE DESCRIPTION
                      </label>
                      <input
                        id="workspace-desc"
                        type="text"
                        className="sdr-form-input"
                        value={formData.general.workspace_description}
                        onChange={(e) =>
                          handleGeneralChange('workspace_description', e.target.value)
                        }
                      />
                    </div>

                    <div className="sdr-form-field">
                      <label className="sdr-form-label" htmlFor="timezone-select">
                        TIMEZONE
                      </label>
                      <div className="sdr-select-wrapper">
                        <select
                          id="timezone-select"
                          className="sdr-form-select"
                          value={formData.general.timezone}
                          onChange={(e) =>
                            handleGeneralChange('timezone', e.target.value)
                          }
                        >
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sdr-form-field">
                      <label className="sdr-form-label" htmlFor="language-select">
                        LANGUAGE
                      </label>
                      <div className="sdr-select-wrapper">
                        <select
                          id="language-select"
                          className="sdr-form-select"
                          value={formData.general.language}
                          onChange={(e) =>
                            handleGeneralChange('language', e.target.value)
                          }
                        >
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notifications Card */}
                  <div className="sdr-settings-card">
                    <h2 className="sdr-card-section-title">NOTIFICATIONS</h2>

                    <div className="sdr-switch-row">
                      <div className="sdr-switch-info">
                        <span className="sdr-switch-title">Email Notifications</span>
                        <span className="sdr-switch-desc">
                          Receive product updates and critical announcements via email.
                        </span>
                      </div>
                      <label className="sdr-burgundy-switch">
                        <input
                          type="checkbox"
                          checked={formData.notifications.email_notifications}
                          onChange={() => handleNotificationToggle('email_notifications')}
                          aria-label="Email Notifications"
                        />
                        <span className="sdr-burgundy-slider" />
                      </label>
                    </div>

                    <div className="sdr-switch-row">
                      <div className="sdr-switch-info">
                        <span className="sdr-switch-title">Escalation Alerts</span>
                        <span className="sdr-switch-desc">
                          Get real-time notification alerts when manual human takeover is needed.
                        </span>
                      </div>
                      <label className="sdr-burgundy-switch">
                        <input
                          type="checkbox"
                          checked={formData.notifications.escalation_alerts}
                          onChange={() => handleNotificationToggle('escalation_alerts')}
                          aria-label="Escalation Alerts"
                        />
                        <span className="sdr-burgundy-slider" />
                      </label>
                    </div>

                    <div className="sdr-switch-row">
                      <div className="sdr-switch-info">
                        <span className="sdr-switch-title">Daily Performance Summary</span>
                        <span className="sdr-switch-desc">
                          A comprehensive daily overview of prospect campaigns and AI conversation metrics.
                        </span>
                      </div>
                      <label className="sdr-burgundy-switch">
                        <input
                          type="checkbox"
                          checked={formData.notifications.daily_performance_summary}
                          onChange={() =>
                            handleNotificationToggle('daily_performance_summary')
                          }
                          aria-label="Daily Performance Summary"
                        />
                        <span className="sdr-burgundy-slider" />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {activeSubTab === 'Workspace' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">WORKSPACE POLICIES & LIMITS</h2>
                  <div className="sdr-form-field">
                    <label className="sdr-form-label">MAX DAILY PROSPECTS PER CAMPAIGN</label>
                    <input
                      type="number"
                      className="sdr-form-input"
                      value={formData.workspace?.default_campaign_limit ?? 100}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          workspace: {
                            ...prev.workspace,
                            default_campaign_limit: parseInt(e.target.value, 10) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="sdr-form-field">
                    <label className="sdr-form-label">DATA RETENTION (DAYS)</label>
                    <input
                      type="number"
                      className="sdr-form-input"
                      value={formData.workspace?.data_retention_days ?? 90}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          workspace: {
                            ...prev.workspace,
                            data_retention_days: parseInt(e.target.value, 10) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'Notifications' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">CHANNELS & FREQUENCY</h2>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Email Notifications</span>
                      <span className="sdr-switch-desc">
                        Receive product updates and critical announcements via email.
                      </span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.email_notifications}
                        onChange={() => handleNotificationToggle('email_notifications')}
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Escalation Alerts</span>
                      <span className="sdr-switch-desc">
                        Get real-time notification alerts when manual human takeover is needed.
                      </span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={formData.notifications.escalation_alerts}
                        onChange={() => handleNotificationToggle('escalation_alerts')}
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'Integrations' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">CONNECTED CHANNELS & PROVIDERS</h2>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Gmail & Google Workspace</span>
                      <span className="sdr-switch-desc">Send automated email sequences through verified domain.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.integrations?.gmail_connected)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            integrations: {
                              ...prev.integrations,
                              gmail_connected: !prev.integrations?.gmail_connected,
                            },
                          }))
                        }
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">LinkedIn Sales Navigator</span>
                      <span className="sdr-switch-desc">Synchronize prospect searches and connect requests.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.integrations?.linkedin_connected)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            integrations: {
                              ...prev.integrations,
                              linkedin_connected: !prev.integrations?.linkedin_connected,
                            },
                          }))
                        }
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'Permissions' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">ROLES & AUTONOMY CONTROL</h2>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Require Manager Approval for High ICP</span>
                      <span className="sdr-switch-desc">Pause drafts before sending to VP and C-level leads.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.permissions?.require_admin_approval)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              require_admin_approval: !prev.permissions?.require_admin_approval,
                            },
                          }))
                        }
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Allow Rep Escalations & Human Takeovers</span>
                      <span className="sdr-switch-desc">Enable sales executives to manually take over active AI conversation threads.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.permissions?.allow_rep_escalations)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              allow_rep_escalations: !prev.permissions?.allow_rep_escalations,
                            },
                          }))
                        }
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'Security' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">SECURITY & SESSION POLICIES</h2>
                  <div className="sdr-form-field" style={{marginBottom: '1.5rem'}}>
                    <label className="sdr-form-label">WORKSPACE ADMIN / INVITE CODE</label>
                    <input
                      type="text"
                      className="sdr-form-input"
                      placeholder="Enter secret code for executives (e.g. helloguys)"
                      value={formData.security?.admin_code || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          security: {
                            ...prev.security,
                            admin_code: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Two-Factor Authentication (2FA)</span>
                      <span className="sdr-switch-desc">Require one-time passcode for admin log in.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.security?.two_factor_auth)}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              two_factor_auth: !prev.security?.two_factor_auth,
                            },
                          }))
                        }
                      />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'Collaboration' && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                  {/* Team Invite Code */}
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <h3 style={{fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 600}}>Team Invite Code</h3>
                    
                    <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                      <div style={{flex: 1, padding: '0.6rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontWeight: 700, letterSpacing: '1px', backgroundColor: '#f9fafb', fontFamily: 'monospace', fontSize: '15px'}}>
                        {formData.security?.admin_code || 'helloguys'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(formData.security?.admin_code || 'helloguys')
                          showToast('Invite code copied to clipboard!')
                        }}
                        style={{padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}
                      >
                        <span style={{fontSize: '16px'}}>📄</span> Copy Code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = 'AGY-' + Math.random().toString(36).substring(2, 7).toUpperCase()
                          setFormData((prev) => ({
                            ...prev,
                            security: { ...prev.security, admin_code: randomCode }
                          }))
                          showToast('Generated new code! Click Save Changes to apply.')
                        }}
                        style={{padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}
                      >
                        <span style={{fontSize: '16px'}}>🔄</span> Regenerate
                      </button>
                    </div>

                    <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '1.5rem'}}>
                      Share this code with sales executives to join your workspace. Code expires in {formData.collaboration?.invite_code_expiry_days || 7} days: <span style={{fontWeight: 600, color: '#991b1b'}}>Expires on {expiryDateString}.</span>
                    </p>

                    <div className="sdr-switch-row" style={{paddingBottom: 0, borderBottom: 'none'}}>
                      <div className="sdr-switch-info">
                        <span className="sdr-switch-title">Auto-approve new members</span>
                        <span className="sdr-switch-desc">Skip manual workspace approval step when team members submit this code in the join box.</span>
                      </div>
                      <label className="sdr-burgundy-switch">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.collaboration?.auto_approve_members)}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              collaboration: {
                                ...prev.collaboration,
                                auto_approve_members: !prev.collaboration?.auto_approve_members,
                              },
                            }))
                          }
                        />
                        <span className="sdr-burgundy-slider" />
                      </label>
                    </div>
                  </div>

                  {/* Dynamic Pending Join Requests from DB */}
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', margin: 0, fontWeight: 600}}>
                        Pending Join Requests ({joinRequests.filter((r) => r.status === 'PENDING').length})
                      </h3>
                      <button
                        type="button"
                        onClick={async () => {
                          const r = await fetchJoinRequests()
                          setJoinRequests(r)
                          showToast('Refreshed join requests from database.')
                        }}
                        style={{background: 'none', border: 'none', color: '#711822', fontSize: '12px', fontWeight: 600, cursor: 'pointer'}}
                      >
                        🔄 Refresh
                      </button>
                    </div>

                    {joinRequests.filter((r) => r.status === 'PENDING').length === 0 ? (
                      <div style={{padding: '1.75rem', textAlign: 'center', color: '#6b7280', fontSize: '14px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #e5e7eb'}}>
                        No pending join requests. When a sales executive enters the workspace invite code in the join box, their request will appear here for you to approve.
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        {joinRequests
                          .filter((r) => r.status === 'PENDING')
                          .map((req) => (
                            <div
                              key={req.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem 0',
                                borderBottom: '1px solid #f3f4f6',
                                flexWrap: 'wrap',
                                gap: '0.75rem',
                              }}
                            >
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <div
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fee2e2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: '#991b1b',
                                    fontSize: '14px',
                                  }}
                                >
                                  {(req.name || req.email || 'U').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{fontWeight: 600, color: '#111827', fontSize: '14px'}}>
                                    {req.name || req.email.split('@')[0]}
                                  </div>
                                  <div style={{color: '#6b7280', fontSize: '13px'}}>
                                    {req.email} • Code used:{' '}
                                    <code style={{backgroundColor: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600}}>
                                      {req.code_entered}
                                    </code>
                                  </div>
                                </div>
                              </div>

                              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <span style={{color: '#9ca3af', fontSize: '13px'}}>
                                  {req.time_ago || 'Pending'}
                                </span>
                                <span
                                  style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#b45309',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                  }}
                                >
                                  Awaiting Approval
                                </span>
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                  <button
                                    type="button"
                                    disabled={actionProcessingId === req.id}
                                    onClick={() => handleApproveRequest(req.id, req.name || req.email)}
                                    style={{
                                      backgroundColor: '#711822',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.9rem',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {actionProcessingId === req.id ? 'Approving...' : '✓ Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionProcessingId === req.id}
                                    onClick={() => handleRejectRequest(req.id)}
                                    style={{
                                      backgroundColor: '#fff',
                                      color: '#991b1b',
                                      border: '1px solid #fecaca',
                                      borderRadius: '6px',
                                      padding: '0.45rem 0.75rem',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Workspace Members Table from DB */}
                  <div className="sdr-settings-card" style={{padding: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', margin: 0, fontWeight: 600}}>
                        Workspace Team Members ({members.length})
                      </h3>
                      <button
                        type="button"
                        onClick={async () => {
                          const m = await fetchWorkspaceMembers()
                          setMembers(m)
                          showToast('Refreshed members list from database.')
                        }}
                        style={{background: 'none', border: 'none', color: '#711822', fontSize: '12px', fontWeight: 600, cursor: 'pointer'}}
                      >
                        🔄 Refresh
                      </button>
                    </div>

                    {members.length === 0 ? (
                      <div style={{padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '14px', backgroundColor: '#f9fafb', borderRadius: '8px'}}>
                        No team members registered yet.
                      </div>
                    ) : (
                      <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px'}}>
                        <thead>
                          <tr style={{borderBottom: '1px solid #e5e7eb', color: '#6b7280'}}>
                            <th style={{padding: '0.75rem 0', fontWeight: 500}}>Collaborator</th>
                            <th style={{padding: '0.75rem 0', fontWeight: 500}}>Workspace Role</th>
                            <th style={{padding: '0.75rem 0', fontWeight: 500}}>Status</th>
                            <th style={{padding: '0.75rem 0', fontWeight: 500}}>Date Joined</th>
                            <th style={{padding: '0.75rem 0', fontWeight: 500, textAlign: 'right'}}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => {
                            const initials = (member.name || member.email || 'TM')
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                            const isCurrentUser = member.id === user.id || member.email === user.email
                            const isAdmin = member.role === 'Administrator' || member.role === 'ADMIN'

                            return (
                              <tr key={member.id} style={{borderBottom: '1px solid #f3f4f6'}}>
                                <td style={{padding: '1rem 0', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '50%',
                                      backgroundColor: '#f3f4f6',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      color: '#4b5563',
                                      fontSize: '13px',
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <div style={{fontWeight: 600, color: '#111827'}}>
                                      {member.name || member.email.split('@')[0]}
                                      {isCurrentUser && (
                                        <span style={{marginLeft: '0.5rem', fontSize: '11px', backgroundColor: '#e5e7eb', color: '#4b5563', padding: '0.15rem 0.4rem', borderRadius: '4px'}}>
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div style={{color: '#6b7280', fontSize: '12px'}}>{member.email}</div>
                                  </div>
                                </td>
                                <td style={{padding: '1rem 0'}}>
                                  <span
                                    style={{
                                      backgroundColor: isAdmin ? '#fee2e2' : '#e5e7eb',
                                      color: isAdmin ? '#991b1b' : '#374151',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '0.25rem',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {member.role}
                                  </span>
                                </td>
                                <td style={{padding: '1rem 0'}}>
                                  <span style={{color: member.is_active ? '#10b981' : '#9ca3af'}}>●</span>{' '}
                                  {member.is_active ? 'Online' : 'Offline'}
                                </td>
                                <td style={{padding: '1rem 0', color: '#6b7280'}}>
                                  {member.created_at
                                    ? new Date(member.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : 'Recent'}
                                </td>
                                <td style={{padding: '1rem 0', textAlign: 'right'}}>
                                  {isAdmin ? (
                                    <span style={{color: '#9ca3af', fontSize: '12px', fontWeight: 500}}>Admin</span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={actionProcessingId === member.id}
                                      onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                                      style={{
                                        color: '#991b1b',
                                        background: 'none',
                                        border: 'none',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                      }}
                                    >
                                      {actionProcessingId === member.id ? 'Removing...' : 'Remove'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}


              {/* Bottom Action */}
              <div className="sdr-settings-actions" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                <a href="#" style={{color: '#711822', fontWeight: 600, textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  ⚙ Manage Roles & Permissions
                </a>
                <button
                  type="submit"
                  className="sdr-primary-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
