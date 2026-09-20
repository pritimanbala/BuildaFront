import React, { useEffect, useState } from 'react'
import { fetchCurrentUser, fetchKillSwitch, signOutUser } from '../api.js'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import '../dashboard.css'
import { navigate } from '../App.jsx'

export default function ConversationReview() {
  const [id, setId] = useState(() => {
    const parts = window.location.pathname.split('/')
    return parts[parts.length - 1]
  })
  
  const [user, setUser] = useState(null)
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [reviewData, setReviewData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, killSwitchData] = await Promise.all([
          fetchCurrentUser(),
          fetchKillSwitch(),
        ])
        
        if (isMounted) {
          if (userData) setUser(userData)
          if (killSwitchData) setKillSwitchActive(killSwitchData.active)
        }
      } catch (error) {
        console.error('Error loading core data:', error)
      }
    }
    
    async function loadReviewData() {
      try {
        // We handle missing id gracefully for prototyping, 
        // if no real ID, use a dummy one that the backend might fail to find
        // but we'll fetch from the newly created backend endpoint:
        const response = await fetch(`http://127.0.0.1:8000/api/conversations/${id}/review`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (isMounted) setReviewData(data)
        } else {
          // If backend fails or id is missing, we use mock data to ensure the UI renders for review
          if (isMounted) setReviewData(mockData)
        }
      } catch (err) {
        console.error('Failed to load review data', err)
        if (isMounted) setReviewData(mockData)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    if (id) {
      loadReviewData()
    } else {
      setReviewData(mockData)
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [id])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleApprove = async () => {
    if (!id) return showToast('Approved (mock)')
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/conversations/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (res.ok) {
        showToast('Draft Approved and Sent!')
      }
    } catch (e) {
      showToast('Error approving draft')
    }
  }

  const handleReject = async () => {
    if (!id) return showToast('Rejected (mock)')
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/conversations/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback })
      })
      if (res.ok) {
        showToast('Draft Rejected with Feedback!')
      }
    } catch (e) {
      showToast('Error rejecting draft')
    }
  }

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  if (loading || !reviewData) {
    return (
      <div className="sdr-app-layout">
        <Sidebar activeTab="agent-activity" />
        <main className="sdr-main" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          Loading...
        </main>
      </div>
    )
  }

  const { prospect, conversation, agent_recommendation } = reviewData

  return (
    <div className="sdr-app-layout">
      {toastMessage && <div className="sdr-toast">{toastMessage}</div>}
      <Sidebar activeTab="agent-activity" userRole={user?.role} />
      
      <main className="sdr-main" style={{display: 'flex', flexDirection: 'column'}}>
        <div className="sdr-container" style={{maxWidth: '1600px'}}>
          <Header
            searchQuery=""
            placeholder="Search prospects, campaigns..."
            user={user}
            onSignOut={handleSignOut}
            killSwitchActive={killSwitchActive}
          />
          
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem'}}>
            <h1 className="sdr-page-title" style={{fontSize: '24px', margin: 0}}>Conversation Review</h1>
            <span style={{backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '12px', fontWeight: 700}}>
              ● AWAITING APPROVAL
            </span>
          </div>

          <div style={{display: 'flex', gap: '1.5rem'}}>
            {/* LEFT COLUMN: Profile & Audit */}
            <div style={{flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              
              {/* Profile Card */}
              <div className="sdr-settings-card" style={{padding: '2rem 1.5rem', textAlign: 'center', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <div style={{width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#60a5fa', color: '#fff', fontSize: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'}}>
                  {prospect.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h2 style={{margin: '0 0 0.5rem', fontSize: '20px', fontWeight: 700}}>{prospect.name}</h2>
                <p style={{margin: '0 0 1.5rem', color: '#6b7280', fontSize: '14px'}}>{prospect.title},<br/>{prospect.company}</p>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', fontSize: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem'}}>
                    <span style={{color: '#6b7280', fontWeight: 600}}>CAMPAIGN</span>
                    <span style={{fontWeight: 600}}>{prospect.campaign}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem'}}>
                    <span style={{color: '#6b7280', fontWeight: 600}}>ICP SCORE</span>
                    <span style={{fontWeight: 700, color: '#10b981'}}>{prospect.icp_score}/100</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem'}}>
                    <span style={{color: '#6b7280', fontWeight: 600}}>FUNNEL STAGE</span>
                    <span style={{fontWeight: 600, color: '#0ea5e9'}}>{prospect.funnel_stage}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem'}}>
                    <span style={{color: '#6b7280', fontWeight: 600}}>EXECUTIVE</span>
                    <span style={{fontWeight: 600}}>{prospect.executive}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: '#6b7280', fontWeight: 600}}>SENTIMENT</span>
                    <span style={{backgroundColor: '#d1fae5', color: '#065f46', padding: '0.125rem 0.5rem', borderRadius: '1rem', fontWeight: 600}}>{prospect.sentiment}</span>
                  </div>
                </div>
              </div>

              {/* Safety Checks */}
              <div className="sdr-settings-card" style={{padding: '1.5rem', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <h3 style={{fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                  🛡️ Safety Checks
                </h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '13px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span style={{color: '#10b981'}}>✔</span> Opt-out status: {reviewData.safety_checks?.opt_out || 'No'}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span style={{color: '#10b981'}}>✔</span> Duplicate check: {reviewData.safety_checks?.duplicate_check || 'Pass'}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span style={{color: '#f59e0b'}}>ℹ</span> Recent interaction: {reviewData.safety_checks?.recent_interaction || '3 days ago'}
                  </div>
                </div>
              </div>

              {/* Audit History */}
              <div className="sdr-settings-card" style={{padding: '1.5rem', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <h3 style={{fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                  ⏱ Audit History
                </h3>
                <div style={{position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                  <div style={{position: 'relative'}}>
                    <div style={{position: 'absolute', left: '-1.35rem', top: '0.25rem', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0ea5e9'}}></div>
                    <div style={{fontSize: '11px', color: '#6b7280'}}>Today, 10:45 AM</div>
                    <div style={{fontSize: '13px', fontWeight: 600}}>AI generated response v2.4</div>
                    <div style={{fontSize: '12px', color: '#4b5563'}}>Reason: Inquiry about past case studies</div>
                  </div>
                  <div style={{position: 'relative'}}>
                    <div style={{position: 'absolute', left: '-1.35rem', top: '0.25rem', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d1d5db'}}></div>
                    <div style={{fontSize: '11px', color: '#6b7280'}}>Yesterday, 02:15 PM</div>
                    <div style={{fontSize: '13px', fontWeight: 600}}>Prospect responded</div>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div style={{padding: '1.5rem', backgroundColor: '#711822', color: '#fff', borderRadius: '8px', marginTop: 'auto'}}>
                <h3 style={{fontSize: '11px', fontWeight: 600, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '1rem'}}>System Health</h3>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '0.5rem'}}>
                  <span>Campaign Status</span>
                  <span style={{color: '#34d399'}}>Active</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '0.5rem'}}>
                  <span>Channel</span>
                  <span style={{color: '#34d399'}}>Healthy</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                  <span>Frequency Check</span>
                  <span style={{color: '#34d399'}}>Pass</span>
                </div>
              </div>

            </div>

            {/* MIDDLE COLUMN: Chat Thread & Recommendation */}
            <div style={{flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              
              <div className="sdr-settings-card" style={{flex: 1, padding: '2rem', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowY: 'auto', minHeight: '600px'}}>
                
                {/* AI Agent Original Message */}
                <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
                  <div style={{width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#7f1d1d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px'}}>AI</div>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                      <span style={{fontWeight: 700, fontSize: '14px'}}>AI Agent (Outreach)</span>
                      <span style={{fontSize: '12px', color: '#6b7280'}}>- 3 days ago</span>
                    </div>
                    <div style={{backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0 8px 8px 8px', fontSize: '14px', color: '#374151', lineHeight: '1.5'}}>
                      Hi Ananya, I noticed Company X is scaling engineering fast. We've helped similar SaaS firms reduce delivery overhead by 30%. Would you be open to a chat?
                    </div>
                  </div>
                </div>

                {/* Prospect Reply */}
                <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexDirection: 'row-reverse'}}>
                  <div style={{width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#60a5fa', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px'}}>
                    {prospect.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '12px', color: '#6b7280'}}>- Yesterday, 09:15 AM</span>
                      <span style={{fontWeight: 700, fontSize: '14px'}}>{prospect.name} (Prospect)</span>
                    </div>
                    <div style={{border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px 0 8px 8px', fontSize: '14px', color: '#374151', lineHeight: '1.5', maxWidth: '80%'}}>
                      Thanks Jordan. We're actually looking for ways to improve our sprint velocity right now. Do you have any specific examples of SaaS companies in the fintech space you've worked with?
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0'}}>
                  <div style={{flex: 1, height: '1px', backgroundColor: '#e5e7eb'}}></div>
                  <div style={{fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'}}>New AI Recommendation</div>
                  <div style={{flex: 1, height: '1px', backgroundColor: '#e5e7eb'}}></div>
                </div>

                {/* AI Recommended Response */}
                <div style={{border: '1px solid #0ea5e9', borderRadius: '8px', padding: '1.5rem', position: 'relative'}}>
                  <div style={{position: 'absolute', top: '-12px', right: '1.5rem', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '11px', fontWeight: 700, border: '1px solid #0ea5e9'}}>
                    🪄 PROMPT V2.4
                  </div>
                  
                  <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                    <div style={{width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#7f1d1d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px'}}>AI</div>
                    <div>
                      <div style={{fontWeight: 700, fontSize: '14px'}}>Recommended Response</div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>Generated today, 10:45 AM - 94% Confidence</div>
                    </div>
                  </div>

                  <div style={{fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '1.5rem', whiteSpace: 'pre-wrap'}}>
                    {`Hi Ananya, absolutely. We recently partnered with a Series B fintech (similar scale to Company X) that was struggling with sprint predictability during their expansion. 

I've attached a brief summary of how we helped them increase velocity by 25%. Would you be open to a brief 20-minute meeting on Tuesday or Wednesday next week to see the framework we used?`}
                  </div>

                  <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                    <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.75rem', flex: 1}}>
                      <div style={{fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem'}}>Intent & Sentiment</div>
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <span style={{backgroundColor: '#477e7e', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600}}>Inquiry</span>
                        <span style={{backgroundColor: '#34d399', color: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600}}>Positive</span>
                      </div>
                    </div>
                    <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.75rem', flex: 1}}>
                      <div style={{fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem'}}>Suggested Next Action</div>
                      <div style={{fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        📅 Schedule Meeting
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '0.5rem'}}>Knowledge Sources Used:</div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <span style={{backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '11px', border: '1px solid #d1d5db'}}>📄 Fintech Case Study 2024</span>
                      <span style={{backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '11px', border: '1px solid #d1d5db'}}>📄 Product Features DB</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ask AI to Refine */}
              <div className="sdr-settings-card" style={{padding: '1.5rem', border: 'none', backgroundColor: '#e5e7eb', borderRadius: '8px'}}>
                <h3 style={{fontSize: '14px', fontWeight: 700, marginBottom: '1rem'}}>Ask AI to Refine</h3>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <input type="text" placeholder="Enter instructions to modify the draft (e.g. 'Make it shorter and more professional')..." style={{flex: 1, padding: '1rem', border: 'none', borderRadius: '6px', outline: 'none'}} />
                  <button type="button" style={{backgroundColor: '#5bc0be', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 1.5rem', fontWeight: 700, cursor: 'pointer'}}>REGENERATE</button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Actions & Feedback */}
            <div style={{flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div className="sdr-settings-card" style={{padding: '1.5rem', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <h3 style={{fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px'}}>Manager Actions</h3>
                
                <button type="button" onClick={handleApprove} style={{width: '100%', padding: '1rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer'}}>
                  🚀 Approve & Send
                </button>
                
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                  <button type="button" style={{flex: 1, padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                    ✏️ Edit
                  </button>
                  <button type="button" style={{flex: 1, padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}>
                    🔄 Retry
                  </button>
                </div>

                <button type="button" onClick={handleReject} style={{width: '100%', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'}}>
                  Reject Draft
                </button>
                
                <hr style={{border: 'none', borderTop: '1px solid #f3f4f6', margin: '1.5rem 0'}} />

                <h3 style={{fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                  💬 REVIEW & FEEDBACK
                </h3>
                
                <label style={{fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block'}}>
                  FEEDBACK FOR {prospect.executive.split(' ')[0]}
                </label>
                <textarea 
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write internal feedback here..." 
                  style={{width: '100%', height: '100px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', resize: 'none', fontFamily: 'inherit'}}
                />

                <label style={{fontSize: '10px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block'}}>
                  QUALITY RATING
                </label>
                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
                  <button type="button" style={{flex: 1, padding: '0.5rem', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontWeight: 600}}>Needs Work</button>
                  <button type="button" style={{flex: 1, padding: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600}}>Good</button>
                  <button type="button" style={{flex: 1, padding: '0.5rem', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', fontWeight: 600}}>Excellent</button>
                </div>

                <button type="button" onClick={handleReject} style={{width: '100%', padding: '0.75rem', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'}}>
                  Send Feedback to Rep
                </button>
              </div>

              <div className="sdr-settings-card" style={{padding: '1.5rem', border: 'none', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                <h3 style={{fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  📅 NEXT STEPS & SCHEDULING
                </h3>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                  <span style={{fontSize: '13px', fontWeight: 600}}>Availability</span>
                  <span style={{fontSize: '11px', color: '#0ea5e9', fontWeight: 600}}>Synced</span>
                </div>

                <div style={{display: 'flex', gap: '1rem', backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid #e0f2fe'}}>
                  <div style={{backgroundColor: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px', textAlign: 'center', border: '1px solid #e0f2fe'}}>
                    <div style={{fontSize: '10px', color: '#0ea5e9', fontWeight: 700}}>OCT</div>
                    <div style={{fontSize: '16px', fontWeight: 700}}>24</div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '13px', fontWeight: 700}}>Discovery Call</div>
                    <div style={{fontSize: '11px', color: '#6b7280'}}>2:00 PM - 2:30 PM</div>
                  </div>
                  <div style={{color: '#3b82f6', fontSize: '18px', display: 'flex', alignItems: 'center'}}>+</div>
                </div>

                <div style={{display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '6px', border: '1px solid #f3f4f6'}}>
                  <div style={{padding: '0.25rem 0.5rem', borderRadius: '4px', textAlign: 'center', border: '1px solid #f3f4f6'}}>
                    <div style={{fontSize: '10px', color: '#6b7280', fontWeight: 700}}>OCT</div>
                    <div style={{fontSize: '16px', fontWeight: 700, color: '#9ca3af'}}>25</div>
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '13px', fontWeight: 700}}>Follow-up Window</div>
                    <div style={{fontSize: '11px', color: '#6b7280'}}>10:00 AM - 11:00 AM</div>
                  </div>
                  <div style={{color: '#d1d5db', fontSize: '18px', display: 'flex', alignItems: 'center'}}>+</div>
                </div>

              </div>
              
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

const mockData = {
  conversation: {
    id: "1",
    status: "AWAITING APPROVAL"
  },
  prospect: {
    name: "Ananya Rao",
    title: "Head of Engineering",
    company: "Company X",
    campaign: "Q4 SaaS Expansion",
    icp_score: "92",
    funnel_stage: "Discovery",
    executive: "Jordan Smith",
    sentiment: "Interested"
  },
  safety_checks: {
    opt_out: "No",
    duplicate_check: "Pass",
    recent_interaction: "3 days ago"
  },
  messages: [],
  drafts: [],
  agent_recommendation: {
    intent: "Inquiry",
    sentiment: "Positive",
    confidence: "94%",
    recommended_action: "Schedule Meeting",
    suggested_response: "Hi Ananya, absolutely. We recently partnered with a Series B fintech...",
    sources: ["Fintech Case Study 2024", "Product Features DB"]
  },
  audit_history: []
}
