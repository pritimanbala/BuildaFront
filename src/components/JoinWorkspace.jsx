import React, { useEffect, useState } from 'react'
import { linkAdminCode, fetchJoinStatus, fetchCurrentUser, signOutUser } from '../api.js'
import { navigate } from '../App.jsx'
import '../dashboard.css'

export default function JoinWorkspace({ onLinked }) {
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Check on mount if the user already has a pending join request or is already approved
  useEffect(() => {
    let isMounted = true

    async function checkStatus() {
      try {
        const statusData = await fetchJoinStatus()
        if (!isMounted) return

        if (statusData.admin_linked || statusData.status === 'APPROVED') {
          const user = await fetchCurrentUser()
          if (onLinked) onLinked(user)
          else navigate('/conversations')
          return
        }

        if (statusData.status === 'PENDING') {
          setPendingStatus(statusData)
        }
      } catch (err) {
        console.warn('Could not fetch join status:', err)
      }
    }

    checkStatus()

    return () => {
      isMounted = false
    }
  }, [onLinked])

  // Polling when pending approval
  useEffect(() => {
    if (!pendingStatus || pendingStatus.status !== 'PENDING') return

    const interval = setInterval(async () => {
      try {
        const statusData = await fetchJoinStatus()
        if (statusData.admin_linked || statusData.status === 'APPROVED') {
          clearInterval(interval)
          const user = await fetchCurrentUser()
          if (onLinked) onLinked(user)
          else navigate('/conversations')
        } else if (statusData.status === 'REJECTED') {
          setPendingStatus(statusData)
          setJoinError('Your previous join request was rejected. Please enter a valid code or contact your administrator.')
        }
      } catch (err) {
        // ignore polling network errors
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [pendingStatus, onLinked])

  const handleManualCheck = async () => {
    setCheckingStatus(true)
    setJoinError('')
    try {
      const statusData = await fetchJoinStatus()
      if (statusData.admin_linked || statusData.status === 'APPROVED') {
        const user = await fetchCurrentUser()
        if (onLinked) onLinked(user)
        else navigate('/conversations')
      } else if (statusData.status === 'PENDING') {
        setPendingStatus(statusData)
      } else if (statusData.status === 'REJECTED') {
        setPendingStatus(null)
        setJoinError('Your join request was rejected. Please enter a valid code.')
      } else {
        setPendingStatus(null)
      }
    } catch (err) {
      setJoinError('Error checking status. Please try again.')
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setJoinError('')
    setJoining(true)
    try {
      const res = await linkAdminCode(joinCode.trim())
      if (res.admin_linked || res.status === 'APPROVED') {
        const user = res.user || (await fetchCurrentUser())
        if (onLinked) {
          onLinked(user)
        } else {
          navigate('/conversations')
        }
      } else {
        // Status is PENDING - Waiting for admin approval
        setPendingStatus({
          status: 'PENDING',
          code_entered: joinCode.trim(),
          message: res.message || 'Join request submitted! Awaiting administrator approval.',
        })
      }
    } catch (err) {
      setJoinError(
        err?.response?.data?.detail ||
          'Invalid workspace invite code or connection error. Please verify with your admin.'
      )
    } finally {
      setJoining(false)
    }
  }

  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  return (
    <div
      className="sdr-app-layout"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '18px', color: '#111827' }}>
          Autonomous SDR
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Sign Out
        </button>
      </header>
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <div
          className="sdr-settings-card"
          style={{
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            borderRadius: '12px',
            padding: '2rem',
          }}
        >
          {pendingStatus && pendingStatus.status === 'PENDING' ? (
            /* Pending Approval View */
            <div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  fontSize: '24px',
                }}
              >
                ⏳
              </div>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Pending Admin Approval
              </div>
              <h2
                className="sdr-card-section-title"
                style={{ fontSize: '22px', marginBottom: '0.5rem' }}
              >
                Join Request Submitted
              </h2>
              <p
                style={{
                  marginBottom: '1.5rem',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
              >
                Your invite code has been verified and your join request is now
                visible to the workspace administrator in <strong>Settings &gt; Collaboration</strong>. Once the admin approves your request, you will immediately gain access.
              </p>

              {pendingStatus.code_entered && (
                <div
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#4b5563' }}>Submitted Code:</span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#111827',
                      letterSpacing: '1px',
                    }}
                  >
                    {pendingStatus.code_entered}
                  </span>
                </div>
              )}

              {joinError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                  }}
                >
                  {joinError}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className="sdr-primary-btn"
                  onClick={handleManualCheck}
                  disabled={checkingStatus}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.75rem',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  {checkingStatus ? 'Checking...' : 'Check Approval Status'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPendingStatus(null)
                    setJoinCode('')
                    setJoinError('')
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    padding: '0.65rem',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#4b5563',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Enter a Different Code
                </button>
              </div>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '13px',
                  color: '#9ca3af',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                Auto-refreshing status in background...
              </div>
            </div>
          ) : (
            /* Join Box View */
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                  color: '#991b1b',
                  fontSize: '22px',
                }}
              >
                🔐
              </div>
              <h2
                className="sdr-card-section-title"
                style={{ fontSize: '22px', marginBottom: '0.5rem' }}
              >
                Join Workspace
              </h2>
              <p
                style={{
                  marginBottom: '1.5rem',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}
              >
                As a Sales Executive, enter your workspace invite code below. Once
                submitted, your administrator will approve your access in Settings.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="sdr-form-field">
                  <label
                    className="sdr-form-label"
                    style={{ fontWeight: 600 }}
                  >
                    WORKSPACE INVITE CODE
                  </label>
                  <input
                    type="text"
                    className="sdr-form-input"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter invite code (e.g. helloguys)..."
                    required
                    autoFocus
                    style={{ fontSize: '15px', padding: '0.75rem 1rem' }}
                  />
                </div>
                {joinError && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {joinError}
                  </div>
                )}
                <button
                  type="submit"
                  className="sdr-primary-btn"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.75rem',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                  disabled={joining}
                >
                  {joining ? 'Submitting Code...' : 'Submit Join Request'}
                </button>
              </form>
              <div
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#6b7280',
                }}
              >
                Don't have a code? Contact your workspace Administrator.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

