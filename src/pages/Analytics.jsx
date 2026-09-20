import React, { useEffect, useState, useMemo, useRef } from 'react'
import { navigate } from '../App.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Header from '../components/Header.jsx'
import {
  MenuIcon,
  UsersIcon,
  CalendarIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  BarChartIcon,
  AnalyticsIcon,
  CheckIcon,
  SearchIcon,
  TargetIcon,
} from '../components/Icons.jsx'
import {
  fetchCurrentUser,
  fetchAnalyticsOverview,
  fetchActiveCampaigns,
  signOutUser,
  DEFAULT_ANALYTICS_OVERVIEW,
} from '../api.js'
import '../dashboard.css'

export default function Analytics() {
  const [user, setUser] = useState({ name: 'Alex Joe', role: 'Manager' })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState(DEFAULT_ANALYTICS_OVERVIEW)
  const [campaignList, setCampaignList] = useState([])

  // Filter States
  const [selectedCampaign, setSelectedCampaign] = useState('ALL')
  const [selectedDateRange, setSelectedDateRange] = useState('30 Oct, 2025 – 05 Sep, 2025')
  const [trendRangePreset, setTrendRangePreset] = useState('Apr 21, 2025 – Apr 27, 2025')
  const [activeMetricTab, setActiveMetricTab] = useState('all') // 'all', 'prospects', 'qualified', 'meetings'

  // Dropdown States
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const [trendDateDropdownOpen, setTrendDateDropdownOpen] = useState(false)
  const [repSearchQuery, setRepSearchQuery] = useState('')

  // Chart Tooltip Hover State
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState(null)
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null)

  const dateDropdownRef = useRef(null)
  const campaignDropdownRef = useRef(null)
  const trendDateDropdownRef = useRef(null)

  // Load Data on Mount
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [userData, overviewData, campaigns] = await Promise.all([
          fetchCurrentUser(),
          fetchAnalyticsOverview(),
          fetchActiveCampaigns(),
        ])

        if (isMounted) {
          if (userData) setUser(userData)
          if (overviewData) setAnalyticsData(overviewData)
          if (Array.isArray(campaigns)) setCampaignList(campaigns)
        }
      } catch (err) {
        console.error('Failed to load analytics data:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        setDateDropdownOpen(false)
      }
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setCampaignDropdownOpen(false)
      }
      if (trendDateDropdownRef.current && !trendDateDropdownRef.current.contains(event.target)) {
        setTrendDateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle Sign Out
  const handleSignOut = async () => {
    await signOutUser()
    navigate('/login')
  }

  // Handle Tab Switch
  const handleSelectTab = (tabId) => {
    if (tabId === 'overview') navigate('/dashboard')
    else if (tabId === 'campaigns') navigate('/campaigns')
    else if (tabId === 'conversations') navigate('/conversations')
    else if (tabId === 'settings') navigate('/settings')
    else if (tabId === 'analytics') navigate('/analytics')
    else navigate('/dashboard')
  }

  // Reload data when campaign filter changes
  const handleCampaignFilterChange = async (campId) => {
    setSelectedCampaign(campId)
    setCampaignDropdownOpen(false)
    try {
      const data = await fetchAnalyticsOverview({ campaign_id: campId })
      if (data) setAnalyticsData(data)
    } catch (err) {
      console.warn('Failed to refetch filtered analytics:', err)
    }
  }

  const { stats, trend, comparison, channel_metrics, team_performance } = analyticsData

  // Filter Sales Team by Rep Search Query
  const filteredTeamMembers = useMemo(() => {
    const list = team_performance || []
    if (!repSearchQuery.trim()) return list
    const q = repSearchQuery.toLowerCase()
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.assigned_campaigns && m.assigned_campaigns.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
    )
  }, [team_performance, repSearchQuery])

  // Get dynamic selected campaign label
  const selectedCampaignLabel = useMemo(() => {
    if (selectedCampaign === 'ALL') return 'All Campaigns'
    const found = campaignList.find((c) => String(c.id) === String(selectedCampaign))
    return found ? found.name : 'Selected Campaign'
  }, [selectedCampaign, campaignList])

  // Chart Dimensions & Calculations for Main Trend Line Chart
  const trendDates = trend?.dates || ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27']
  const trendSeries = trend?.series || []

  // SVG dimensions for Line Chart
  const svgWidth = 800
  const svgHeight = 260
  const paddingLeft = 50
  const paddingRight = 30
  const paddingTop = 25
  const paddingBottom = 40
  const plotWidth = svgWidth - paddingLeft - paddingRight
  const plotHeight = svgHeight - paddingTop - paddingBottom
  const maxY = 100

  // Calculate coordinates for SVG paths
  const calculateCoordinates = (dataPoints) => {
    if (!dataPoints || dataPoints.length === 0) return []
    const stepX = plotWidth / (trendDates.length - 1 || 1)
    return dataPoints.map((val, idx) => {
      const x = paddingLeft + idx * stepX
      const y = paddingTop + plotHeight - (Math.min(val, maxY) / maxY) * plotHeight
      return { x, y, val }
    })
  }

  // Generate smooth SVG curve path string
  const generateSmoothPath = (points) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
    return points.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`
      const prev = arr[i - 1]
      const cpX = (prev.x + pt.x) / 2
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`
    }, '')
  }

  // Comparison Bar Chart Calculations
  const comparisonItems = comparison || []
  const maxComparisonVal = Math.max(
    140,
    ...comparisonItems.map((c) => Math.max(c.prospects || 0, c.qualified || 0, c.meetings || 0))
  )

  const datePresets = [
    '30 Oct, 2025 – 05 Sep, 2025',
    'Last 7 Days',
    'Last 30 Days',
    'Last 90 Days',
    'This Month',
    'All Time',
  ]

  const trendPresets = [
    'Apr 21, 2025 – Apr 27, 2025',
    'Last 7 Days',
    'Last 14 Days',
    'Last 30 Days',
  ]

  return (
    <div className="sdr-app-layout">
      {/* Sidebar Navigation */}
      <Sidebar activeTab="analytics" onSelectTab={handleSelectTab} />

      {/* Main Content Area */}
      <main className="sdr-main">
        {/* Global Top Search & User Monogram Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          user={user}
          onSignOut={handleSignOut}
          placeholder="Search for people, campaigns etc."
        />

        <div className="sdr-container sdr-analytics-container">
          {/* Analytics Header Section */}
          <div className="sdr-analytics-header-row">
            <div className="sdr-analytics-title-group">
              <h1 className="sdr-analytics-page-title">Analytics</h1>
              <p className="sdr-analytics-page-subtitle">
                Track performances, measure impact and optimize your autonomous SDR campaigns
              </p>
            </div>

            {/* Top Right Filters (Date Range & Campaign Dropdown) */}
            <div className="sdr-analytics-filter-controls">
              {/* Date Range Dropdown */}
              <div className="sdr-dropdown-wrapper" ref={dateDropdownRef}>
                <button
                  type="button"
                  className="sdr-analytics-filter-btn"
                  onClick={() => setDateDropdownOpen((prev) => !prev)}
                  aria-label="Select Date Range"
                >
                  <CalendarIcon size={15} />
                  <span>{selectedDateRange}</span>
                  <ChevronDownIcon size={14} className={dateDropdownOpen ? 'rotated' : ''} />
                </button>

                {dateDropdownOpen && (
                  <div className="sdr-filter-popover" role="menu">
                    <div className="sdr-filter-popover-header">Select Date Range</div>
                    {datePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`sdr-filter-popover-item ${selectedDateRange === preset ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedDateRange(preset)
                          setDateDropdownOpen(false)
                        }}
                      >
                        <span>{preset}</span>
                        {selectedDateRange === preset && <CheckIcon size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign Selector Dropdown */}
              <div className="sdr-dropdown-wrapper" ref={campaignDropdownRef}>
                <button
                  type="button"
                  className="sdr-analytics-filter-btn"
                  onClick={() => setCampaignDropdownOpen((prev) => !prev)}
                  aria-label="Select Campaign"
                >
                  <span>{selectedCampaignLabel}</span>
                  <ChevronDownIcon size={14} className={campaignDropdownOpen ? 'rotated' : ''} />
                </button>

                {campaignDropdownOpen && (
                  <div className="sdr-filter-popover" role="menu">
                    <div className="sdr-filter-popover-header">Filter by Campaign</div>
                    <button
                      type="button"
                      className={`sdr-filter-popover-item ${selectedCampaign === 'ALL' ? 'active' : ''}`}
                      onClick={() => handleCampaignFilterChange('ALL')}
                    >
                      <span>All Campaigns</span>
                      {selectedCampaign === 'ALL' && <CheckIcon size={14} />}
                    </button>
                    {campaignList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`sdr-filter-popover-item ${String(selectedCampaign) === String(c.id) ? 'active' : ''}`}
                        onClick={() => handleCampaignFilterChange(c.id)}
                      >
                        <span className="truncate">{c.name}</span>
                        {String(selectedCampaign) === String(c.id) && <CheckIcon size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ────────────────── 4 KEY METRICS STAT CARDS ────────────────── */}
          <section className="sdr-stats-row sdr-analytics-stats-row" aria-label="Key Performance Metrics">
            {/* Total Campaigns */}
            <div className="sdr-stat-card sdr-analytics-stat-card">
              <div className="sdr-stat-header">
                <span className="sdr-stat-icon sdr-icon-campaigns">
                  <MenuIcon size={17} />
                </span>
                <span className="sdr-stat-label">Total Campaigns</span>
              </div>
              <div className="sdr-stat-value">{stats?.totalCampaigns?.value ?? 0}</div>
              <div className="sdr-stat-subtext">
                <span className="sdr-badge-text">
                  {stats?.totalCampaigns?.live ?? 0} Live&nbsp;&nbsp;{stats?.totalCampaigns?.paused ?? 0} Paused
                </span>
              </div>
            </div>

            {/* Total Prospects */}
            <div className="sdr-stat-card sdr-analytics-stat-card">
              <div className="sdr-stat-header">
                <span className="sdr-stat-icon sdr-icon-prospects">
                  <UsersIcon size={17} />
                </span>
                <span className="sdr-stat-label">Total Prospects</span>
              </div>
              <div className="sdr-stat-value">{stats?.totalProspects?.value ?? 0}</div>
              <div className="sdr-stat-subtext">
                <span className="sdr-badge-text">{stats?.totalProspects?.live ?? 0} Live</span>
              </div>
            </div>

            {/* Meetings Booked */}
            <div className="sdr-stat-card sdr-analytics-stat-card">
              <div className="sdr-stat-header">
                <span className="sdr-stat-icon sdr-icon-meetings">
                  <CalendarIcon size={17} />
                </span>
                <span className="sdr-stat-label">Meetings Booked</span>
              </div>
              <div className="sdr-stat-value">{stats?.meetingsBooked?.value ?? 0}</div>
              <div className="sdr-stat-subtext">
                <span className="sdr-badge-text">{stats?.meetingsBooked?.live ?? 0} Live</span>
              </div>
            </div>

            {/* Total Escalations */}
            <div className="sdr-stat-card sdr-analytics-stat-card">
              <div className="sdr-stat-header">
                <span className="sdr-stat-icon sdr-icon-escalations">
                  <AlertTriangleIcon size={17} />
                </span>
                <span className="sdr-stat-label">Total Escalations</span>
              </div>
              <div className="sdr-stat-value">{stats?.totalEscalations?.value ?? 0}</div>
              <div className="sdr-stat-subtext">
                <span className="sdr-badge-text sdr-badge-attention">
                  {stats?.totalEscalations?.status || 'All resolved'}
                </span>
              </div>
            </div>
          </section>

          {/* ────────────────── MAIN TREND CHART ────────────────── */}
          <div className="sdr-analytics-card sdr-trend-chart-card">
            <div className="sdr-trend-card-header">
              <div className="sdr-trend-title-group">
                <div className="sdr-trend-icon-badge">
                  <AnalyticsIcon size={20} />
                </div>
                <div>
                  <h2 className="sdr-trend-card-title">Campaign Performance Trend</h2>
                  <p className="sdr-trend-card-subtitle">Track key metrics across all campaigns over time.</p>
                </div>
              </div>

              {/* Date Filter on Trend Card */}
              <div className="sdr-dropdown-wrapper" ref={trendDateDropdownRef}>
                <button
                  type="button"
                  className="sdr-trend-date-selector-btn"
                  onClick={() => setTrendDateDropdownOpen((prev) => !prev)}
                >
                  <CalendarIcon size={13} />
                  <span>{trendRangePreset}</span>
                  <ChevronDownIcon size={13} />
                </button>

                {trendDateDropdownOpen && (
                  <div className="sdr-filter-popover right-aligned" role="menu">
                    {trendPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`sdr-filter-popover-item ${trendRangePreset === preset ? 'active' : ''}`}
                        onClick={() => {
                          setTrendRangePreset(preset)
                          setTrendDateDropdownOpen(false)
                        }}
                      >
                        <span>{preset}</span>
                        {trendRangePreset === preset && <CheckIcon size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Legend Indicator Dots */}
            <div className="sdr-trend-legend-row">
              {trendSeries.map((s, idx) => (
                <div key={s.name + idx} className="sdr-trend-legend-item">
                  <span className="sdr-legend-dot" style={{ backgroundColor: s.color }} />
                  <span className="sdr-legend-label">{s.name}</span>
                </div>
              ))}
            </div>

            {/* Interactive SVG Line Chart */}
            <div className="sdr-line-chart-wrapper">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="sdr-trend-svg-chart"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {[0, 20, 40, 60, 80, 100].map((val) => {
                  const y = paddingTop + plotHeight - (val / maxY) * plotHeight
                  return (
                    <g key={val} className="sdr-grid-group">
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="#f0ecec"
                        strokeWidth="1"
                        strokeDasharray={val === 0 ? 'none' : '4 4'}
                      />
                      <text
                        x={paddingLeft - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="sdr-axis-text"
                      >
                        {val}
                      </text>
                    </g>
                  )
                })}

                {/* X-Axis Date Labels */}
                {trendDates.map((date, idx) => {
                  const stepX = plotWidth / (trendDates.length - 1 || 1)
                  const x = paddingLeft + idx * stepX
                  const y = svgHeight - 12
                  return (
                    <text
                      key={date + idx}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      className="sdr-axis-text x-axis"
                    >
                      {date}
                    </text>
                  )
                })}

                {/* Data Lines and Interactive Hover Points */}
                {trendSeries.map((series, sIdx) => {
                  const coords = calculateCoordinates(series.data)
                  const pathD = generateSmoothPath(coords)

                  return (
                    <g key={series.name + sIdx} className="sdr-series-group">
                      {/* Main Smooth Curve Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={series.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="sdr-trend-line-path"
                      />

                      {/* Interactive Data Point Dots */}
                      {coords.map((pt, pIdx) => {
                        const isHovered =
                          hoveredTrendPoint?.seriesIdx === sIdx && hoveredTrendPoint?.pointIdx === pIdx

                        return (
                          <g key={pIdx} className="sdr-point-dot-group">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 6 : 3.5}
                              fill="#ffffff"
                              stroke={series.color}
                              strokeWidth={isHovered ? 3 : 2}
                              className="sdr-trend-point-dot"
                              onMouseEnter={() =>
                                setHoveredTrendPoint({
                                  seriesIdx: sIdx,
                                  pointIdx: pIdx,
                                  name: series.name,
                                  val: pt.val,
                                  date: trendDates[pIdx],
                                  color: series.color,
                                  x: pt.x,
                                  y: pt.y,
                                })
                              }
                              onMouseLeave={() => setHoveredTrendPoint(null)}
                            />
                          </g>
                        )
                      })}
                    </g>
                  )
                })}

                {/* Active Tooltip overlay on hover */}
                {hoveredTrendPoint && (
                  <g className="sdr-chart-tooltip-group">
                    <rect
                      x={Math.min(hoveredTrendPoint.x - 60, svgWidth - 130)}
                      y={Math.max(hoveredTrendPoint.y - 48, 10)}
                      width="120"
                      height="38"
                      rx="6"
                      fill="#1f1d1e"
                      className="sdr-chart-tooltip-bg"
                    />
                    <text
                      x={Math.min(hoveredTrendPoint.x, svgWidth - 70)}
                      y={Math.max(hoveredTrendPoint.y - 32, 26)}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {hoveredTrendPoint.name}: {hoveredTrendPoint.val}
                    </text>
                    <text
                      x={Math.min(hoveredTrendPoint.x, svgWidth - 70)}
                      y={Math.max(hoveredTrendPoint.y - 17, 41)}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="10"
                    >
                      {hoveredTrendPoint.date}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* ────────────────── TWO COMPARISON CHARTS ROW ────────────────── */}
          <div className="sdr-analytics-two-col-grid">
            {/* Left Chart Card: Campaign Performance Comparison */}
            <div className="sdr-analytics-card sdr-bar-chart-card">
              <div className="sdr-bar-card-header">
                <h3 className="sdr-bar-card-title">Campaign Performance Comparison</h3>
                {/* Legend */}
                <div className="sdr-bar-chart-legend">
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box prospects" />
                    <span>Prospects</span>
                  </div>
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box qualified" />
                    <span>Qualified</span>
                  </div>
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box meetings" />
                    <span>Meetings</span>
                  </div>
                </div>
              </div>

              {/* Grouped Bar Chart Display */}
              <div className="sdr-bar-chart-content">
                <div className="sdr-bar-y-axis-label">Number of Prospects</div>

                <div className="sdr-bar-groups-container">
                  {comparisonItems.map((item, idx) => {
                    const prospectsHeight = Math.max(8, (item.prospects / maxComparisonVal) * 160)
                    const qualifiedHeight = Math.max(6, (item.qualified / maxComparisonVal) * 160)
                    const meetingsHeight = Math.max(4, (item.meetings / maxComparisonVal) * 160)

                    return (
                      <div key={item.name + idx} className="sdr-bar-campaign-cluster">
                        <div className="sdr-bars-group">
                          {/* Prospects Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.prospects}</span>
                            <div
                              className="sdr-bar-pillar prospects"
                              style={{ height: `${prospectsHeight}px` }}
                              title={`Prospects: ${item.prospects}`}
                            />
                          </div>

                          {/* Qualified Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.qualified}</span>
                            <div
                              className="sdr-bar-pillar qualified"
                              style={{ height: `${qualifiedHeight}px` }}
                              title={`Qualified: ${item.qualified}`}
                            />
                          </div>

                          {/* Meetings Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.meetings}</span>
                            <div
                              className="sdr-bar-pillar meetings"
                              style={{ height: `${meetingsHeight}px` }}
                              title={`Meetings: ${item.meetings}`}
                            />
                          </div>
                        </div>

                        {/* Campaign Name Under Group */}
                        <div className="sdr-bar-campaign-label">{item.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Chart Card: Campaign Performance Comparison (or Channel Breakdown) */}
            <div className="sdr-analytics-card sdr-bar-chart-card">
              <div className="sdr-bar-card-header">
                <h3 className="sdr-bar-card-title">Campaign Performance Comparison</h3>
                {/* Legend */}
                <div className="sdr-bar-chart-legend">
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box prospects" />
                    <span>Prospects</span>
                  </div>
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box qualified" />
                    <span>Qualified</span>
                  </div>
                  <div className="sdr-bar-legend-chip">
                    <span className="sdr-chip-box meetings" />
                    <span>Meetings</span>
                  </div>
                </div>
              </div>

              {/* Grouped Bar Chart Display */}
              <div className="sdr-bar-chart-content">
                <div className="sdr-bar-y-axis-label">Number of Prospects</div>

                <div className="sdr-bar-groups-container">
                  {comparisonItems.map((item, idx) => {
                    const prospectsHeight = Math.max(8, (item.prospects / maxComparisonVal) * 160)
                    const qualifiedHeight = Math.max(6, (item.qualified / maxComparisonVal) * 160)
                    const meetingsHeight = Math.max(4, (item.meetings / maxComparisonVal) * 160)

                    return (
                      <div key={'r-' + item.name + idx} className="sdr-bar-campaign-cluster">
                        <div className="sdr-bars-group">
                          {/* Prospects Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.prospects}</span>
                            <div
                              className="sdr-bar-pillar prospects"
                              style={{ height: `${prospectsHeight}px` }}
                              title={`Prospects: ${item.prospects}`}
                            />
                          </div>

                          {/* Qualified Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.qualified}</span>
                            <div
                              className="sdr-bar-pillar qualified"
                              style={{ height: `${qualifiedHeight}px` }}
                              title={`Qualified: ${item.qualified}`}
                            />
                          </div>

                          {/* Meetings Bar */}
                          <div className="sdr-single-bar-wrapper">
                            <span className="sdr-bar-top-value">{item.meetings}</span>
                            <div
                              className="sdr-bar-pillar meetings"
                              style={{ height: `${meetingsHeight}px` }}
                              title={`Meetings: ${item.meetings}`}
                            />
                          </div>
                        </div>

                        {/* Campaign Name Under Group */}
                        <div className="sdr-bar-campaign-label">{item.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────── SALES TEAM PERFORMANCE TABLE ────────────────── */}
          <div className="sdr-analytics-card sdr-team-performance-card">
            <div className="sdr-team-card-header">
              <h2 className="sdr-team-card-title">Sales Team Performance</h2>
              <div className="sdr-team-search-wrapper">
                <SearchIcon size={14} className="sdr-team-search-icon" />
                <input
                  type="text"
                  placeholder="Filter executives..."
                  value={repSearchQuery}
                  onChange={(e) => setRepSearchQuery(e.target.value)}
                  className="sdr-team-search-input"
                />
              </div>
            </div>

            <div className="sdr-team-table-wrapper">
              <table className="sdr-team-table">
                <thead>
                  <tr>
                    <th className="sdr-th-rep">Sales Executive</th>
                    <th className="sdr-th-campaign">Assigned Campaigns</th>
                    <th className="sdr-th-num">Assigned Prospects</th>
                    <th className="sdr-th-num">Contacted</th>
                    <th className="sdr-th-num">Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamMembers.map((member, index) => (
                    <tr key={member.id || index} className="sdr-team-table-row">
                      {/* Sales Executive Name */}
                      <td className="sdr-td-rep">
                        <span className="sdr-rep-name-bold">{member.name}</span>
                      </td>

                      {/* Assigned Campaign */}
                      <td className="sdr-td-campaign">
                        <span className="sdr-rep-campaign-text">
                          {member.assigned_campaigns || '-'}
                        </span>
                      </td>

                      {/* Assigned Prospects */}
                      <td className="sdr-td-num">
                        <span className="sdr-rep-metric-val">{member.assigned_prospects}</span>
                      </td>

                      {/* Contacted */}
                      <td className="sdr-td-num">
                        <span className="sdr-rep-metric-val">{member.contacted}</span>
                      </td>

                      {/* Responses */}
                      <td className="sdr-td-num">
                        <span className="sdr-rep-metric-val">{member.responses}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredTeamMembers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="sdr-team-empty-row">
                        No sales executives match the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
