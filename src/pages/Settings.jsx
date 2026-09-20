import React, { useEffect, useState } from 'react'
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

  // Load user, settings, and kill switch status
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, settingsData, killSwitchData] = await Promise.all([
          fetchCurrentUser(),
          fetchSettings(),
          fetchKillSwitch(),
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
            })
          }
          setKillSwitchActive(killSwitchData)
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
      {/* Sidebar */}
      <Sidebar activeTab="settings" onSelectTab={handleNavSelect} />

      {/* Main Content */}
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
                    <span className="sdr-badge-connected">Connected</span>
                  </div>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">LinkedIn Sales Navigator</span>
                      <span className="sdr-switch-desc">Synchronize prospect searches and connect requests.</span>
                    </div>
                    <span className="sdr-badge-connected">Connected</span>
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
                      <input type="checkbox" defaultChecked />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {activeSubTab === 'Security' && (
                <div className="sdr-settings-card">
                  <h2 className="sdr-card-section-title">SECURITY & SESSION POLICIES</h2>
                  <div className="sdr-switch-row">
                    <div className="sdr-switch-info">
                      <span className="sdr-switch-title">Two-Factor Authentication (2FA)</span>
                      <span className="sdr-switch-desc">Require one-time passcode for admin log in.</span>
                    </div>
                    <label className="sdr-burgundy-switch">
                      <input type="checkbox" />
                      <span className="sdr-burgundy-slider" />
                    </label>
                  </div>
                </div>
              )}

              {/* Bottom Action */}
              <div className="sdr-settings-actions">
                <button
                  type="submit"
                  className="sdr-save-btn"
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
