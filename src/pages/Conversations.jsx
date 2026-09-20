import React, { useEffect, useState, useRef } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  GridIcon,
  SearchIcon,
  ChatBubbleIcon,
  UserIcon,
  CpuIcon,
  AlertCircleIcon,
  EmailIcon,
  LinkedInIcon,
  TargetIcon,
  AlertTriangleIcon,
  BarChartIcon,
  CheckIcon,
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
  fetchActiveCampaigns,
  fetchConversations,
  fetchConversationDetails,
  sendConversationMessage,
  generateRAGReply,
  submitDraftToManager,
  DEFAULT_CONVERSATION_SUMMARY,
  DEFAULT_RECENT_CONVERSATIONS,
  DEFAULT_ESCALATIONS,
} from '../api.js'
import '../dashboard.css'

export default function Conversations() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [searchQuery, setSearchQuery] = useState('')
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  // Admin stats & data
  const [summary, setSummary] = useState(DEFAULT_CONVERSATION_SUMMARY)
  const [recentConversations, setRecentConversations] = useState(DEFAULT_RECENT_CONVERSATIONS)
  const [escalations, setEscalations] = useState(DEFAULT_ESCALATIONS)
  const [selectedFilter, setSelectedFilter] = useState('NEEDS_ATTENTION')
  const [activeModalThread, setActiveModalThread] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Executive & DB-backed conversations state
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('ALL')
  const [dbConversations, setDbConversations] = useState([])
  const [selectedConvId, setSelectedConvId] = useState(null)
  const [activeConvDetail, setActiveConvDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [execReplyText, setExecReplyText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')
  const [ragDraftBody, setRagDraftBody] = useState('')
  const [ragSubject, setRagSubject] = useState('')
  const [ragSources, setRagSources] = useState([])
  const [ragIntent, setRagIntent] = useState('')
  const [ragFeedback, setRagFeedback] = useState('')
  const [generatingRAG, setGeneratingRAG] = useState(false)
  const [submittingToManager, setSubmittingToManager] = useState(false)
  const [isSubmittedToManager, setIsSubmittedToManager] = useState(false)
  const messagesEndRef = useRef(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Load backend data
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, killSwitchData, summaryData, recentData, escalationsData, campsData, convsData] =
          await Promise.all([
            fetchCurrentUser(),
            fetchKillSwitch(),
            fetchConversationSummary(),
            fetchRecentConversations(),
            fetchEscalations(),
            fetchActiveCampaigns(),
            fetchConversations(),
          ])

        if (isMounted) {
          if (userData) setUser(userData)
          setKillSwitchActive(killSwitchData)
          if (summaryData) setSummary(summaryData)
          if (recentData) setRecentConversations(recentData)
          if (escalationsData) setEscalations(escalationsData)
          if (campsData) setCampaigns(campsData)
          if (convsData && convsData.length > 0) {
            setDbConversations(convsData)
            setSelectedConvId(convsData[0].id)
          }
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

  // Load conversations when campaign filter changes
  useEffect(() => {
    async function loadFilteredConvs() {
      try {
        const data = await fetchConversations(selectedCampaignId)
        setDbConversations(data)
        if (data.length > 0) {
          setSelectedConvId(data[0].id)
        } else {
          setSelectedConvId(null)
          setActiveConvDetail(null)
        }
      } catch (err) {
        console.warn('Error loading conversations for campaign:', err)
      }
    }
    loadFilteredConvs()
  }, [selectedCampaignId])

  // Fetch full details and messages when selected conversation changes
  useEffect(() => {
    if (!selectedConvId) {
      setActiveConvDetail(null)
      return
    }
    let isMounted = true
    setLoadingDetail(true)
    fetchConversationDetails(selectedConvId)
      .then((detail) => {
        if (isMounted) {
          setActiveConvDetail(detail)
          setLoadingDetail(false)
          if (detail.draft && detail.draft.body) {
            setRagDraftBody(detail.draft.body)
            setRagSubject(detail.draft.subject || `Re: ${detail.subject || 'Enterprise Solutions'}`)
            setIsSubmittedToManager(detail.draft.status === 'PENDING_REVIEW')
          } else {
            // Auto generate initial RAG draft from reply_agent.py
            setGeneratingRAG(true)
            generateRAGReply(selectedConvId)
              .then((res) => {
                if (isMounted && res && res.draft) {
                  setRagDraftBody(res.draft.body)
                  setRagSubject(res.draft.subject || `Re: ${detail.subject || 'Enterprise Solutions'}`)
                  if (res.rag_details) {
                    setRagSources(res.rag_details.sources || [])
                    setRagIntent(res.rag_details.intent || '')
                  }
                  setIsSubmittedToManager(res.draft.status === 'PENDING_REVIEW')
                }
              })
              .catch((err) => console.warn('Auto RAG generate error:', err))
              .finally(() => {
                if (isMounted) setGeneratingRAG(false)
              })
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load conversation details:', err)
        if (isMounted) setLoadingDetail(false)
      })
    return () => {
      isMounted = false
    }
  }, [selectedConvId])

  // Scroll to bottom of message stream when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConvDetail?.messages])

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

  // Autonomous RAG Email Generation & Revision Handler
  const handleGenerateRAG = async (feedbackText = null, force = false) => {
    if (!selectedConvId) return
    setGeneratingRAG(true)
    try {
      const res = await generateRAGReply(selectedConvId, feedbackText, force)
      if (res && res.draft) {
        setRagDraftBody(res.draft.body)
        setRagSubject(res.draft.subject || `Re: ${activeConvDetail?.subject || 'Enterprise Solutions'}`)
        if (res.rag_details) {
          setRagSources(res.rag_details.sources || [])
          setRagIntent(res.rag_details.intent || '')
        }
        setIsSubmittedToManager(false)
        showToast(feedbackText ? 'RAG revised email generated!' : 'RAG email draft generated from Qdrant knowledge!')
      }
    } catch (err) {
      console.error('Failed to generate RAG reply:', err)
      showToast('Could not generate RAG reply. Please retry.')
    } finally {
      setGeneratingRAG(false)
    }
  }

  // Submit Draft to Manager for Approval Handler
  const handleSubmitToManager = async () => {
    if (!selectedConvId || !ragDraftBody.trim()) return
    setSubmittingToManager(true)
    try {
      await submitDraftToManager(selectedConvId, {
        body: ragDraftBody.trim(),
        subject: ragSubject.trim(),
      })
      setIsSubmittedToManager(true)
      setActiveConvDetail((prev) =>
        prev
          ? {
              ...prev,
              status: 'NEEDS_ATTENTION',
              status_label: 'Pending Manager Review',
              draft: {
                ...(prev.draft || {}),
                body: ragDraftBody.trim(),
                subject: ragSubject.trim(),
                status: 'PENDING_REVIEW',
              },
            }
          : prev
      )
      setDbConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, status: 'NEEDS_ATTENTION', status_label: 'Pending Manager Review' }
            : c
        )
      )
      showToast('RAG email draft submitted to Manager for approval!')
    } catch (err) {
      console.error('Failed to submit draft to manager:', err)
      showToast('Failed to submit draft to manager.')
    } finally {
      setSubmittingToManager(false)
    }
  }

  // Takeover handler
  const handleTakeover = async (convId) => {
    const targetId = convId || selectedConvId
    if (!targetId) return
    try {
      await takeoverConversation(targetId)
      if (activeConvDetail && activeConvDetail.id === targetId) {
        setActiveConvDetail((prev) => ({
          ...prev,
          status: 'HUMAN_TAKEOVER',
          status_label: 'Human Takeover',
        }))
      }
      setDbConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? { ...c, status: 'HUMAN_TAKEOVER', status_label: 'Human Takeover' }
            : c
        )
      )
      setRecentConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? { ...c, status: 'HUMAN_TAKEOVER', status_label: 'Human Takeover', action_type: 'review' }
            : c
        )
      )
      showToast('Human takeover activated')
    } catch (err) {
      console.error(err)
    }
  }

  // Escalate handler
  const handleExecutiveEscalate = async () => {
    if (!selectedConvId) return
    try {
      showToast(`Escalated to Manager${escalateReason ? ': ' + escalateReason : ''}`)
      setEscalateReason('')
    } catch (err) {
      console.error('Escalation failed:', err)
    }
  }

  // Filter conversations for search query
  const filteredDbConversations = dbConversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (c.prospect_name && c.prospect_name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.campaign_name && c.campaign_name.toLowerCase().includes(q)) ||
      (c.latest_message && c.latest_message.toLowerCase().includes(q))
    )
  })

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  const isExecutive = user?.role === 'EXECUTIVE' || user?.role === 'EXE'

  // =========================================================================
  // SALES EXECUTIVE VIEW: Single Tab (Conversations with embedded Campaigns)
  // =========================================================================
  if (isExecutive) {
    return (
      <div className="sdr-app-layout">
        {toastMessage && <div className="sdr-toast">{toastMessage}</div>}
        <Sidebar activeTab="conversations" onSelectTab={handleNavSelect} userRole={user?.role} />

        <main className="sdr-main" style={{display: 'flex', flexDirection: 'column', overflowY: 'auto'}}>
          <div className="sdr-container" style={{maxWidth: '1440px', padding: '1.5rem 2rem'}}>
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              user={user}
              onSignOut={handleSignOut}
              killSwitchActive={killSwitchActive}
              onToggleKillSwitch={handleToggleKillSwitch}
            />

            {/* Top Embedded Campaigns Component */}
            <section style={{marginBottom: '1.75rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                  <BarChartIcon size={20} />
                  <h2 style={{fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827'}}>Campaigns</h2>
                  <span style={{fontSize: '12px', backgroundColor: '#e5e7eb', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 600, color: '#374151'}}>
                    {campaigns.length} Total
                  </span>
                </div>
                <span style={{fontSize: '13px', color: '#6b7280'}}>
                  Select a campaign to filter conversation threads
                </span>
              </div>

              {/* Horizontal campaign selector cards */}
              <div style={{display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
                {/* 'All Campaigns' card */}
                <div
                  onClick={() => setSelectedCampaignId('ALL')}
                  style={{
                    minWidth: '180px',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '10px',
                    backgroundColor: selectedCampaignId === 'ALL' ? '#711822' : '#ffffff',
                    color: selectedCampaignId === 'ALL' ? '#ffffff' : '#111827',
                    border: selectedCampaignId === 'ALL' ? '2px solid #711822' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{fontWeight: 700, fontSize: '15px', marginBottom: '0.25rem'}}>All Campaigns</div>
                  <div style={{fontSize: '12px', opacity: 0.85}}>
                    {dbConversations.length} Active Conversations
                  </div>
                </div>

                {/* Individual Campaign Cards */}
                {campaigns.map((camp) => {
                  const isSelected = selectedCampaignId === camp.id
                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaignId(camp.id)}
                      style={{
                        minWidth: '220px',
                        padding: '0.9rem 1.1rem',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? '#711822' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#111827',
                        border: isSelected ? '2px solid #711822' : '1px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem'}}>
                        <span style={{fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px'}}>
                          {camp.name}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#ecfdf5',
                          color: isSelected ? '#ffffff' : '#059669',
                          textTransform: 'uppercase',
                        }}>
                          {camp.status || 'LIVE'}
                        </span>
                      </div>
                      <div style={{display: 'flex', gap: '0.75rem', fontSize: '12px', opacity: 0.85}}>
                        <span><strong>{camp.prospects ?? 0}</strong> Prospects</span>
                        <span>•</span>
                        <span><strong>{camp.meetings ?? 0}</strong> Meetings</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Split Pane: Conversations List + Message Thread Viewer */}
            <div style={{display: 'flex', gap: '1.5rem', minHeight: '620px', alignItems: 'stretch'}}>
              {/* Left Column: Conversations List */}
              <div style={{
                width: '380px',
                flexShrink: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                <div style={{padding: '1rem', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fcfcfd'}}>
                  <div style={{fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '0.5rem'}}>
                    Conversations ({filteredDbConversations.length})
                  </div>
                  <div style={{position: 'relative'}}>
                    <input
                      type="text"
                      placeholder="Search messages, prospects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        outline: 'none',
                      }}
                    />
                    <span style={{position: 'absolute', left: '0.65rem', top: '0.55rem', color: '#9ca3af', display: 'flex'}}>
                      <SearchIcon size={14} />
                    </span>
                  </div>
                </div>

                <div style={{flex: 1, overflowY: 'auto', padding: '0.5rem'}}>
                  {filteredDbConversations.length === 0 ? (
                    <div style={{padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '13px'}}>
                      No conversations found for this filter.
                    </div>
                  ) : (
                    filteredDbConversations.map((c) => {
                      const isSelected = selectedConvId === c.id
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedConvId(c.id)}
                          style={{
                            padding: '0.85rem',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#fef2f2' : '#ffffff',
                            border: isSelected ? '1px solid #fca5a5' : '1px solid #f3f4f6',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem'}}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#711822' : '#e5e7eb',
                              color: isSelected ? '#ffffff' : '#374151',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}>
                              {c.prospect_initials || 'P'}
                            </div>
                            <div style={{flex: 1, minWidth: 0}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{fontWeight: 700, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                  {c.prospect_name}
                                </span>
                                <span style={{fontSize: '11px', color: '#9ca3af', flexShrink: 0}}>
                                  {c.time_ago}
                                </span>
                              </div>
                              <div style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {c.company} • {c.title || 'Executive'}
                              </div>
                            </div>
                          </div>

                          <div style={{fontSize: '13px', color: '#4b5563', lineHeight: '1.4', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                            {c.latest_message}
                          </div>

                          <div style={{display: 'flex', gap: '0.4rem', alignItems: 'center'}}>
                            <span style={{
                              fontSize: '10px',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: c.channel === 'EMAIL' ? '#e0f2fe' : '#f0fdf4',
                              color: c.channel === 'EMAIL' ? '#0369a1' : '#15803d',
                              fontWeight: 600,
                            }}>
                              {c.channel}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: c.status === 'NEEDS_ATTENTION' ? '#fee2e2' : c.status === 'HUMAN_TAKEOVER' ? '#fef3c7' : '#f3f4f6',
                              color: c.status === 'NEEDS_ATTENTION' ? '#b91c1c' : c.status === 'HUMAN_TAKEOVER' ? '#b45309' : '#4b5563',
                              fontWeight: 600,
                            }}>
                              {c.status_label || c.status}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Live Message Thread Viewer & Reply */}
              <div style={{
                flex: 1,
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                {loadingDetail ? (
                  <div style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6b7280'}}>
                    Loading conversation messages...
                  </div>
                ) : !activeConvDetail ? (
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#9ca3af', gap: '0.5rem'}}>
                    <ChatBubbleIcon size={36} />
                    <p style={{fontSize: '15px'}}>Select a conversation on the left to view messages</p>
                  </div>
                ) : (
                  <>
                    {/* Thread Header */}
                    <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa'}}>
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          <h3 style={{margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827'}}>
                            {activeConvDetail.prospect?.name}
                          </h3>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                          }}>
                            {activeConvDetail.channel}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: activeConvDetail.status === 'NEEDS_ATTENTION' ? '#fee2e2' : '#fef3c7',
                            color: activeConvDetail.status === 'NEEDS_ATTENTION' ? '#b91c1c' : '#b45309',
                          }}>
                            {activeConvDetail.status_label || activeConvDetail.status}
                          </span>
                        </div>
                        <div style={{fontSize: '13px', color: '#6b7280', marginTop: '0.2rem'}}>
                          {activeConvDetail.prospect?.title} • {activeConvDetail.prospect?.company}
                          {activeConvDetail.campaign_name && ` | Campaign: ${activeConvDetail.campaign_name}`}
                        </div>
                      </div>

                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button
                          type="button"
                          onClick={() => handleTakeover(activeConvDetail.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#fff',
                            color: '#374151',
                            cursor: 'pointer',
                          }}
                        >
                          Human Takeover
                        </button>
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div style={{flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f9fafb'}}>
                      {(!activeConvDetail.messages || activeConvDetail.messages.length === 0) ? (
                        <div style={{textAlign: 'center', color: '#6b7280', marginTop: '3rem'}}>
                          No messages yet in this conversation.
                        </div>
                      ) : (
                        activeConvDetail.messages.map((m) => {
                          const isInbound = m.direction === 'INBOUND'
                          return (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isInbound ? 'flex-start' : 'flex-end',
                              }}
                            >
                              <div style={{fontSize: '11px', color: '#9ca3af', marginBottom: '0.25rem', padding: '0 0.5rem'}}>
                                {m.sender} • {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                              </div>
                              <div
                                style={{
                                  maxWidth: '75%',
                                  padding: '0.85rem 1.15rem',
                                  borderRadius: isInbound ? '0 12px 12px 12px' : '12px 0 12px 12px',
                                  backgroundColor: isInbound ? '#ffffff' : '#711822',
                                  color: isInbound ? '#1f2937' : '#ffffff',
                                  border: isInbound ? '1px solid #e5e7eb' : 'none',
                                  fontSize: '14px',
                                  lineHeight: '1.5',
                                  whiteSpace: 'pre-wrap',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                              >
                                {m.body}
                              </div>
                            </div>
                          )
                        })
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Autonomous RAG Email Generator & Manager Submission Panel */}
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        borderTop: '2px solid #e2e8f0',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                      }}
                    >
                      {/* Panel Title & Status Header */}
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#711822',
                            color: '#ffffff',
                            fontSize: '14px',
                            boxShadow: '0 1px 3px rgba(113,24,34,0.3)',
                          }}>
                            ⚡
                          </div>
                          <div>
                            <div style={{fontWeight: 700, fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                              Autonomous RAG Email Generator
                              <span style={{fontSize: '11px', fontWeight: 600, color: '#047857', backgroundColor: '#dcfce7', padding: '0.1rem 0.45rem', borderRadius: '4px'}}>
                                LangChain + Qdrant
                              </span>
                            </div>
                            <div style={{fontSize: '11px', color: '#6b7280'}}>
                              Reply generated using grounded knowledge base via <code style={{color: '#711822', fontWeight: 600}}>reply_agent.py</code>
                            </div>
                          </div>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          {ragIntent && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              backgroundColor: '#f3e8ff',
                              color: '#6b21a8',
                            }}>
                              Intent: {ragIntent}
                            </span>
                          )}
                          {isSubmittedToManager ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '12px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}>
                              ⏳ Pending Manager Approval
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '12px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                            }}>
                              Ready for Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* RAG Knowledge Grounding Badges */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        flexWrap: 'wrap',
                        fontSize: '11px',
                        backgroundColor: '#f8fafc',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}>
                        <span style={{fontWeight: 700, color: '#334155'}}>Grounded Context:</span>
                        <span style={{backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.12rem 0.4rem', borderRadius: '4px'}}>
                          🏢 Qdrant Integrations
                        </span>
                        <span style={{backgroundColor: '#ecfdf5', color: '#047857', padding: '0.12rem 0.4rem', borderRadius: '4px'}}>
                          🛡️ SOC-2 & GDPR Verified
                        </span>
                        <span style={{backgroundColor: '#fff7ed', color: '#c2410c', padding: '0.12rem 0.4rem', borderRadius: '4px'}}>
                          📊 FinTech Case Study (3.2x Meetings)
                        </span>
                        <span style={{backgroundColor: '#f1f5f9', color: '#475569', padding: '0.12rem 0.4rem', borderRadius: '4px'}}>
                          🔒 Zero PII Retention
                        </span>
                      </div>

                      {/* Email Subject Field */}
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{fontSize: '12px', fontWeight: 600, color: '#64748b', minWidth: '55px'}}>Subject:</span>
                        <input
                          type="text"
                          value={ragSubject}
                          onChange={(e) => setRagSubject(e.target.value)}
                          placeholder="Email Subject..."
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.65rem',
                            fontSize: '13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            backgroundColor: '#f8fafc',
                          }}
                        />
                      </div>

                      {/* Generated Email Draft Textarea */}
                      <div style={{position: 'relative'}}>
                        {generatingRAG && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            zIndex: 5,
                            color: '#711822',
                            fontWeight: 600,
                            fontSize: '13px',
                            gap: '0.5rem',
                          }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              border: '3px solid #fecdd3',
                              borderTop: '3px solid #711822',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            Synthesizing Grounded Email Draft via RAG (reply_agent.py)...
                          </div>
                        )}
                        <textarea
                          value={ragDraftBody}
                          onChange={(e) => setRagDraftBody(e.target.value)}
                          rows={6}
                          placeholder="RAG generated email draft will appear here..."
                          style={{
                            width: '100%',
                            padding: '0.85rem',
                            fontSize: '13.5px',
                            lineHeight: '1.55',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: isSubmittedToManager ? '#f8fafc' : '#ffffff',
                            color: '#1e293b',
                            outline: 'none',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        />
                      </div>

                      {/* RAG Steering & Feedback Prompt Row */}
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#f1f5f9',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                      }}>
                        <span style={{fontSize: '13px'}}>💡</span>
                        <input
                          type="text"
                          placeholder="Prompt RAG to revise (e.g. 'Make it under 60 words', 'Emphasize SOC-2 compliance')..."
                          value={ragFeedback}
                          onChange={(e) => setRagFeedback(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleGenerateRAG(ragFeedback.trim(), true)
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.6rem',
                            fontSize: '12.5px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleGenerateRAG(ragFeedback.trim(), true)}
                          disabled={generatingRAG}
                          style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🔄 Regenerate with RAG
                        </button>
                      </div>

                      {/* Action Bar: Compliance Note + Submit to Manager */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        paddingTop: '0.25rem',
                      }}>
                        {/* Compliance Notice */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '11.5px',
                          color: '#64748b',
                          maxWidth: '460px',
                        }}>
                          <span>🛡️</span>
                          <span>
                            <strong>Guaranteed Manager Review:</strong> Outbound emails are RAG generated and sent to the Manager for review. Direct emailing is restricted for reps.
                          </span>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          {/* Escalation mini-input */}
                          <div style={{display: 'flex', gap: '0.35rem', alignItems: 'center'}}>
                            <input
                              type="text"
                              placeholder="Escalation note (optional)..."
                              value={escalateReason}
                              onChange={(e) => setEscalateReason(e.target.value)}
                              style={{
                                padding: '0.45rem 0.6rem',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                width: '160px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleExecutiveEscalate}
                              style={{
                                padding: '0.45rem 0.75rem',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                cursor: 'pointer',
                              }}
                            >
                              Escalate
                            </button>
                          </div>

                          {/* PRIMARY ACTION: Send to Manager for Approval */}
                          <button
                            type="button"
                            onClick={handleSubmitToManager}
                            disabled={submittingToManager || !ragDraftBody.trim()}
                            className="sdr-primary-btn"
                            style={{
                              padding: '0.6rem 1.4rem',
                              fontSize: '13px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              backgroundColor: isSubmittedToManager ? '#15803d' : '#711822',
                              borderColor: isSubmittedToManager ? '#166534' : '#5a131b',
                              color: '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            {submittingToManager
                              ? 'Submitting...'
                              : isSubmittedToManager
                              ? '✓ Submitted to Manager (Click to Update)'
                              : 'Send to Manager for Approval'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =========================================================================
  // ADMIN / MANAGER VIEW: Full Overview with Escalations & Summary
  // =========================================================================
  const filteredConversations = recentConversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (c.prospect_name && c.prospect_name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.campaign_name && c.campaign_name.toLowerCase().includes(q)) ||
      (c.latest_message && c.latest_message.toLowerCase().includes(q))
    )
  })

  const filteredEscalations = escalations.filter((e) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (e.prospect_name && e.prospect_name.toLowerCase().includes(q)) ||
      (e.campaign_name && e.campaign_name.toLowerCase().includes(q)) ||
      (e.reason && e.reason.toLowerCase().includes(q))
    )
  })

  return (
    <div className="sdr-app-layout">
      <Sidebar activeTab="conversations" onSelectTab={handleNavSelect} userRole={user?.role} />

      <main className="sdr-main">
        <div className="sdr-container">
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

          {toastMessage && (
            <div className="sdr-toast" role="status">
              {toastMessage}
            </div>
          )}

          <section className="sdr-page-header">
            <h1 className="sdr-page-title">Conversations & Escalations</h1>
            <p className="sdr-page-desc">
              Monitor AI-driven conversations and intervene when human judgment is required.
            </p>
          </section>

          {/* 4 Summary Cards */}
          <section className="sdr-conv-summary-grid" aria-label="Conversation Statistics">
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

            <div
              className={`sdr-conv-stat-card ${selectedFilter === 'AI_HANDLING' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('AI_HANDLING')}
            >
              <div className="sdr-conv-stat-icon teal-badge">
                <CpuIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">AI HANDLING</span>
                <span className="sdr-conv-stat-value">{summary.ai_handling}</span>
              </div>
            </div>

            <div
              className={`sdr-conv-stat-card ${selectedFilter === 'HUMAN_TAKEOVER' ? 'selected' : ''}`}
              onClick={() => setSelectedFilter('HUMAN_TAKEOVER')}
            >
              <div className="sdr-conv-stat-icon orange-badge">
                <UserIcon size={20} />
              </div>
              <div className="sdr-conv-stat-content">
                <span className="sdr-conv-stat-title">HUMAN TAKEOVER</span>
                <span className="sdr-conv-stat-value">{summary.human_takeover}</span>
              </div>
            </div>
          </section>

          {/* Recent Conversations Table */}
          <section className="sdr-card" style={{marginTop: '1.5rem'}}>
            <div style={{padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{fontSize: '18px', fontWeight: 700, margin: 0}}>Recent Conversations</h2>
              <span style={{fontSize: '13px', color: '#6b7280'}}>{filteredConversations.length} total</span>
            </div>
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px'}}>
                <thead>
                  <tr style={{backgroundColor: '#f9fafb', color: '#4b5563', borderBottom: '1px solid #e5e7eb'}}>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600}}>Prospect</th>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600}}>Campaign</th>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600}}>Channel</th>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600}}>Status</th>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600}}>Latest Message</th>
                    <th style={{padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConversations.map((conv) => (
                    <tr key={conv.id} style={{borderBottom: '1px solid #f3f4f6'}}>
                      <td style={{padding: '1rem'}}>
                        <div style={{fontWeight: 600, color: '#111827'}}>{conv.prospect_name}</div>
                        <div style={{fontSize: '12px', color: '#6b7280'}}>{conv.title} • {conv.company}</div>
                      </td>
                      <td style={{padding: '1rem', color: '#4b5563'}}>{conv.campaign_name}</td>
                      <td style={{padding: '1rem'}}>
                        <span style={{padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: '#e0f2fe', color: '#0369a1'}}>
                          {conv.channel}
                        </span>
                      </td>
                      <td style={{padding: '1rem'}}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: conv.status === 'NEEDS_ATTENTION' ? '#fee2e2' : conv.status === 'HUMAN_TAKEOVER' ? '#fef3c7' : '#f3f4f6',
                          color: conv.status === 'NEEDS_ATTENTION' ? '#b91c1c' : conv.status === 'HUMAN_TAKEOVER' ? '#b45309' : '#4b5563',
                        }}>
                          {conv.status_label || conv.status}
                        </span>
                      </td>
                      <td style={{padding: '1rem', color: '#4b5563', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {conv.latest_message}
                      </td>
                      <td style={{padding: '1rem', textAlign: 'right'}}>
                        <button
                          type="button"
                          onClick={() => {
                            if (conv.id.length > 30) {
                              navigate(`/review/${conv.id}`)
                            } else {
                              handleTakeover(conv.id)
                            }
                          }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            backgroundColor: '#711822',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Review & Takeover
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
    </div>
  )
}
