# Pages Reference — Autonomous SDR Frontend

This document covers every page in `src/pages/` in detail: what it renders, what data it loads, what state it manages, and how user interactions work.

---

## Table of Contents

1. [Login](#1-login--login)
2. [Signup](#2-signup--signup)
3. [Dashboard](#3-dashboard--dashboard)
4. [Campaigns](#4-campaigns--campaigns)
5. [Conversations](#5-conversations--conversations)
6. [Analytics & Representatives](#6-analytics--representatives--analytics)
7. [Settings](#7-settings--settings)
8. [NotFound](#8-notfound)

---

## 6. Analytics & Representatives — `/analytics`

**File:** [`src/pages/Analytics.jsx`](src/pages/Analytics.jsx)

### Purpose
Provides deep campaign performance measurement, multi-campaign trend analysis over time, grouped comparative bar metrics, and individual sales executive (representative) performance tracking.

### UI Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Analytics                                    [30 Oct, 2025 – 05 Sep, 2025 ▾]│
│ Track performances, measure impact...                  [All Campaigns ▾]    │
├──────────────┬──────────────┬──────────────┬────────────────────────────────┤
│TotalCampaigns│TotalProspects│MeetingsBooked│       Total Escalations        │
│      4       │     322      │      6       │               2                │
│2 Live 2 Pause│    2 Live    │    2 Live    │        Requires attention      │
├──────────────┴──────────────┴──────────────┴────────────────────────────────┤
│ 📈 Campaign Performance Trend                [Apr 21, 2025 – Apr 27, 2025 ▾]│
│    🔵 US SaaS CTO   🟣 India BFSI CIO   🟢 US Voice AI Founders            │
│    [Interactive Multi-Line SVG Chart with Gridlines & Tooltip Hover]        │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ Campaign Performance Comp.   │ Campaign Performance Comparison              │
│ [Prospects|Qualified|Meetings│ [Prospects|Qualified|Meetings                │
│  Grouped Bar Chart Cluster]  │  Grouped Bar Chart Cluster]                  │
├──────────────────────────────┴──────────────────────────────────────────────┤
│ Sales Team Performance                            [Filter executives... 🔍] │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Sales Executive │ Assigned Campaigns │ Assigned Prospects │ Contacted │ Resp│
│ Priya Sharma    │ US SaaS CTO        │        42          │    35     │  12 │
│ Riya Varma      │ India BFSI CIO     │        32          │    22     │  13 │
│ Pritam          │ US Voice AI        │        43          │    33     │  21 │
│ Tarun           │ US SaaS CTO        │        50          │    44     │  27 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State
| State variable | Type | Default | Purpose |
|---|---|---|---|
| `analyticsData` | object | `DEFAULT_ANALYTICS_OVERVIEW` | Full overview object containing stats, trend, comparison, team performance |
| `selectedCampaign` | string | `'ALL'` | Active campaign filter for analytics aggregation |
| `selectedDateRange` | string | `'30 Oct, 2025 – 05 Sep, 2025'` | Selected date preset for the analytics dashboard |
| `trendRangePreset` | string | `'Apr 21, 2025 – Apr 27, 2025'` | Selected date range for the line trend chart |
| `repSearchQuery` | string | `''` | Filter query for the Sales Team Performance table |
| `hoveredTrendPoint` | object \| null | `null` | Active hovered point on SVG line chart for rendering tooltip |

### API Endpoints
- `GET /api/analytics/overview` (supports `?campaign_id=...&range_type=...`)
- `GET /api/analytics/team`
- `GET /api/analytics/trend`
- `GET /api/analytics/comparison`
- `GET /api/campaigns`

---

## 7. Settings — `/settings`

**File:** [`src/pages/Settings.jsx`](src/pages/Settings.jsx)

### Purpose
Full platform settings page across 6 categorized tabs: General, Notifications, Workspace & Data, Integrations, Permissions & Approvals, and Security & Access.

---

## 8. NotFound

**File:** [`src/pages/NotFound.jsx`](src/pages/NotFound.jsx)

### Purpose
Fallback 404 page for unmatched routes.

---

## Common Patterns Across All Pages

### Pattern 1: Mounted guard for async data loading
Every page with `useEffect` uses an `isMounted` flag to prevent state updates on unmounted components:
```js
useEffect(() => {
  let isMounted = true
  async function loadData() {
    // ...
    if (isMounted) setState(data)
  }
  loadData()
  return () => { isMounted = false }
}, [])
```

### Pattern 2: Sidebar navigation handler
Every page has a `handleNavSelect(tabId)` function that maps sidebar tab IDs to `navigate()` calls — with a guard for the current page.

### Pattern 3: Dynamic DB fallbacks
All `fetchX()` calls are wrapped in `try/catch`. On failure they return default benchmark constants, ensuring uninterrupted UI rendering even during network hiccups.


---

## 1. Login — `/login`

**File:** [`src/pages/Login.jsx`](src/pages/Login.jsx)

### Purpose
The entry point of the application. Users sign in with email/password or Google OAuth.

### UI Layout
```
┌─────────────────────────────────┐
│  Sign in                        │
│  Please login to continue…      │
│                                 │
│  [Email input]                  │
│  [Password input + show/hide]   │
│  ☐ Keep me logged in            │
│  [Sign in button]               │
│  ─── or ───                     │
│  [Sign in with Google button]   │
│  Need an account? Create one    │
└─────────────────────────────────┘
```

### State
| State variable | Type | Default | Purpose |
|---|---|---|---|
| `email` | string | `''` | Controlled email input |
| `password` | string | `''` | Controlled password input |
| `emailError` | string | `''` | Inline email validation message |
| `formError` | string | `''` | API error message shown below form |
| `loading` | boolean | `false` | Disables button and shows "Signing in…" |

### How it works
1. On submit, validates email format with regex — shows inline error if invalid
2. Calls `signIn(email, password)` → `POST /api/auth/signin`
3. On success: JWT is auto-saved to `localStorage` via Axios interceptor → navigates to `/dashboard`
4. On failure: shows API error message in a red alert paragraph
5. "Sign in with Google" → `window.location.assign(API_URL + '/api/auth/google')` — full redirect to backend OAuth flow

### Key components used
- `AuthLayout` — centred wrapper
- `PasswordInput` — password field with show/hide toggle
- `GoogleButton` — styled Google OAuth button

---

## 2. Signup — `/signup`

**File:** [`src/pages/Signup.jsx`](src/pages/Signup.jsx)

### Purpose
Two-step account registration. Step 1: choose a role. Step 2: fill in credentials.

### UI — Step 1: Role Selection
```
┌─────────────────────────────────┐
│  Register as                    │
│  Choose the account type…       │
│                                 │
│  [Administrator]                │
│  [Executive]                    │
│  Already have an account? …     │
└─────────────────────────────────┘
```

### UI — Step 2: Registration Form (after role selected)
```
┌─────────────────────────────────┐
│  Register as Admin / Executive  │
│                                 │
│  [Full name input]              │
│  [Email input]                  │
│  [Password input + show/hide]   │
│  [Register as Admin button]     │
│  ─── or ───                     │
│  [Continue with Google button]  │
│  [← Choose a different role]    │
│  Already have an account? …     │
└─────────────────────────────────┘
```

### State
| State variable | Type | Default | Purpose |
|---|---|---|---|
| `role` | `null \| 'ADMIN' \| 'EXE'` | `null` | Controls which step renders |
| `name` | string | `''` | Full name field |
| `email` | string | `''` | Email field |
| `password` | string | `''` | Password field |
| `formError` | string | `''` | API error display |
| `loading` | boolean | `false` | Loading state |

### How it works
1. If `role === null` → renders the role picker (step 1)
2. After role selection → renders the full form (step 2)
3. On submit: calls `signUp({ name, email, password, role })` → `POST /api/auth/signup`
4. On success: navigates to `/dashboard`
5. "Continue with Google" appends `?role=ADMIN/EXE` to the OAuth redirect so the backend knows which role to assign

---

## 3. Dashboard — `/dashboard`

**File:** [`src/pages/Dashboard.jsx`](src/pages/Dashboard.jsx)

### Purpose
The main command center. Shows KPI stats, active campaigns, and provides navigation to all other sections.

### UI Layout
```
┌──────────┬──────────────────────────────────────────────┐
│          │  [Search bar]         [User pill ▼]          │
│          ├──────────────────────────────────────────────┤
│ Sidebar  │  Good Morning, Alex!       [Kill Switch 🔴]  │
│          ├──────────────────────────────────────────────┤
│          │  [Total Campaigns] [Prospects] [Meetings]     │
│          │  [Escalations]                               │
│          ├──────────────────────────────────────────────┤
│          │  Active Campaigns          View all →        │
│          │  ┌────────────────┐ ┌────────────────┐       │
│          │  │ Campaign Card  │ │ Campaign Card  │       │
│          │  └────────────────┘ └────────────────┘       │
└──────────┴──────────────────────────────────────────────┘
```

### Data Loading
On mount, runs a `Promise.all` to load three things simultaneously:
```js
const [userData, statsData, campaignList] = await Promise.all([
  fetchCurrentUser(),       // GET /api/auth/me
  fetchDashboardOverview(), // GET /api/sdr/stats
  fetchActiveCampaigns(),   // GET /api/campaigns
])
```

### State
| State variable | Type | Default | Purpose |
|---|---|---|---|
| `user` | object | `{ name: 'Alex Joe', role: 'Manager' }` | Logged-in user info |
| `activeTab` | string | `'overview'` | Internal tab (not used visibly, future-ready) |
| `searchQuery` | string | `''` | Filters campaign cards in real-time |
| `killSwitchActive` | boolean | `true` | Current kill switch state |
| `stats` | object | `DEFAULT_STATS` | Dashboard metric cards data |
| `campaigns` | array | `[]` | List of campaigns from DB |
| `loading` | boolean | `true` | Shows loading state during data fetch |

### Sections in detail

#### Greeting Row
- "Good Morning, {firstName}!" — first name extracted from `user.name`
- **Global Kill Switch** pill with a toggle checkbox
  - Calls `toggleKillSwitch(newState)` → `POST /api/system/kill-switch`
  - State updates optimistically (UI changes immediately, then backend syncs)

#### Key Metrics Grid (4 cards)
Each card shows value + sub-label pulled from `stats`:
1. **Total Campaigns** → `stats.totalCampaigns.value` with Live/Pause count tags
2. **Total Prospects** → `stats.totalProspects.value` with Live count tag
3. **Meetings Booked** → `stats.meetingsBooked.value` with Live count tag
4. **Total Escalations** → `stats.totalEscalations.value` + status text (e.g. "All resolved" or highlighted if > 0)

#### Active Campaigns Section
Three possible states:
- **`campaigns.length === 0`** → "Add your first campaign" empty state (dashed border card with icon + CTA navigating to `/campaigns`)
- **`filteredCampaigns.length === 0` (search active)** → "No campaigns match..." inline message
- **Campaigns exist** → Multi-column grid of compact campaign cards:
  - Title + status badge (LIVE / PAUSED / DRAFT)
  - Description / subtitle
  - ICP, Company Size, Channels metadata table
  - Prospects / Qualified / Meetings stat numbers

When `campaigns.length > 0`: "View all campaigns →" link appears (navigates to `/campaigns`).

### Search Filtering
`filteredCampaigns` is a `useMemo` that filters by `searchQuery` against:
- `name` or `title`
- `description` or `subtitle`
- `icp`
- `company_size` / `companySize`
- `channels` array (any item)

### Navigation
Clicking sidebar items calls `handleSelectTab(tabId)`:
- `'campaigns'` → navigate to `/campaigns`
- `'settings'` → navigate to `/settings`
- `'conversations'` → navigate to `/conversations`
- Others → stay on overview (sets `activeTab` internally)

---

## 4. Campaigns — `/campaigns`

**File:** [`src/pages/Campaigns.jsx`](src/pages/Campaigns.jsx)

### Purpose
Full campaign lifecycle management. The primary feature page — create, view, pause, resume, and delete campaigns backed by a real PostgreSQL database.

### UI Layout
```
┌──────────┬──────────────────────────────────────────────────────┐
│          │  [Search]    [Kill Switch]    [User pill]            │
│          ├──────────────────────────────────────────────────────┤
│ Sidebar  │  Campaigns                   [+ Create Campaign]     │
│          │  ─────────────────────────────────────────────────── │
│          │  3 Total  |  • 2 Live  |  • 1 Paused  |  • 0 Draft  │
│          │  ─────────────────────────────────────────────────── │
│          │  [🔍 Search campaigns...]  [Status▼] [Owner▼] [Ch▼] │
│          │  ─────────────────────────────────────────────────── │
│          │  ┌──────────────────────┐ ┌──────────────────────┐  │
│          │  │  Campaign Card       │ │  Campaign Card       │  │
│          │  └──────────────────────┘ └──────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────┘
```

### Data Loading
```js
const [userData, killData, campList, statsData] = await Promise.all([
  fetchCurrentUser(),       // GET /api/auth/me
  fetchKillSwitch(),        // GET /api/system/kill-switch
  fetchActiveCampaigns(),   // GET /api/campaigns  ← real DB data
  fetchDashboardOverview(), // GET /api/sdr/stats
])
```

### State
| State variable | Type | Purpose |
|---|---|---|
| `user` | object | Logged-in user |
| `killSwitchActive` | boolean | Kill switch toggle state |
| `campaigns` | array | All campaigns from DB |
| `stats` | object | Aggregated dashboard stats |
| `loading` | boolean | Shows spinner during load |
| `searchQuery` | string | Text search filter |
| `statusFilter` | string | `'ALL'` / `'LIVE'` / `'PAUSED'` / `'DRAFT'` |
| `ownerFilter` | string | `'ALL'` or owner name |
| `channelFilter` | string | `'ALL'` / `'LINKEDIN'` / `'EMAIL'` / `'SMS'` / `'VOICE'` |
| `isCreateModalOpen` | boolean | Create campaign modal visibility |
| `selectedCampaign` | object\|null | Campaign for detail modal |
| `submitting` | boolean | Create form submit loading |
| `toastMessage` | string | Current toast text (empty = hidden) |
| `formData` | object | Create campaign form fields |

### Summary Bar
Computed live with `useMemo` from the `campaigns` array:
```js
const total = campaigns.length
const live   = campaigns.filter(c => c.status === 'LIVE').length
const paused = campaigns.filter(c => c.status === 'PAUSED').length
const draft  = campaigns.filter(c => c.status === 'DRAFT').length
```
Displayed as: `3 Total Campaigns | • 2 Live | • 1 Paused | • 0 Draft`

### Filter System
`filteredCampaigns` is a `useMemo` chain applying four filters simultaneously:
1. **Search** — checks `name/title`, `icp`, `description/subtitle`, `owner_name`
2. **Status** — exact match against `campaign.status`
3. **Owner** — exact match against `campaign.owner_name`
4. **Channel** — checks if any item in `campaign.channels[]` includes the filter value

Owner dropdown options are auto-populated from `uniqueOwners` — a `useMemo` `Set` built from the `campaigns` array, no hardcoding.

### Campaign Cards (2-column grid)
Each `<article>` card shows:
- **Title** + **Status Badge** (`LIVE` green / `PAUSED` amber / `DRAFT` grey)
- **Specs block** (separated by thin borders):
  - ICP / Target Roles
  - Company Size + Channels (inline 2-col)
  - Owner Name
- **Metrics row**: Prospects · Qualified · Meetings (large numbers from DB)
- **Action footer** — varies by status:
  - `LIVE` or `PAUSED` → `[View Campaign]` + `[Pause]` or `[Resume]`
  - `DRAFT` → `[Continue Setup]` + `[Delete Draft]` (red border)

### Empty States
Two distinct empty states:
1. **No campaigns at all** (`campaigns.length === 0`):
   - Full dashed-border card centred on page
   - Target icon in a gradient circle
   - "Add your first campaign" heading + description
   - "Create Your First Campaign" CTA button that opens the Create Modal

2. **Filters return nothing** (`filteredCampaigns.length === 0` but `campaigns.length > 0`):
   - Inline text: "No campaigns match your search or filter criteria."
   - "Clear all filters" text button resets all four filters

### Create Campaign Modal
Opened by "+ Create Campaign" button or the empty state CTA.

**Form fields:**
1. **Campaign Name** *(required)* — text input, validated before submit
2. **Objective / Description** — textarea, optional
3. **Target Roles / ICP** — text input, comma-separated (e.g. "CTO, VP Engineering")
4. **Company Size** — `<select>`: 1-20 / 20-100 / 50-500 / 500+ / Enterprise
5. **Geography** — text input, comma-separated (e.g. "US, India")
6. **Outreach Channels** — pill toggle buttons: `Gmail · LinkedIn · SMS · Voice` (multi-select, must have ≥1)
7. **Daily Outreach Limit** — number input (1–1000)
8. **Initial Status** — `<select>`: Live / Draft / Paused
9. **Requires human review** — checkbox

**Submit flow:**
```
handleCreateSubmit()
  → parse target_roles CSV → string[]
  → parse geography CSV → string[]
  → createCampaign(payload) → POST /api/campaigns
  → on success: showToast, close modal, reset form, loadData()
  → on error: showToast("Error creating campaign...")
```

The backdrop click closes the modal. `e.stopPropagation()` on the modal card prevents accidental dismissal.

### Campaign Detail Modal
Opened by "View Campaign" / "Continue Setup" buttons.

Displays:
- Campaign name + status badge in header
- Description/objective as subtitle
- **3-tile metrics grid**: Prospects · Qualified Leads · Meetings Booked
- **Detail rows**: ICP, Company Size, Channels, Daily Limit, Approval setting, Owner, Created date

### Actions: Pause / Resume
```
handleToggleStatus(campaign)
  → nextStatus = campaign.status === 'LIVE' ? 'PAUSED' : 'LIVE'
  → updateCampaignStatus(campaign.id, nextStatus) → PATCH /api/campaigns/:id/status
  → showToast
  → loadData() to refresh grid
```

### Actions: Delete
```
handleDeleteCampaign(id, name)
  → window.confirm("Are you sure...")
  → deleteCampaign(id) → DELETE /api/campaigns/:id
  → showToast("Campaign deleted")
  → if detail modal open for this campaign: close it
  → loadData()
```

### Toast Notifications
- Fixed bottom-centre, slides up with CSS animation
- Auto-dismisses after 3500ms via `setTimeout`
- Used for: campaign created / paused / resumed / deleted / kill switch toggled / errors

---

## 5. Conversations — `/conversations`

**File:** [`src/pages/Conversations.jsx`](src/pages/Conversations.jsx)

### Purpose
Monitor all AI-driven prospect conversations and manage escalations that require human judgment.

### UI Layout
```
┌──────────┬────────────────────────────────────────────────────────┐
│          │  [Search]  [Kill Switch]  [User block]                 │
│          ├────────────────────────────────────────────────────────┤
│ Sidebar  │  Conversations & Escalations                           │
│          │  Monitor AI-driven conversations…                      │
│          ├────────────────────────────────────────────────────────┤
│          │  [Active 142] [⚠ Needs Attention 8] [AI 117] [👤 17]  │
│          ├────────────────────────────────────────────────────────┤
│          │  Recent Conversations                                  │
│          │  ┌──────────────────────┐ ┌──────────────────────┐    │
│          │  │  Conversation Card   │ │  Conversation Card   │    │
│          │  └──────────────────────┘ └──────────────────────┘    │
│          ├────────────────────────────────────────────────────────┤
│          │  Escalation Queue                                      │
│          │  Priority | Prospect | Campaign | Reason | Status | …  │
└──────────┴────────────────────────────────────────────────────────┘
```

### Data Loading
```js
const [userData, killSwitchData, summaryData, recentData, escalationsData] =
  await Promise.all([
    fetchCurrentUser(),
    fetchKillSwitch(),
    fetchConversationSummary(),   // GET /api/conversations/summary
    fetchRecentConversations(),   // GET /api/conversations/recent
    fetchEscalations(),           // GET /api/conversations/escalations
  ])
```
Falls back to `DEFAULT_CONVERSATION_SUMMARY`, `DEFAULT_RECENT_CONVERSATIONS`, `DEFAULT_ESCALATIONS` if the backend endpoints aren't live yet.

### State
| State variable | Type | Purpose |
|---|---|---|
| `summary` | object | `{ active_conversations, needs_attention, ai_handling, human_takeover }` |
| `recentConversations` | array | Conversation thread list |
| `escalations` | array | Escalation queue items |
| `selectedFilter` | string | Active stat card tab (`'ALL'`, `'NEEDS_ATTENTION'`, `'AI_HANDLING'`, `'HUMAN_TAKEOVER'`) |
| `activeModalThread` | object\|null | Currently open thread drawer |
| `replyText` | string | Human reply composer content |
| `toastMessage` | string | Toast notification content |

### Summary Stat Cards (4 tiles — all clickable)
Clicking a card sets `selectedFilter` (visual selection state):

| Card | Icon | Statistic | Filter Value |
|---|---|---|---|
| Active Conversations | ChatBubble | `summary.active_conversations` | `'ALL'` |
| Needs Attention | AlertCircle + red dot | `summary.needs_attention` | `'NEEDS_ATTENTION'` |
| AI Handling | CPU | `summary.ai_handling` | `'AI_HANDLING'` |
| Human Takeover | User | `summary.human_takeover` | `'HUMAN_TAKEOVER'` |

"Needs Attention" card has a pulsing red indicator dot — visually highlighted to draw attention.

### Recent Conversations List
Each conversation card shows:
- **Initials avatar** + prospect name + job title + company + timestamp
- **Campaign name**, **channel badge** (Email icon / LinkedIn icon), **status badge**
- **Message bubble** — the latest message in the thread
- **Action buttons:**
  - `[View History]` → opens Thread Drawer Modal
  - `[Takeover]` (for `action_type === 'takeover'`) or `[Review]` (for others)

First card and any `NEEDS_ATTENTION` card get a red left-border highlight class.

**Search filtering** on `searchQuery`: filters by `prospect_name`, `company`, `campaign_name`, `latest_message`.

### Takeover Handler
```
handleTakeover(conv)
  → takeoverConversation(conv.id) → POST /api/conversations/:id/takeover
  → update recentConversations state: set status to 'HUMAN_TAKEOVER'
  → update summary: needs_attention--, human_takeover++
  → showToast("Human takeover activated for {name}")
```
All state updates are **optimistic** — UI updates before the API call completes.

### Thread Drawer Modal (right-side panel)
Opens when "View History" or "Review" is clicked. Click backdrop to close.

Contains:
- **Header**: prospect initials avatar, name, title, company, campaign name
- **Message history** (`conv.history[]`): each message rendered as a chat bubble
  - Outbound (AI SDR / Human SDR): right-aligned style
  - Inbound (prospect): left-aligned style
- **Reply composer** textarea: placeholder shows prospect's name
- **"Take Over Conversation"** button: calls `handleTakeover` and closes drawer
- **"Send Reply"** button: appends message to `conv.history` locally, updates `latest_message`, sets status to `HUMAN_TAKEOVER`, shows toast — no dedicated send endpoint (composable for future)

### Escalation Queue Table
Searchable table with columns: Priority · Prospect · Campaign · Reason · Status · Action

**Priority badges** are colour-coded:
- `high` → red
- `medium` → amber
- `low` → grey/blue

**Action button:**
- If status is `'Resolved'` → button text "View" + shows "already resolved" toast on click
- Otherwise → button text "Review" → calls `resolveEscalation(esc.id)` → `POST /api/conversations/:id/resolve` → updates `esc.status` to `'Resolved'` in state

### Header Variant
Uses `variant="settings"` header — shows full-width search bar + kill switch toggle + user monogram block.

---

## 6. Settings — `/settings`

**File:** [`src/pages/Settings.jsx`](src/pages/Settings.jsx)

### Purpose
Workspace configuration panel. Manage general preferences, workspace policies, notification toggles, integrations, permissions, and security settings.

### UI Layout
```
┌──────────┬──────────────────────────────────────────────────────┐
│          │  [Search]   [Kill Switch 🔴]   [User block]          │
│          ├──────────────────────────────────────────────────────┤
│ Sidebar  │  Settings                                            │
│          │  Manage workspace, notifications…                    │
│          ├─────────────┬────────────────────────────────────────┤
│          │  General    │  ┌────────────────────────────────┐    │
│          │  Workspace  │  │  GENERAL SETTINGS              │    │
│          │  Notif…     │  │  Workspace Name: [___________] │    │
│          │  Integr…    │  │  Workspace Desc: [___________] │    │
│          │  Permiss…   │  │  Timezone: [dropdown ▼]        │    │
│          │  Security   │  │  Language: [dropdown ▼]        │    │
│          │             │  ├────────────────────────────────┤    │
│          │             │  │  NOTIFICATIONS                 │    │
│          │             │  │  Email Notif…    [toggle]      │    │
│          │             │  │  Escalation…     [toggle]      │    │
│          │             │  │  Daily Summary   [toggle]      │    │
│          │             │  └────────────────────────────────┘    │
│          │             │            [Save Changes]              │
└──────────┴─────────────┴────────────────────────────────────────┘
```

### Data Loading
```js
const [userData, settingsData, killSwitchData] = await Promise.all([
  fetchCurrentUser(),  // GET /api/auth/me
  fetchSettings(),     // GET /api/settings
  fetchKillSwitch(),   // GET /api/system/kill-switch
])
```
Settings are deep-merged with `DEFAULT_SETTINGS` so missing backend fields never cause undefined errors.

### State
| State variable | Type | Purpose |
|---|---|---|
| `activeSubTab` | string | Currently visible settings panel |
| `formData` | object | Full settings form state (nested object) |
| `saving` | boolean | Save button loading state |
| `killSwitchActive` | boolean | Kill switch toggle |
| `toastMessage` | string | Toast notification content |

### Sub-tabs and their content

#### General (default)
Two cards rendered side-by-side in this sub-tab:

**Card 1 — General Settings:**
- Workspace Name → text input (`formData.general.workspace_name`)
- Workspace Description → text input (`formData.general.workspace_description`)
- Timezone → `<select>` with 7 timezone options
- Language → `<select>` with 5 language options

**Card 2 — Notifications (shown on General tab too):**
- Email Notifications → burgundy toggle switch
- Escalation Alerts → burgundy toggle switch
- Daily Performance Summary → burgundy toggle switch

#### Workspace
- Max Daily Prospects per Campaign → number input (`formData.workspace.default_campaign_limit`)
- Data Retention (Days) → number input (`formData.workspace.data_retention_days`)

#### Notifications
- Same 3 toggles as in the General tab (Email, Escalations, Daily Summary)
- Labelled as "Channels & Frequency"

#### Integrations
- Gmail & Google Workspace → "Connected" green badge (display-only)
- LinkedIn Sales Navigator → "Connected" green badge (display-only)

#### Permissions
- Require Manager Approval for High ICP → toggle switch
- Description: "Pause drafts before sending to VP and C-level leads"

#### Security
- Two-Factor Authentication (2FA) → toggle switch
- Description: "Require one-time passcode for admin log in"

### Save Flow
```
handleSave(e)
  → e.preventDefault()
  → setSaving(true)
  → saveSettings(formData) → PUT /api/settings
  → on success: merge response into formData, showToast("Settings saved successfully!")
  → on error: showToast("Failed to save settings. Please try again.")
  → setSaving(false)
```
All settings sections share one "Save Changes" button at the bottom of the right panel.

### Toggle Handlers
- **`handleGeneralChange(field, value)`** — updates `formData.general[field]` immutably
- **`handleNotificationToggle(field)`** — flips `formData.notifications[field]` boolean
- Workspace and Security fields update via inline `setFormData` callbacks

### Header Variant
Uses `variant="settings"` header — shows the kill switch button and user monogram (same as Conversations page).

---

## 7. NotFound

**File:** [`src/pages/NotFound.jsx`](src/pages/NotFound.jsx)

### Purpose
404 fallback page. Rendered by `App.jsx` when no registered route matches the current URL.

Simple — likely renders a "404 Not Found" message. No state, no API calls.

---

## Common Patterns Across All Pages

### Pattern 1: Mounted guard for async data loading
Every page with `useEffect` uses an `isMounted` flag to prevent state updates on unmounted components:
```js
useEffect(() => {
  let isMounted = true
  async function loadData() {
    // ...
    if (isMounted) setState(data)
  }
  loadData()
  return () => { isMounted = false }
}, [])
```

### Pattern 2: Sidebar navigation handler
Every page has a `handleNavSelect(tabId)` function that maps sidebar tab IDs to `navigate()` calls — with a guard for the current page (does nothing to avoid re-render).

### Pattern 3: Toast notification system
Every page (except auth pages) uses:
```js
const showToast = (msg) => {
  setToastMessage(msg)
  setTimeout(() => setToastMessage(''), 3500)
}
```
Toast renders conditionally: `{toastMessage && <div className="sdr-toast">{toastMessage}</div>}`

### Pattern 4: Optimistic UI updates
Conversations page updates local state immediately before/after API calls instead of waiting for a full reload. Campaigns page uses `loadData()` after mutations to ensure the grid reflects DB truth.

### Pattern 5: Graceful API fallbacks
All `fetchX()` calls are wrapped in `try/catch`. On failure they return `DEFAULT_*` constants, so the page always renders something sensible even if the backend is down.
