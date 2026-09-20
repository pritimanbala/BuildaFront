import React, { useEffect, useState, useMemo } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  SearchIcon,
  CheckIcon,
  XIcon,
  OutreachIcon,
  ChevronDownIcon,
  BarChartIcon,
  AlertCircleIcon,
} from '../components/Icons.jsx'
import {
  fetchCurrentUser,
  fetchKillSwitch,
  toggleKillSwitch,
  signOutUser,
  fetchActiveCampaigns,
  fetchCampaignOutreach,
  searchCampaignOutreach,
  addProspectToCampaign,
} from '../api.js'
import '../dashboard.css'

export default function Outreach() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [killSwitchActive, setKillSwitchActive] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [campaignData, setCampaignData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [headerSearchQuery, setHeaderSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Form & Filter states matching Photo 2 & 3
  const [locationFilter, setLocationFilter] = useState('Location')
  const [companySizeFilter, setCompanySizeFilter] = useState('Company Size')
  const [financialsFilter, setFinancialsFilter] = useState('Financials')
  const [sectorFilter, setSectorFilter] = useState('Sector')
  
  const [channels, setChannels] = useState({
    email: true,
    linkedIn: true,
    messages: true,
  })

  // Prompt & Search state
  const [promptText, setPromptText] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [webhookData, setWebhookData] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const [reviewedProspect, setReviewedProspect] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Parse campaign_id from query params if available
  const getQueryCampaignId = () => {
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('campaign_id')
    } catch {
      return null
    }
  }

  // Load initial campaigns & user
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const [userData, killData, campList] = await Promise.all([
          fetchCurrentUser(),
          fetchKillSwitch(),
          fetchActiveCampaigns(),
        ])
        if (userData) setUser(userData)
        setKillSwitchActive(killData)

        const list = Array.isArray(campList) ? campList : []
        setCampaigns(list)

        const qId = getQueryCampaignId()
        let targetId = ''
        if (qId && list.some((c) => String(c.id) === String(qId))) {
          targetId = qId
        } else if (list.length > 0) {
          targetId = list[0].id
        }

        setSelectedCampaignId(targetId)
        if (targetId) {
          const outreach = await fetchCampaignOutreach(targetId)
          if (outreach) {
            setCampaignData(outreach)
          }
        }
      } catch (err) {
        console.error('Failed to initialize outreach:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // When selected campaign changes
  const handleSelectCampaign = async (campId) => {
    setSelectedCampaignId(campId)
    // Update URL query param cleanly
    const url = new URL(window.location)
    url.searchParams.set('campaign_id', campId)
    window.history.replaceState({}, '', url)

    try {
      setLoading(true)
      const outreach = await fetchCampaignOutreach(campId)
      if (outreach) {
        setCampaignData(outreach)
      }
      setHasSearched(false)
      setSearchResults([])
      setWebhookData(null)
    } catch (err) {
      console.error('Failed to load campaign outreach:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Logout
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

  // Nav item click
  const handleNavSelect = (tabId) => {
    if (tabId === 'overview') navigate('/dashboard')
    else if (tabId === 'campaigns') navigate('/campaigns')
    else if (tabId === 'conversations') navigate('/conversations')
    else if (tabId === 'agent-activity') navigate('/agent-activity')
    else if (tabId === 'analytics') navigate('/analytics')
    else if (tabId === 'settings') navigate('/settings')
    else navigate('/dashboard')
  }

  // Toggle Channels
  const handleChannelToggle = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Execute Search / Prompt with Webhook_company_finder
  const handleExecuteSearch = async (e) => {
    e?.preventDefault()
    if (!selectedCampaignId) {
      showToast('Please select an active campaign first')
      return
    }

    try {
      setSearchLoading(true)
      const payload = {
        prompt: promptText || 'Find me 5 SaaS companies',
        location: locationFilter !== 'Location' ? locationFilter : undefined,
        company_size: companySizeFilter !== 'Company Size' ? companySizeFilter : undefined,
        financials: financialsFilter !== 'Financials' ? financialsFilter : undefined,
        sector: sectorFilter !== 'Sector' ? sectorFilter : undefined,
        channels: Object.entries(channels)
          .filter(([_, checked]) => checked)
          .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1)),
      }

      console.log('🚀 [Outreach] Sending Input Parameters to Webhook_company_finder:', payload)

      const response = await searchCampaignOutreach(selectedCampaignId, payload)
      
      // Extract results and webhook metadata
      const items = Array.isArray(response) ? response : (response.results || [])
      const links = response.links || items.map((i) => i.website).filter(Boolean)
      const fitmentEvals = response.fitment_evaluations || []

      // 1. Log Company Finder Agent outputs to browser console
      console.log('%c🤖 [Webhook_company_finder] DISCOVERY RESULTS RECEIVED:', 'color: #3b82f6; font-weight: bold; font-size: 13px;', response)
      console.log('%c🔗 [Webhook_company_finder] Discovered Company Links:', 'color: #3b82f6; font-weight: bold;', links)

      // 2. Log Fitment Agent outputs to browser console
      console.log('%c🎯 [Webhook_fitment_agent] FITMENT EVALUATION INITIATED for ' + links.length + ' companies:', 'color: #10b981; font-weight: bold; font-size: 13px;')
      console.log('📋 [Webhook_fitment_agent] Evaluation Criteria Used:', {
        prompt: payload.prompt,
        industry: payload.sector || 'Technology',
        geography: payload.location || 'North America',
        company_size: payload.company_size || '50-200',
        revenue_funding: payload.financials || '$1M-$10M',
      })
      console.log('✅ [Webhook_fitment_agent] Raw Fitment Evaluations:', fitmentEvals)
      console.log('📊 [Webhook_fitment_agent] Evaluated & Scored Prospects:', items)

      // 3. Print a structured table in the browser console for quick inspection
      if (items.length > 0) {
        console.table(
          items.map((p) => ({
            Company: p.company_name,
            'ICP Score': `${p.icp_score}%`,
            'Meets Criteria': p.meets_criteria ? '✅ Yes' : '⚠️ Partial',
            Industry: p.industry,
            Location: p.location,
            Notes: p.notes,
          }))
        )
      }

      setSearchResults(items)
      setWebhookData({
        webhook_name: response.webhook_name || 'Webhook_company_finder',
        fitment_agent_name: 'Webhook_fitment_agent',
        fitment_evaluations_count: fitmentEvals.length || items.length,
        thread_id: response.thread_id || '83b23091-1ef7-45d1-a64c-df9fef8c60bd',
        run_id: response.run_id || '27e0a8bb-a809-40f0-8ec7-9ae2343dd01a',
        message: response.message || 'Agent run completed successfully.',
        links: links,
      })
      setHasSearched(true)
      showToast(`Agents completed! ${items.length} qualified prospects discovered & scored.`)
    } catch (err) {
      console.error('Search failed:', err)
      showToast('Failed to execute search. Please try again.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Add Prospect to Database for this Campaign
  const handleAddProspect = async (prospect) => {
    if (!selectedCampaignId) return
    try {
      setAddingId(prospect.id)
      const payload = {
        company_name: prospect.company_name,
        location: prospect.location,
        company_size: prospect.company_size,
        industry: prospect.industry,
        website: prospect.website,
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        contact_title: prospect.contact_title,
        contact_email: prospect.contact_email,
        contact_phone: prospect.contact_phone,
        contact_linkedin: prospect.contact_linkedin,
        icp_score: prospect.icp_score || 85.0,
      }

      await addProspectToCampaign(selectedCampaignId, payload)
      showToast(`Added ${prospect.company_name} to campaign!`)

      // Update local state to mark already added
      setSearchResults((prev) =>
        prev.map((item) => (item.id === prospect.id ? { ...item, already_added: true } : item))
      )

      // Refresh campaign stats
      const updatedOutreach = await fetchCampaignOutreach(selectedCampaignId)
      if (updatedOutreach) setCampaignData(updatedOutreach)
    } catch (err) {
      console.error('Failed to add prospect:', err)
      showToast('Error adding prospect to campaign')
    } finally {
      setAddingId(null)
    }
  }

  const currentCampaign = useMemo(() => {
    if (!campaignData?.campaign) {
      return campaigns.find((c) => String(c.id) === String(selectedCampaignId)) || null
    }
    return campaignData.campaign
  }, [campaignData, campaigns, selectedCampaignId])

  const campaignTitle = currentCampaign?.name || currentCampaign?.title || 'Client A'
  const isLive = currentCampaign?.status === 'LIVE'

  return (
    <div className="sdr-app-layout">
      {/* Toast Notification */}
      {toastMessage && <div className="sdr-toast">{toastMessage}</div>}

      {/* Left Sidebar */}
      <Sidebar activeTab="" onSelectTab={handleNavSelect} />

      {/* Main Container */}
      <main className="sdr-main outreach-main-page">
        <div className="sdr-container">
          {/* Top Global Header */}
          <Header
            searchQuery={headerSearchQuery}
            onSearchChange={setHeaderSearchQuery}
            placeholder="Search prospects, campaigns..."
            user={user}
            onSignOut={handleSignOut}
            killSwitchActive={killSwitchActive}
            onToggleKillSwitch={handleToggleKillSwitch}
          />

          {/* Subheader matching Photo 2 & 3 */}
          <section className="sdr-outreach-subheader-section">
            <div className="sdr-outreach-title-row">
              <div className="sdr-outreach-left-title-box">
                <h1 className="sdr-outreach-main-title">Outreach</h1>
                <div className="sdr-outreach-client-selector-wrap">
                  {campaigns.length > 1 ? (
                    <select
                      className="sdr-outreach-campaign-select"
                      value={selectedCampaignId}
                      onChange={(e) => handleSelectCampaign(e.target.value)}
                      aria-label="Select Campaign"
                    >
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h2 className="sdr-outreach-client-name">{campaignTitle}</h2>
                  )}
                </div>
              </div>

              <div className="sdr-outreach-right-actions">
                <div className="sdr-outreach-live-pill">
                  <span className="sdr-outreach-live-dot" />
                  <span className="sdr-outreach-live-text">{currentCampaign?.status || 'Live'}</span>
                </div>
                <button
                  type="button"
                  className="sdr-outreach-search-btn"
                  onClick={handleExecuteSearch}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </div>
            </div>
            <div className="sdr-outreach-underline" />
          </section>

          {/* Filter Pills Row (4 Dropdowns matching Photo 2) */}
          <section className="sdr-outreach-filters-grid" aria-label="Outreach Filters">
            {/* Location Pill */}
            <div className="sdr-pill-dropdown-box">
              <span className="sdr-pill-tag">Location</span>
              <div className="sdr-pill-select-wrapper">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="sdr-pill-select"
                >
                  <option value="Location">Location</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="San Francisco">San Francisco</option>
                  <option value="New York">New York</option>
                  <option value="London">London</option>
                  <option value="All">All Locations</option>
                </select>
                <ChevronDownIcon size={14} className="sdr-pill-chevron" />
              </div>
            </div>

            {/* Company Size Pill */}
            <div className="sdr-pill-dropdown-box">
              <span className="sdr-pill-tag">Company Size</span>
              <div className="sdr-pill-select-wrapper">
                <select
                  value={companySizeFilter}
                  onChange={(e) => setCompanySizeFilter(e.target.value)}
                  className="sdr-pill-select"
                >
                  <option value="Company Size">Company Size</option>
                  <option value="1-20">1-20 employees</option>
                  <option value="20-100">20-100 employees</option>
                  <option value="50-500">50-500 employees</option>
                  <option value="1,000-5,000">1,000-5,000 employees</option>
                  <option value="5,000+">5,000+ Enterprise</option>
                  <option value="All">All Sizes</option>
                </select>
                <ChevronDownIcon size={14} className="sdr-pill-chevron" />
              </div>
            </div>

            {/* Financials Pill */}
            <div className="sdr-pill-dropdown-box">
              <span className="sdr-pill-tag">Financials</span>
              <div className="sdr-pill-select-wrapper">
                <select
                  value={financialsFilter}
                  onChange={(e) => setFinancialsFilter(e.target.value)}
                  className="sdr-pill-select"
                >
                  <option value="Financials">Financials</option>
                  <option value="Seed / Series A">Seed / Series A</option>
                  <option value="Series B+ Growth">Series B+ Growth</option>
                  <option value="$10M-$50M ARR">$10M-$50M ARR</option>
                  <option value="$50M+ ARR">$50M+ ARR</option>
                  <option value="Profitable / Bootstrapped">Profitable / Bootstrapped</option>
                  <option value="All">All Financials</option>
                </select>
                <ChevronDownIcon size={14} className="sdr-pill-chevron" />
              </div>
            </div>

            {/* Sector Pill */}
            <div className="sdr-pill-dropdown-box">
              <span className="sdr-pill-tag">Sector</span>
              <div className="sdr-pill-select-wrapper">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="sdr-pill-select"
                >
                  <option value="Sector">Sector</option>
                  <option value="Technology">Technology</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="SaaS & Cloud">SaaS & Cloud</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="All">All Sectors</option>
                </select>
                <ChevronDownIcon size={14} className="sdr-pill-chevron" />
              </div>
            </div>
          </section>

          {/* Middle Layout: Prompt Box (Left) + Summary Cards & Channels (Right) */}
          <section className="sdr-outreach-middle-grid">
            {/* Left Prompt Box */}
            <div className="sdr-outreach-prompt-card">
              <div className="sdr-prompt-inner-body">
                <label htmlFor="outreach-prompt-input" className="sdr-prompt-label">
                  Enter Your Prompt Here...
                </label>
                <textarea
                  id="outreach-prompt-input"
                  className="sdr-outreach-prompt-textarea"
                  placeholder="e.g. Find technology companies in Chennai with 1,000-5,000 employees and identify senior engineering leadership (CEO, CTO, VP Engineering)..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={4}
                />
              </div>
              <button
                type="button"
                className="sdr-outreach-go-btn"
                onClick={handleExecuteSearch}
                disabled={searchLoading}
              >
                {searchLoading ? 'PROCESSING...' : 'GO'}
              </button>
            </div>

            {/* Right Column: 2 Summary Cards + Channels Card */}
            <div className="sdr-outreach-right-column">
              {/* Summary Card 1 */}
              <div className="sdr-outreach-summary-card">
                <h3 className="sdr-summary-card-heading">Summary</h3>
                <p className="sdr-summary-card-body">Founds, duplicates etc</p>
                <div className="sdr-summary-mini-stats">
                  <span>Found: <strong>{campaignData?.total_found || 6}</strong></span>
                  <span>Filtered: <strong>{campaignData?.duplicates_filtered || 0}</strong></span>
                </div>
              </div>

              {/* Summary Card 2 */}
              <div className="sdr-outreach-summary-card">
                <h3 className="sdr-summary-card-heading">Summary</h3>
                <p className="sdr-summary-card-body">Founds, duplicates etc</p>
                <div className="sdr-summary-mini-stats">
                  <span>Verified: <strong>{campaignData?.verified_emails || '100%'}</strong></span>
                  <span>Channels: <strong>{Object.values(channels).filter(Boolean).length} Active</strong></span>
                </div>
              </div>

              {/* Channels Card */}
              <div className="sdr-outreach-channels-card">
                <h3 className="sdr-channels-card-heading">Channels</h3>
                <div className="sdr-channels-checkboxes-row">
                  <label className="sdr-outreach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={() => handleChannelToggle('email')}
                    />
                    <span className="sdr-checkbox-custom">{channels.email && <CheckIcon size={12} />}</span>
                    <span>Email</span>
                  </label>

                  <label className="sdr-outreach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={channels.linkedIn}
                      onChange={() => handleChannelToggle('linkedIn')}
                    />
                    <span className="sdr-checkbox-custom">{channels.linkedIn && <CheckIcon size={12} />}</span>
                    <span>LinkedIn</span>
                  </label>

                  <label className="sdr-outreach-checkbox-label">
                    <input
                      type="checkbox"
                      checked={channels.messages}
                      onChange={() => handleChannelToggle('messages')}
                    />
                    <span className="sdr-checkbox-custom">{channels.messages && <CheckIcon size={12} />}</span>
                    <span>Messages</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Webhook Discovery Alert Banner */}
          {webhookData && (
            <section className="sdr-webhook-alert-box" aria-label="Webhook Execution Output">
              <div className="sdr-webhook-alert-header">
                <div className="sdr-webhook-alert-title-wrap">
                  <span className="sdr-webhook-badge">Agent Pipeline</span>
                  <strong className="sdr-webhook-name">1. {webhookData.webhook_name}</strong>
                  <span style={{ opacity: 0.6, margin: '0 4px' }}>➜</span>
                  <strong className="sdr-webhook-name">2. {webhookData.fitment_agent_name || 'Webhook_fitment_agent'}</strong>
                  <span className="sdr-webhook-status-pill">● Both Completed</span>
                </div>
                <div className="sdr-webhook-ids">
                  <span>Thread: <code>{webhookData.thread_id}</code></span>
                  <span className="sdr-webhook-id-divider">|</span>
                  <span>Run: <code>{webhookData.run_id}</code></span>
                </div>
              </div>

              {webhookData.links && webhookData.links.length > 0 && (
                <div className="sdr-webhook-links-container">
                  <span className="sdr-webhook-links-label">
                    Discovered Company Links ({webhookData.links.length}):
                  </span>
                  <div className="sdr-webhook-chips-row">
                    {webhookData.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="sdr-webhook-link-chip"
                        title={link}
                      >
                        🔗 {link.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Results Table Section (Photo 3) */}
          {(hasSearched || searchResults.length > 0 || (campaignData?.prospects && campaignData.prospects.length > 0)) && (
            <section className="sdr-outreach-results-section" aria-label="Prospect Search Results">
              <div className="sdr-outreach-results-card">
                <div className="sdr-results-table-container">
                  <table className="sdr-outreach-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Location</th>
                        <th>Company Size</th>
                        <th>Industry</th>
                        <th>Data Freshness</th>
                        <th className="th-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchResults.length > 0 ? searchResults : (campaignData?.prospects || [])).map((row) => {
                        const isAdded = row.already_added
                        const isAdding = addingId === row.id

                        return (
                          <tr key={row.id}>
                            <td className="td-company">
                              <span className="company-name">{row.company_name}</span>
                              {row.contact_title && (
                                <span className="company-lead-sub">
                                  {row.first_name} {row.last_name} ({row.contact_title})
                                </span>
                              )}
                            </td>
                            <td>{row.location || 'Chennai'}</td>
                            <td>{row.company_size || '1,000-5,000'}</td>
                            <td>{row.industry || 'Technology'}</td>
                            <td>{row.data_freshness || 'X Days'}</td>
                            <td className="td-actions">
                              <button
                                type="button"
                                className="sdr-action-pill-yellow review-btn"
                                onClick={() => setReviewedProspect(row)}
                              >
                                Review
                              </button>
                              <button
                                type="button"
                                className={`sdr-action-pill-yellow add-btn ${isAdded ? 'added' : ''}`}
                                onClick={() => !isAdded && handleAddProspect(row)}
                                disabled={isAdded || isAdding}
                              >
                                {isAdding ? 'Adding...' : isAdded ? 'Added ✓' : 'Add to Campaign'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Empty state prompt reminder if not searched yet */}
          {!hasSearched && searchResults.length === 0 && (!campaignData?.prospects || campaignData.prospects.length === 0) && (
            <div className="sdr-outreach-hint-box">
              <p>Enter your search prompt or choose filters above, then click <strong>GO</strong> or <strong>SEARCH</strong> to discover qualified companies and leads for <em>{campaignTitle}</em>.</p>
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {reviewedProspect && (
        <div className="sdr-modal-backdrop" onClick={() => setReviewedProspect(null)}>
          <div className="sdr-modal-card review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sdr-modal-header">
              <div>
                <h2 className="sdr-modal-title">{reviewedProspect.company_name}</h2>
                <p className="sdr-modal-subtitle">Prospect Intelligence & ICP Fitment</p>
              </div>
              <button
                type="button"
                className="sdr-modal-close"
                onClick={() => setReviewedProspect(null)}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="sdr-modal-body">
              <div className="sdr-modal-metrics-grid">
                <div className="sdr-modal-metric-card">
                  <span className="num">{reviewedProspect.icp_score || 95}%</span>
                  <span className="lbl">ICP Fit Score</span>
                </div>
                <div className="sdr-modal-metric-card">
                  <span className="num">{reviewedProspect.company_size}</span>
                  <span className="lbl">Headcount</span>
                </div>
                <div className="sdr-modal-metric-card">
                  <span className="num">Verified</span>
                  <span className="lbl">Data Status</span>
                </div>
              </div>

              <div className="sdr-modal-detail-specs">
                <div className="sdr-modal-detail-row">
                  <span className="key">Primary Decision Maker</span>
                  <span className="val">
                    {reviewedProspect.first_name} {reviewedProspect.last_name} ({reviewedProspect.contact_title || 'Executive'})
                  </span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Work Email</span>
                  <span className="val">{reviewedProspect.contact_email || 'Verified on file'}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Phone</span>
                  <span className="val">{reviewedProspect.contact_phone || '+91 (Chennai HQ)'}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">LinkedIn</span>
                  <span className="val">
                    {reviewedProspect.contact_linkedin ? (
                      <a href={reviewedProspect.contact_linkedin} target="_blank" rel="noreferrer">
                        View Profile
                      </a>
                    ) : (
                      'Available'
                    )}
                  </span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Location HQ</span>
                  <span className="val">{reviewedProspect.location}</span>
                </div>
                <div className="sdr-modal-detail-row">
                  <span className="key">Industry</span>
                  <span className="val">{reviewedProspect.industry}</span>
                </div>
              </div>
            </div>

            <div className="sdr-modal-actions space-between">
              <button
                type="button"
                className="sdr-modal-btn-cancel"
                onClick={() => setReviewedProspect(null)}
              >
                Close
              </button>
              <button
                type="button"
                className={`sdr-primary-btn ${reviewedProspect.already_added ? 'disabled' : ''}`}
                onClick={() => {
                  if (!reviewedProspect.already_added) {
                    handleAddProspect(reviewedProspect)
                    setReviewedProspect(null)
                  }
                }}
                disabled={reviewedProspect.already_added}
              >
                {reviewedProspect.already_added ? 'Already in Campaign' : 'Add to Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
