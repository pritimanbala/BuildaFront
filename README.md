# Autonomous SDR — Frontend

> **Buildathon** | React + Vite SPA for the AI-powered Sales Development Representative platform

This is the frontend of the **Autonomous SDR** system — a manager-facing dashboard that lets teams create outreach campaigns, monitor AI-driven prospect conversations, handle escalations, and configure workspace settings. All data is persisted in a PostgreSQL database via the FastAPI backend (`BuildaBackend`).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set VITE_API_URL=http://localhost:8000

# 3. Make sure the backend is running
# (in BuildaBackend folder)
# py -3.12 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 4. Start the dev server
npm run dev
# → http://localhost:5173
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **React 18** (functional components, hooks) |
| Build Tool | **Vite** (HMR dev server, ESM bundling) |
| HTTP Client | **Axios** (interceptors, auth tokens, timeout) |
| Styling | **Vanilla CSS** (`sdr-` prefix namespace) |
| Fonts | **Google Fonts** — Inter, Playfair Display, Newsreader |
| Routing | **Custom** (`navigate()` + `popstate`, no React Router) |
| Icons | **Inline SVG** React components (no icon library) |

---

## Project Structure

```
Buildathon/
│
├── index.html               # App shell — Google Fonts, mounts React
├── vite.config.js           # Dev server + /api proxy to localhost:8000
├── package.json             # Dependencies: react, vite, axios
├── .env.example             # VITE_API_URL=http://localhost:8000
│
└── src/
    ├── main.jsx             # Entry point — renders <App /> into #root
    │
    ├── App.jsx              # Client-side router
    │                          Defines route map: path → Component
    │                          Exports: navigate(path), AppLink
    │
    ├── api.js               # All backend communication (455 lines)
    │                          Axios instance + interceptors
    │                          Auth helpers (localStorage token/user)
    │                          All exported API functions
    │
    ├── dashboard.css        # Global stylesheet (~1700+ lines)
    │                          Covers: layout, sidebar, header,
    │                          stat cards, campaign cards, modals,
    │                          badges, filters, empty states, toasts
    │
    ├── styles.css           # Auth page styles (Login, Signup)
    │
    ├── components/
    │   ├── Sidebar.jsx      # Left nav rail — 7 items, active state
    │   ├── Header.jsx       # Top bar — search, kill switch, user pill
    │   │                      Two variants: 'default' and 'settings'
    │   ├── Icons.jsx        # 25+ inline SVG icon components
    │   ├── AuthLayout.jsx   # Centred wrapper for auth forms
    │   ├── GoogleButton.jsx # Google OAuth button with logo SVG
    │   └── PasswordInput.jsx# Password field with show/hide toggle
    │
    └── pages/
        ├── Login.jsx        # /login  — email/password + Google OAuth
        ├── Signup.jsx       # /signup — role picker + registration form
        ├── Dashboard.jsx    # /dashboard — KPIs, active campaigns
        ├── Campaigns.jsx    # /campaigns — full campaign management ⭐
        ├── Analytics.jsx    # /analytics — trends, comparisons & sales team performance 📈
        ├── Conversations.jsx# /conversations — AI threads + escalations
        ├── Settings.jsx     # /settings — workspace configuration
        └── NotFound.jsx     # 404 fallback
```

---

## Pages Overview

| Route | Page | Key Feature |
|---|---|---|
| `/login` | **Login** | Email/password + Google OAuth sign-in |
| `/signup` | **Signup** | Role picker (Admin/Executive) → registration |
| `/dashboard` | **Dashboard** | 4 KPI stat cards + active campaign grid |
| `/campaigns` | **Campaigns** | Create, view, pause, delete campaigns — DB-backed ⭐ |
| `/analytics` | **Analytics** | Performance trends, comparison charts, sales team metrics 📈 |
| `/conversations` | **Conversations** | AI thread monitoring + escalation queue |
| `/settings` | **Settings** | Workspace, notifications, integrations, security |

> 📄 See **[PAGES.md](PAGES.md)** for a deep-dive into every page: UI layout diagrams, state variables, API calls, interaction handlers, and edge cases.

---

## API Layer Summary

All backend calls live in `src/api.js`. Pages never import `axios` directly — they call named exported functions.

### Auth
```js
signIn(email, password)         // POST /api/auth/signin
signUp({ email, password, name, role })  // POST /api/auth/signup
signOutUser()                   // POST /api/auth/signout
fetchCurrentUser()              // GET  /api/auth/me
```

### Campaigns (DB-backed, no mock data)
```js
fetchActiveCampaigns(params)    // GET    /api/campaigns
createCampaign(payload)         // POST   /api/campaigns
updateCampaignStatus(id, status)// PATCH  /api/campaigns/:id/status
updateCampaign(id, payload)     // PUT    /api/campaigns/:id
deleteCampaign(id)              // DELETE /api/campaigns/:id
fetchCampaignDetails(id)        // GET    /api/campaigns/:id
```

### Analytics
```js
fetchAnalyticsOverview(params)  // GET  /api/analytics/overview
fetchAnalyticsTeam()            // GET  /api/analytics/team
fetchAnalyticsTrend(params)     // GET  /api/analytics/trend
fetchAnalyticsComparison()      // GET  /api/analytics/comparison
```

### Dashboard & System
```js
fetchDashboardOverview()        // GET  /api/sdr/stats
fetchKillSwitch()               // GET  /api/system/kill-switch
toggleKillSwitch(enabled)       // POST /api/system/kill-switch
```

### Conversations & Settings
```js
fetchConversationSummary()      // GET  /api/conversations/summary
fetchRecentConversations()      // GET  /api/conversations/recent
fetchEscalations()              // GET  /api/conversations/escalations
takeoverConversation(id)        // POST /api/conversations/:id/takeover
resolveEscalation(id)           // POST /api/conversations/:id/resolve
fetchSettings()                 // GET  /api/settings
saveSettings(payload)           // PUT  /api/settings
```

---

## Routing

The app uses a **zero-dependency custom router** in `App.jsx`:

```js
const pages = {
  '/':              Login,
  '/login':         Login,
  '/signup':        Signup,
  '/dashboard':     Dashboard,
  '/campaigns':     Campaigns,
  '/conversations': Conversations,
  '/settings':      Settings,
}
```

Navigation happens via:
```js
navigate('/campaigns')  // pushes to history + fires popstate
```

`AppLink` is a wrapper `<a>` that calls `navigate()` instead of doing a full page reload.

---

## Styling System

All application styles use the `sdr-` prefix in `dashboard.css`. Auth pages use `styles.css` separately to avoid conflicts.

### Key CSS sections

```
Layout:         .sdr-app-layout  .sdr-sidebar  .sdr-main  .sdr-container
Sidebar:        .sdr-brand  .sdr-nav-list  .sdr-nav-item  (active state)
Header:         .sdr-header  .sdr-kill-switch-btn  .sdr-user-pill
Metric Cards:   .sdr-metrics-grid  .sdr-metric-card  .sdr-metric-value
Campaign Cards: .sdr-campaign-full-card  .sdr-card-specs  .sdr-card-metrics-row
Status Badges:  .sdr-badge.live  .sdr-badge.paused  .sdr-badge.draft
Summary Bar:    .sdr-campaign-summary-bar  .sdr-status-dot  .sdr-summary-pill
Filter Row:     .sdr-campaign-filter-row  .sdr-select-wrapper  .sdr-filter-select
Empty States:   .sdr-campaign-empty-card  .sdr-empty-icon-circle  .sdr-empty-title
Modals:         .sdr-modal-backdrop  .sdr-modal-card  .sdr-modal-form
Buttons:        .sdr-primary-btn  .sdr-btn-view-campaign  .sdr-btn-pause-resume
Toast:          .sdr-toast  (fixed bottom-centre, slide-up animation)
Spinner:        .sdr-spinner  (@keyframes spin)
Conversations:  .sdr-conv-stat-card  .sdr-conv-card  .sdr-thread-bubble
Settings:       .sdr-settings-layout  .sdr-subnav-btn  .sdr-burgundy-switch
```

---

## Campaigns Feature — How Data Flows

The Campaigns page is the primary DB-integrated feature. Here's the full flow:

```
/campaigns page mounts
        │
        ▼
Promise.all([
  fetchCurrentUser(),        → user name/role for header
  fetchKillSwitch(),         → kill switch state
  fetchActiveCampaigns(),    → real PostgreSQL data, never mocked
  fetchDashboardOverview(),  → aggregate stats
])
        │
        ▼
campaigns = []  ──────────────────────► "Add your first campaign"
                                         (dashed empty state card)
        │
campaigns = [...]
        │
        ▼
Apply 4 filters (useMemo):
  searchQuery + statusFilter + ownerFilter + channelFilter
        │
        ▼
filteredCampaigns = [] ───────────────► "No campaigns match filters"
                                         + "Clear all filters" button
        │
filteredCampaigns = [...]
        │
        ▼
Render 2-column grid of campaign cards
  [Title + badge] [ICP + size + channels + owner] [metrics] [actions]

User clicks "+ Create Campaign"
        │
        ▼
Modal opens → user fills form → submit
        │
        ▼
POST /api/campaigns → 201 Created
        │
        ▼
loadData() → grid refreshes with real DB data
```

---

## Key Design Decisions

### 1. No React Router
Avoids an additional dependency. The custom `navigate()` + `popstate` pattern handles all routing with ~10 lines of code.

### 2. No Dummy Data for Campaigns
`fetchActiveCampaigns()` always returns real database results. When the DB has no campaigns, it returns `[]` and the UI shows an empty state — **not placeholder cards**. This was a deliberate product decision.

### 3. Graceful Fallbacks for Everything Else
Conversations, settings, and stats all fall back to `DEFAULT_*` constants when the backend is unreachable, so the app remains usable in offline/demo mode.

### 4. Centralised API Module
A single `api.js` is the source of truth for all HTTP communication. Pages are completely decoupled from `axios`. This makes it easy to swap out the HTTP client or add auth logic in one place.

### 5. Single CSS Namespace
The `sdr-` prefix prevents any global CSS leaks or collisions. Auth styles in `styles.css` are isolated from the main app styles in `dashboard.css`.

### 6. Axios Interceptors for Auth
The request interceptor automatically attaches `Bearer <token>` to every request. The response interceptor auto-captures tokens from API responses and auto-clears auth on 401. Pages never deal with token management.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR on port 5173 |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Related

- **Backend**: [`BuildaBackend`](../BuildaBackend) — FastAPI + SQLAlchemy + PostgreSQL
- **Pages detail**: [`PAGES.md`](PAGES.md) — deep-dive into every page
