import React from 'react'
import {
  GridIcon,
  BarChartIcon,
  OutreachIcon,
  ChatBubbleIcon,
  AgentIcon,
  AnalyticsIcon,
  SettingsIcon,
} from './Icons.jsx'

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: GridIcon },
  { id: 'campaigns', label: 'Campaigns', icon: BarChartIcon },
  { id: 'conversations', label: 'Conversations &\nEscalations', icon: ChatBubbleIcon },
  { id: 'agent-activity', label: 'Agent Activity', icon: AgentIcon },
  { id: 'analytics', label: 'Analytics &\nRepresentatives', icon: AnalyticsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ activeTab = 'overview', onSelectTab }) {
  return (
    <aside className="sdr-sidebar" aria-label="Main Navigation">
      <div className="sdr-brand">
        <span className="sdr-brand-title">Autonomous SDR</span>
      </div>

      <nav className="sdr-nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`sdr-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab(item.id)}
            >
              <span className="sdr-nav-icon">
                <Icon size={19} />
              </span>
              <span className="sdr-nav-label">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
