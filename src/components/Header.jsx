import React, { useState, useRef, useEffect } from 'react'
import { SearchIcon, UserIcon, ChevronDownIcon, SignOutIcon } from './Icons.jsx'

export default function Header({
  variant = 'default', // 'default' (dashboard) or 'settings'
  searchQuery = '',
  onSearchChange,
  placeholder = 'Search for people, campaigns etc.',
  user = { name: 'Alex Joe', role: 'Manager' },
  onSignOut,
  killSwitchActive = true,
  onToggleKillSwitch,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Compute initials for monogram avatar (e.g. "Alex Joe" -> "AJ")
  const initials = (user?.name || 'Alex Joe')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'AJ'

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className={`sdr-header ${variant === 'settings' ? 'settings-variant' : ''}`}>
      {variant === 'settings' ? (
        <div className="sdr-settings-search-bar">
          <span className="sdr-settings-search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="sdr-settings-search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      ) : (
        <div className="sdr-header-search-group">
          <button type="button" className="sdr-search-btn" aria-label="Search">
            <SearchIcon size={18} />
          </button>
          <div className="sdr-search-input-wrapper">
            <input
              type="text"
              className="sdr-search-input"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="sdr-header-profile-group" ref={dropdownRef}>
        {variant === 'settings' && (
          <button
            type="button"
            className={`sdr-kill-switch-btn ${killSwitchActive ? 'active' : 'paused'}`}
            onClick={onToggleKillSwitch}
            title="Click to toggle Global Kill Switch"
          >
            <span className="sdr-kill-dot" />
            <span>Global Kill Switch</span>
          </button>
        )}

        {variant === 'settings' ? (
          <div
            className="sdr-settings-user-block"
            onClick={() => setDropdownOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
          >
            <div className="sdr-settings-user-info">
              <span className="sdr-user-name">{user?.name || 'Alex Joe'}</span>
              <span className="sdr-user-role">{user?.role || 'Manager'}</span>
            </div>
            <div className="sdr-user-monogram">{initials}</div>
          </div>
        ) : (
          <>
            <button type="button" className="sdr-avatar-btn" aria-label="User Avatar">
              <UserIcon size={20} />
            </button>

            <div className="sdr-user-pill-container">
              <button
                type="button"
                className="sdr-user-pill"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
              >
                <div className="sdr-user-info">
                  <span className="sdr-user-name">{user?.name || 'Alex Joe'}</span>
                  <span className="sdr-user-role">{user?.role || 'Manager'}</span>
                </div>
                <span className={`sdr-user-chevron ${dropdownOpen ? 'rotated' : ''}`}>
                  <ChevronDownIcon size={16} />
                </span>
              </button>
            </div>
          </>
        )}

        {dropdownOpen && (
          <div className="sdr-user-dropdown" role="menu">
            <div className="sdr-dropdown-header">
              <span className="sdr-dropdown-name">{user?.name || 'Alex Joe'}</span>
              <span className="sdr-dropdown-email">{user?.email || 'alex.joe@example.com'}</span>
            </div>
            <div className="sdr-dropdown-divider" />
            <button
              type="button"
              className="sdr-dropdown-item signout"
              onClick={() => {
                setDropdownOpen(false)
                if (onSignOut) onSignOut()
              }}
            >
              <SignOutIcon size={16} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
