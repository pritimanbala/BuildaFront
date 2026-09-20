import React, { useEffect, useState } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  ChatBubbleIcon,
  AlertCircleIcon,
  CpuIcon,
  UserIcon,
  EmailIcon,
  LinkedInIcon,
} from '../components/Icons.jsx'
import {
  fetchCurrentUser,
  fetchKillSwitch,
  toggleKillSwitch,
  signOutUser,
  fetchConversationSummary,
  fetchRecentConversations,
  fetchEscalations,
  takeoverConversation,
  resolveEscalation,
  DEFAULT_CONVERSATION_SUMMARY,
  DEFAULT_RECENT_CONVERSATIONS,
  DEFAULT_ESCALATIONS,
} from '../api.js'
import '../dashboard.css'

export default function Conversations() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [searchQuery, setSearchQuery] = useState('')
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [summary, setSummary] = useState(DEFAULT_CONVERSATION_SUMMARY)
  const [recentConversations, setRecentConversations] = useState(DEFAULT_RECENT_CONVERSATIONS)
  const [escalations, setEscalations] = useState(DEFAULT_ESCALATIONS)
  const [selectedFilter, setSelectedFilter] = useState('NEEDS_ATTENTION')
  const [activeModalThread, setActiveModalThread] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Load backend data
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, killSwitchData, summaryData, recentData, escalationsData] =
          await Promise.all([
            fetchCurrentUser(),
            fetchKillSwitch(),
            fetchConversationSummary(),
            fetchRecentConversations(),
            fetchEscalations(),
          ])

        if (isMounted) {
          if (userData) setUser(userData)
          setKillSwitchActive(killSwitchData)
          if (summaryData) setSummary(summaryData)
          if (recentData) setRecentConversations(recentData)
          if (escalationsData) setEscalations(escalationsData)
        }
      } catch (err) {
        console.error('Failed to load conversations data:', err)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Sidebar navigation handler
  const handleNavSelect = (tabId) => {
    if (tabId === 'overview') {
      navigate('/dashboard')
    } else if (tabId === 'campaigns') {
      navigate('/campaigns')
    } else if (tabId === 'settings') {
      navigate('/settings')
    } else if (tabId === 'analytics') {
      navigate('/analytics')
    } else if (tabId === 'conversations') {
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

  // Takeover handler
  const handleTakeover = async (conv) => {
    try {
      await takeoverConversation(conv.id)
      setRecentConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? { ...c, status: 'HUMAN_TAKEOVER', status_label: 'Human Takeover', action_type: 'review' }
            : c
        )
      )
      setSummary((prev) => ({
        ...prev,
        needs_attention: Math.max(0, prev.needs_attention - 1),
        human_takeover: prev.human_takeover + 1,
      }))
      showToast(`Human takeover activated for ${conv.prospect_name}`)
    } catch (err) {
      console.error(err)
    }
  }

  // Resolve escalation handler
  const handleResolveEscalation = async (esc) => {
    try {
      await resolveEscalation(esc.id)
      setEscalations((prev) =>
        prev.map((e) => (e.id === esc.id ? { ...e, status: 'Resolved' } : e))
      )
      showToast(`Escalation for ${esc.prospect_name} marked as Resolved`)
    } catch (err) {
      console.error(err)
    }
  }

  // Send human reply in thread modal
  const handleSendReply = () => {
    if (!replyText.trim() || !activeModalThread) return
    const newMsg = {
      sender: user?.name || 'Human SDR',
      time: 'Just now',
      text: replyText.trim(),
    }
    setRecentConversations((prev) =>
      prev.map((c) =>
        c.id === activeModalThread.id
          ? {
              ...c,
              history: [...(c.history || []), newMsg],
              latest_message: replyText.trim(),
              status: 'HUMAN_TAKEOVER',
              status_label: 'Human Takeover',
            }
          : c
      )
    )
    setActiveModalThread((prev) => ({
      ...prev,
      history: [...(prev.history || []), newMsg],
      latest_message: replyText.trim(),
      status: 'HUMAN_TAKEOVER',
      status_label: 'Human Takeover',
    }))
    setReplyText('')
    showToast(`Reply sent to ${activeModalThread.prospect_name}`)
  }

  // Filter conversations based on search
  const filteredConversations = recentConversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.prospect_name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.campaign_name.toLowerCase().includes(q) ||
      c.latest_message.toLowerCase().includes(q)
    )
  })

  // Filter escalations based on search
  const filteredEscalations = escalations.filter((e) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      e.prospect_name.toLowerCase().includes(q) ||
      e.campaign_name.toLowerCase().includes(q) ||
      e.reason.toLowerCase().includes(q)
    )
  })

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  return (
    <div className="sdr-app-layout">
      {/* Sidebar */}
      <Sidebar activeTab="conversations" onSelectTab={handleNavSelect} />

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
            <h1 className="sdr-page-title">Conversations & Escalations</h1>
            <p className="sdr-page-desc">
              Monitor AI-driven conversations and intervene when human judgment is required.
            </p>
          </section>

          {/* 4 Summary Cards */}
          <section className="sdr-conv-summary-grid" aria-label="Conversation Statistics">
            {/* Card 1: Active Conversations */}
            <div
              className={`sdr-conv-stat-card ${selectedFilter === 'ALL' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('ALL')}
            >
              <div className="sdr-conv-stat-icon">
                <ChatBubbleIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">ACTIVE CONVERSATIONS</span>
                <span className="sdr-conv-stat-value">{summary.active_conversations}</span>
              </div>
            </div>

            {/* Card 2: Needs Attention (Highlighted with red indicator dot) */}
            <div
              className={`sdr-conv-stat-card attention-card ${selectedFilter === 'NEEDS_ATTENTION' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('NEEDS_ATTENTION')}
            >
              <div className="sdr-attention-dot" />
              <div className="sdr-conv-stat-icon red-badge">
                <AlertCircleIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">NEEDS ATTENTION</span>
                <span className="sdr-conv-stat-value">{summary.needs_attention}</span>
              </div>
            </div>

            {/* Card 3: AI Handling */}
            <div
              className={`sdr-conv-stat-card ${selectedFilter === 'AI_HANDLING' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('AI_HANDLING')}
            >
              <div className="sdr-conv-stat-icon">
                <CpuIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">AI HANDLING</span>
                <span className="sdr-conv-stat-value">{summary.ai_handling}</span>
              </div>
            </div>

            {/* Card 4: Human Takeover */}
            <div
              className={`sdr-conv-stat-card ${selectedFilter === 'HUMAN_TAKEOVER' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('HUMAN_TAKEOVER')}
            >
              <div className="sdr-conv-stat-icon">
                <UserIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">HUMAN TAKEOVER</span>
                <span className="sdr-conv-stat-value">{summary.human_takeover}</span>
              </div>
            </div>
          </section>

          {/* Recent Conversations Section */}
          <section className="sdr-recent-conv-section">
            <h2 className="sdr-section-subtitle">Recent Conversations</h2>

            <div className="sdr-recent-conv-grid">
              {filteredConversations.map((conv, idx) => {
                const isHighlight = idx === 0 || conv.status === 'NEEDS_ATTENTION'
                return (
                  <div
                    key={conv.id}
                    className={`sdr-conv-card ${isHighlight ? 'highlight-border' : ''}`}
                  >
                    {/* Top Row: Avatar, Name, Company, Timestamp */}
                    <div className="sdr-conv-top-row">
                      <div className="sdr-conv-user-cell">
                        <div className="sdr-conv-avatar">{conv.prospect_initials}</div>
                        <div className="sdr-conv-user-info">
                          <span className="sdr-conv-name">{conv.prospect_name}</span>
                          <span className="sdr-conv-title-company">
                            {conv.title} · {conv.company}
                          </span>
                        </div>
                      </div>
                      <span className="sdr-conv-time">{conv.time_ago}</span>
                    </div>

                    {/* Sub-row: Campaign Name, Channel Tag, Status Badge */}
                    <div className="sdr-conv-meta-row">
                      <div className="sdr-conv-campaign-info">
                        <span className="sdr-conv-campaign-prefix">Campaign: </span>
                        <span className="sdr-conv-campaign-name">{conv.campaign_name}</span>
                      </div>
                      <div className="sdr-conv-badges">
                        <span className="sdr-channel-tag">
                          {conv.channel === 'Email' ? (
                            <EmailIcon size={13} />
                          ) : (
                            <LinkedInIcon size={13} />
                          )}
                          <span>{conv.channel}</span>
                        </span>
                        <span className={`sdr-conv-status-badge ${conv.status.toLowerCase()}`}>
                          {conv.status_label}
                        </span>
                      </div>
                    </div>

                    {/* Message Bubble Box */}
                    <div className="sdr-conv-message-box">
                      <p className="sdr-conv-message-text">{conv.latest_message}</p>
                    </div>

                    {/* Card Actions */}
                    <div className="sdr-conv-footer">
                      <button
                        type="button"
                        className="sdr-view-history-btn"
                        onClick={() => setActiveModalThread(conv)}
                      >
                        View History
                      </button>

                      {conv.action_type === 'takeover' ? (
                        <button
                          type="button"
                          className="sdr-takeover-btn"
                          onClick={() => handleTakeover(conv)}
                        >
                          Takeover
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sdr-review-btn"
                          onClick={() => setActiveModalThread(conv)}
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Escalation Queue Table Section */}
          <section className="sdr-escalation-section">
            <h2 className="sdr-section-subtitle">Escalation Queue</h2>

            <div className="sdr-escalation-table-wrapper">
              <table className="sdr-escalation-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Prospect</th>
                    <th>Campaign</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEscalations.map((esc) => (
                    <tr key={esc.id}>
                      <td>
                        <span className={`sdr-priority-badge ${esc.priority.toLowerCase()}`}>
                          {esc.priority}
                        </span>
                      </td>
                      <td className="td-prospect">{esc.prospect_name}</td>
                      <td>{esc.campaign_name}</td>
                      <td>{esc.reason}</td>
                      <td>
                        <span className={`sdr-esc-status ${esc.status.toLowerCase().replace(' ', '-')}`}>
                          {esc.status}
                        </span>
                      </td>
                      <td className="td-action">
                        <button
                          type="button"
                          className="sdr-esc-review-btn"
                          onClick={() => {
                            if (esc.status !== 'Resolved') {
                              handleResolveEscalation(esc)
                            } else {
                              showToast(`Escalation for ${esc.prospect_name} is already resolved.`)
                            }
                          }}
                        >
                          {esc.status === 'Resolved' ? 'View' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Conversation Thread Modal / Drawer */}
      {activeModalThread && (
        <div className="sdr-modal-backdrop" onClick={() => setActiveModalThread(null)}>
          <div className="sdr-thread-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sdr-drawer-header">
              <div className="sdr-drawer-user-info">
                <div className="sdr-conv-avatar">{activeModalThread.prospect_initials}</div>
                <div>
                  <h3 className="sdr-drawer-title">{activeModalThread.prospect_name}</h3>
                  <p className="sdr-drawer-subtitle">
                    {activeModalThread.title} · {activeModalThread.company} · {activeModalThread.campaign_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="sdr-drawer-close"
                onClick={() => setActiveModalThread(null)}
              >
                ✕
              </button>
            </div>

            <div className="sdr-drawer-body">
              <div className="sdr-thread-messages">
                {(activeModalThread.history || [
                  { sender: activeModalThread.prospect_name, time: activeModalThread.time_ago, text: activeModalThread.latest_message }
                ]).map((msg, i) => (
                  <div
                    key={i}
                    className={`sdr-thread-bubble ${msg.sender === 'AI SDR' || msg.sender === 'Human SDR' ? 'outbound' : 'inbound'}`}
                  >
                    <div className="sdr-thread-bubble-header">
                      <span className="sdr-thread-sender">{msg.sender}</span>
                      <span className="sdr-thread-time">{msg.time}</span>
                    </div>
                    <p className="sdr-thread-text">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="sdr-drawer-footer">
              <textarea
                className="sdr-drawer-reply-input"
                placeholder={`Write manual intervention message to ${activeModalThread.prospect_name}...`}
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="sdr-drawer-actions">
                <button
                  type="button"
                  className="sdr-drawer-takeover-btn"
                  onClick={() => {
                    handleTakeover(activeModalThread)
                    setActiveModalThread(null)
                  }}
                >
                  Take Over Conversation
                </button>
                <button
                  type="button"
                  className="sdr-drawer-send-btn"
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
