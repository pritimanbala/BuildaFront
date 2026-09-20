import React from 'react'
import {
  GridIcon,
  BarChartIcon,
  OutreachIcon,
  ChatBubbleIcon,
  AgentIcon,
  AnalyticsIcon,
  SettingsIcon,
  TargetIcon,
  AlertTriangleIcon,
  EmailIcon,
  UsersIcon
} from './Icons.jsx'

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: GridIcon },
  { id: 'campaigns', label: 'Campaigns', icon: BarChartIcon },
  { id: 'prospects', label: 'Prospects', icon: TargetIcon },
  { id: 'conversations', label: 'Conversations', icon: ChatBubbleIcon },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangleIcon },
  { id: 'agent-activity', label: 'Agent Activity', icon: AgentIcon },
  { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon },
  { id: 'prompts-policies', label: 'Prompts & Policies', icon: EmailIcon },
  { id: 'representatives', label: 'Representatives', icon: UsersIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ activeTab = 'overview', onSelectTab, userRole }) {
  return (
    <aside className="sdr-sidebar" aria-label="Main Navigation">
      <div className="sdr-brand">
        <span className="sdr-brand-title">Autonomous SDR</span>
      </div>

      <nav className="sdr-nav-list">
        {NAV_ITEMS.filter((item) => {
          if (userRole === 'EXECUTIVE' || userRole === 'EXE') {
            return item.id === 'conversations'
          }
          return true
        }).map((item) => {
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
