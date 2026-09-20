# Internal Merchant CRM — UI/UX Plan

Stack: Supabase (Postgres + Auth + RLS + PostgREST + Realtime), React (Vite + TS), react-query,
react-router-dom, shadcn/ui. RLS is the real authorization boundary; all UI role gating below is a
convenience layer (disable/hide controls, better error messages) — never the source of truth.

---

## 1. UX Overview

- **Mental model: merchant-centric.** The merchant is the hub every other entity (contacts,
  transactions, tickets, activity, tasks) hangs off of. Even standalone tasks and the global ticket
  queue are just filtered views that link back to a merchant.
- **Primary navigation: persistent left sidebar (module nav) + a secondary master-detail pane for
  the Merchants module.** Sidebar = app-level sections (Dashboard, Merchants, Tickets, Tasks,
  Users, Settings — Dashboard/Users/Settings hidden entirely for roles that can't use them, see
  §5). Within Merchants, a list/detail split view is the workhorse screen where reps live all day.
  Landing route is role-based: **Dashboard** for Admin/Ops (org-wide overview, their day starts
  there), **Merchants** for Sales/Support (unchanged).
- **Tabs for entity depth, not breadth.** Merchant Detail uses a tab strip (Activity, Contacts,
  Tickets, Transactions, Tasks) instead of separate routes/pages, so context (header KPIs, status)
  never disappears while switching sub-views. Deep-linkable via `?tab=`.
- **Global search is the fast path.** A topbar Command-palette-style search (⌘K) jumps straight to
  a merchant, ticket, or task by name/id — power users shouldn't have to navigate the tree to find
  something they already know.
- **Realtime is ambient, not intrusive.** Activity feed, ticket list/detail, and task lists
  subscribe to Supabase Realtime and merge changes in place (toast/badge for "new activity" rather
  than yanking scroll position), since multiple agents work the same merchant concurrently.

---

## 2. Screen Inventory

| Screen | Purpose |
|---|---|
| **Login** | Supabase Auth email/password (or magic link) sign-in; redirects to last route, or role-based landing (**Dashboard** for Admin/Ops, **Merchants** for Sales/Support) if there's no prior route. |
| **App Shell** | Sidebar + topbar wrapper around all authenticated routes; holds global search, user menu, role badge. |
| **Dashboard** *(new)* | Org-wide ops overview: KPI tiles (total/active merchants, open tickets by priority, overdue tasks) + a cross-merchant recent-activity feed. Landing page for Admin/Ops only; not shown in nav for Sales/Support. |
| **Merchants List + Detail (split view)** | Primary workspace: searchable/filterable merchant list on the left, selected merchant's full detail (header + tabs) on the right. |
| — Merchant Detail: Overview/Header | Identity, status, MCC, owner, 30-day volume KPI, quick actions — always visible above tabs. |
| — Merchant Detail: Activity tab | Chronological note/call/email/meeting/system feed; log-activity composer. |
| — Merchant Detail: Contacts tab | Contact list for the merchant; add/edit contact; primary-contact flag. |
| — Merchant Detail: Tickets tab | Tickets scoped to this merchant; create ticket; status/priority/assignee edit. |
| — Merchant Detail: Transactions tab | Read-only transaction table/ledger for this merchant; filter by status/date. |
| — Merchant Detail: Tasks tab | Tasks scoped to this merchant; create/assign/complete. |
| **New Merchant (Dialog/Sheet)** | Create-merchant form (Sales/Ops/Admin only), opened from list toolbar. |
| **Tickets (Global Queue)** | Cross-merchant ticket list for Support/Ops triage — "My Tickets", "Unassigned", filters by status/priority; row click deep-links into merchant detail's Tickets tab. |
| **Tasks (My Work / Team)** | Standalone task home: "My Tasks", "Assigned by Me", "Team", "Unlinked"; kanban or list view; create/edit task, optionally link to a merchant. |
| **Users** *(renamed from "Admin: Users")* | Manage Profiles — list users, role, is_active toggle (Admin only). Functionality unchanged; sidebar label and screen name simplified from "Admin" to "Users" since it's the only screen in that module — cosmetic only, see §3. |
| **Settings (Admin)** *(new)* | Org-level system configuration — ticket priority/SLA defaults, notification defaults (Admin only). Distinct from **Profile / Settings** below, which is unchanged and remains personal/per-user. |
| **Profile / Settings** | Current user's own profile view, theme/density prefs, sign out. |
| **403 / No Access** | Shown when RLS rejects an action or route despite UI gating (defense-in-depth). |
| **Not Found (404)** | Bad merchant id / route. |

---

## 3. Navigation & Layout (ASCII)

```
[App Shell: Sidebar (module nav) + Topbar (search, user menu)]
│
├─ [Dashboard]  (Admin/Ops only, hidden entirely for Sales/Support — default landing for Admin/Ops)
│    └─ KPI tiles (total/active merchants, open tickets by priority, overdue tasks)
│         + org-wide recent Activity feed (all merchants, newest first)
│         KPI tile click     ──▶ scoped [Merchants] / [Tickets] / [Tasks] view
│         activity row click ──▶ [Merchant Detail → Activity tab]
│
├─ [Merchants]  (default landing for Sales/Support)
│    └─ Split view: [Merchant List] ── select row ──▶ [Merchant Detail]
│         Merchant Detail tabs:
│         ├─ Activity  (feed + composer)
│         ├─ Contacts  (table + add/edit dialog)
│         ├─ Tickets   (table scoped to merchant + new-ticket dialog)
│         ├─ Transactions (read-only table)
│         └─ Tasks     (table/list scoped to merchant + new-task dialog)
│         [+ New Merchant] opens Sheet from list toolbar
│
├─ [Tickets]  (global queue, Support/Ops focus)
│    └─ Filterable table (status, priority, assignee, merchant)
│         row click ──▶ [Merchant Detail → Tickets tab, ticket expanded]
│
├─ [Tasks]  (My Work)
│    └─ Views: My Tasks | Assigned by Me | Team | Unlinked
│         task click ──▶ Task Detail Sheet (edit inline)
│         merchant-linked task ──▶ link out to [Merchant Detail]
│
├─ [Users]  (Admin role only, hidden otherwise — renamed from "Admin"; same screen/functionality)
│    └─ Users table → row ──▶ Edit-role / active-toggle Dialog
│
├─ [Settings]  (Admin role only, hidden otherwise — new, org-level config)
│    └─ Ticket Priority & SLA Defaults  (Card: editable table + Save/Reset)
│         Notification Defaults          (Card: placeholder switches + Save/Reset)
│
└─ [Profile menu ▾] (topbar, all roles)
     ├─ My Profile / Settings  (personal — theme/density prefs; unchanged)
     └─ Sign out

Global: [⌘K Command Palette] — search merchants/tickets/tasks from anywhere
```

---

## 4. Key Screens — ASCII Wireframes

### 4.1 Merchants List + Detail (primary workspace)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ☰  CRM     [⌘K  Search merchants, tickets, tasks...]         Jane Ops ▾  (role: ops)        │
├───────────────┬───────────────────────────────────────────────────────────────────────────┤
│ MERCHANTS      │ ACME Payments Inc.                              [status: active ▾]        │
│ [+ New]        │ dba "Acme Pay"  ·  MCC 5732  ·  Owner: J. Rivera ·  Country: US            │
│ [Search......] │ 30-day volume: $482,310   |   Open tickets: 2   |   Last activity: 3h ago  │
│ Status[All  ▾] │ [Log Activity] [New Ticket] [New Task] [Edit Merchant]                     │
│ Owner [All  ▾] │ ────────────────────────────────────────────────────────────────────────  │
│ ─────────────  │ [Activity] [Contacts] [Tickets] [Transactions] [Tasks]                     │
│ ▸ Acme Payments │┌─────────────────────────────────────────────────────────────────────────┐│
│   active  JR   ││ 🟢 live   Filter: [All types ▾]                    [+ Log activity]       ││
│ ▸ Beta Corp    ││ ─────────────────────────────────────────────────────────────────────── ││
│   onboarding   ││ 💬 Note · Jane Ops · 2h ago                                                ││
│ ▸ Chroma LLC   ││    "Confirmed onboarding docs received, pending KYC review."               ││
│   suspended    ││ ☎️ Call · Sam Sales · yesterday                                            ││
│ ▸ Delta Retail ││    "Discussed volume ramp; merchant expects 2x GMV next quarter."          ││
│   churned      ││ ⚙️ System · yesterday — status changed lead → onboarding                   ││
│ …              ││ [Load more ▾]                                                              ││
│ ─────────────  │└─────────────────────────────────────────────────────────────────────────┘│
│ ◂ 1 2 3 … 12 ▸  │                                                                            │
│ 240 merchants  │                                                                            │
└───────────────┴───────────────────────────────────────────────────────────────────────────┘
```
- Left = shadcn `Command`-style filter/search input + `Select` filters + virtualized/paginated
  `Table` or row-list (`ScrollArea`); selected row highlighted; URL is `/merchants/:id`.
- Right = `Card` header (identity + KPIs + action buttons) above a shadcn `Tabs` component; each
  tab body is its own `Card`/`Table` region. Tab state synced to `?tab=activity|contacts|...`.
- Header status is a `Select`-driven `Badge` (role-gated, see §5).

### 4.2 Merchant Detail — Tickets tab (expanded)

```
┌ [Activity] [Contacts] [Tickets ●2] [Transactions] [Tasks] ─────────────────────────────────┐
│ Filter: Status[All▾] Priority[All▾] Assignee[All▾]                    [+ New Ticket]       │
│ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Subject                     Status     Priority  Assignee     Updated       │           │ │
│ │ Chargeback dispute #4821    open       urgent    Sam Support  10m ago  🔴   │ ▸ expand  │ │
│ │ KYC doc re-upload request   pending    normal    Sam Support  2h ago        │           │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│ ▾ Chargeback dispute #4821                                                    [Edit] [X]   │
│   Status: [open ▾]  Priority: [urgent ▾]  Assignee: [Sam Support ▾]  Created by: Sam S.    │
│   Description: "Merchant disputing chargeback on txn ext_9931..."                           │
│   Linked activity: 3 notes  ·  [+ Log note on this ticket]                                  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
- Row expands inline (`Collapsible`/accordion row) rather than navigating away — keeps merchant
  context. "New Ticket" opens a `Dialog` form (subject, description, priority, assignee).
- Status/Priority/Assignee are inline `Select` editors — optimistic update via react-query
  mutation, rolled back on RLS rejection with a toast.

### 4.3 Merchant Detail — Transactions tab (read-only)

```
┌ [Activity] [Contacts] [Tickets] [Transactions] [Tasks] ────────────────────────────────────┐
│ Filter: Status[All▾] Date range[Last 30d ▾]              (read-only — no create/edit/delete) │
│ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Date           Amount      Currency  Status      External ID                            │ │
│ │ 2026-09-16     $1,240.00   USD       settled     ext_88213                               │ │
│ │ 2026-09-15     $340.50     USD       refunded    ext_88190                               │ │
│ │ 2026-09-14     $2,100.00   USD       chargeback  ext_88104          🔴                   │ │
│ │ 2026-09-13     $75.00      USD       pending     ext_88077                                │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│ Showing 1–25 of 1,204          ◂ Prev  1 2 3 … 49  Next ▸                                   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
- No row actions, no bulk toolbar, no "New" button anywhere on this tab, for any role — reinforces
  that this data is ingestion-only. Status shown as colored `Badge`. Server-side pagination
  (transaction volume can be large).

### 4.4 Tasks — My Work (standalone task home)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ TASKS                                                             [+ New Task]              │
│ [My Tasks] [Assigned by Me] [Team] [Unlinked]        View: [List ▾ / Board]                 │
│ Filter: Status[All▾] Due[All▾] Merchant[All▾]                                                │
│ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ☐  Follow up on onboarding docs      Beta Corp       Due: Sep 18   todo         [⋮]    │ │
│ │ ☑  Send pricing sheet                —  (unlinked)   Due: Sep 15   done         [⋮]    │ │
│ │ ☐  Escalate chargeback w/ risk team  Acme Payments   Due: Sep 17   in_progress  [⋮]    │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
- Checkbox = quick status toggle (todo/done shortcut); `[⋮]` opens a `Sheet` with full edit
  (title, notes, due date, assignee, linked merchant via combobox, status select).
- Merchant-linked rows show merchant name as a link chip → navigates to `/merchants/:id?tab=tasks`.
- Board view = shadcn-style kanban using `Card` columns per status (todo/in_progress/done/cancelled)
  with drag-and-drop (optional v2; list view is MVP).

### 4.5 Dashboard (Admin/Ops landing page, org-wide overview)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ☰  CRM     [⌘K  Search merchants, tickets, tasks...]         Jane Ops ▾  (role: ops)        │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ DASHBOARD                                                    🟢 live   Refreshed: just now  │
│ ┌──────────────┬──────────────┬───────────────────────────────┬──────────────────────────┐ │
│ │ TOTAL         │ ACTIVE        │ OPEN TICKETS              18   │ OVERDUE TASKS         12  │ │
│ │ MERCHANTS     │ MERCHANTS     │ 🔴 urgent 4   🟠 high 6         │                            │ │
│ │   240         │   176         │ 🟡 normal 5   ⚪ low 3           │                            │ │
│ │ view→[Merchants]│view→[Merchants│ view→[Tickets]                 │ view→[Tasks]               │ │
│ │                │  status=active]│                                │                            │ │
│ └──────────────┴──────────────┴───────────────────────────────┴──────────────────────────┘ │
│ ───────────────────────────────────────────────────────────────────────────────────────── │
│ RECENT ACTIVITY (org-wide, newest first)                              Filter: [All types ▾] │
│ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 2m ago    💬 Note    Acme Payments   Jane Ops      "Confirmed onboarding docs..."       │ │
│ │ 14m ago   ☎️ Call    Beta Corp       Sam Sales     "Discussed volume ramp..."           │ │
│ │ 1h ago    ⚙️ System  Chroma LLC      —             status changed active → suspended    │ │
│ │ 3h ago    💬 Note    Delta Retail    Priya Support "Escalating chargeback with risk..." │ │
│ │ …                                                                                        │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                       [Load more ▾]          │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
- KPI row = four shadcn `Card` tiles in a `grid` (not a whitespace-heavy hero layout — tight
  padding, label/value/breakdown/link stacked densely per this app's information-density
  convention). Each tile's footer is a text link ("view→") that deep-links into the scoped
  Merchants/Tickets/Tasks list (e.g. Overdue Tasks → `/tasks?view=team&status=overdue`).
- Open Tickets tile shows a compact priority breakdown (counts, not a chart) inline in the tile —
  no separate chart component needed at this density.
- Recent Activity feed reuses the same row shape as the Merchant Detail Activity tab (§4.1) plus a
  merchant-name column, since it's the same underlying `activities` data queried org-wide instead
  of scoped to one `merchant_id`; same type filter, same "Load more" pagination, same realtime
  merge behavior (see §5).
- Expected to be backed by a single aggregation call (e.g. `supabase.rpc('dashboard_summary')`)
  for the KPI counts, following the existing `merchant_summary` RPC pattern in
  `TECHNICAL_IMPLEMENTATION.md` §4.3, rather than computing counts client-side from full table
  scans — exact function/shape to be confirmed with backend, not prescribed here.
- Not shown in the sidebar or reachable by direct nav for Sales/Support — this is an org-overview,
  not a personal one, and those roles land on Merchants instead (see §3).

### 4.6 Settings (Admin-only, org-level configuration)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ☰  CRM     [⌘K  Search merchants, tickets, tasks...]         Ada Admin ▾  (role: admin)     │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ SETTINGS                                                                                     │
│ ┌─ Ticket Priority & SLA Defaults ───────────────────────────────────────────────────────┐ │
│ │ Default priority for new tickets:  [normal ▾]                                           │ │
│ │ ┌──────────────────────────────────────────────────────────────────────────────────┐   │ │
│ │ │ Priority     SLA breach threshold (hours)         Enabled                         │   │ │
│ │ │ urgent       [   4 ]                              [x]                             │   │ │
│ │ │ high         [  24 ]                              [x]                             │   │ │
│ │ │ normal       [  72 ]                              [x]                             │   │ │
│ │ │ low          [ 168 ]                              [x]                             │   │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────┘   │ │
│ │ Unsaved changes                                          [Reset]  [Save Ticket Defaults] │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─ Notification Defaults  (placeholder — no notification system built yet) ──────────────┐ │
│ │ Email me when a ticket is assigned to me       ○──  off   🔒 coming soon                │ │
│ │ Email me when a task I own becomes overdue     ○──  off   🔒 coming soon                │ │
│ │ Daily digest of open tickets                   ○──  off   🔒 coming soon                │ │
│ │                                                            [Reset]  [Save Notification    │ │
│ │                                                                       Defaults]           │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
- Each config domain is its own `Card` (`Ticket Priority & SLA Defaults`, `Notification
  Defaults`) with its **own independent Save/Reset**, not one page-wide submit — see §5 for why.
- Ticket SLA table is a small fixed-row (4 priorities) editable `Table`: numeric `Input` for the
  breach-threshold hours, `Switch` for enabled/disabled, plus a top-level `Select` for the
  org-wide default priority assigned to new tickets. Maps to whatever `ticket_priority`-keyed
  config table/row the backend defines — this screen assumes one row per `ticket_priority` enum
  value, consistent with the enum already defined in `TECHNICAL_IMPLEMENTATION.md` §2.1.
- Notification Defaults renders as real `Switch` rows so the surface exists and is discoverable,
  but every switch is disabled with a `Tooltip`: "Not available yet" and a `Badge` ("coming soon")
  next to the section title — this is a placeholder surface per the brief, not a working feature;
  it must not silently no-op if someone finds a way to toggle it.
- Page is reachable only via the `Settings` sidebar item, itself hidden for every non-admin role
  (see §3, §5) — there is no partial/disabled view for other roles, matching the same
  role-impossible-by-design hide rule already used for `Users`.

---

## 5. Interaction & States

**Loading / empty / error**
- Lists (merchants, tickets, tasks, transactions, activity): skeleton rows (`Skeleton`) on first
  load; inline `Spinner` in tab content on tab switch if not yet cached by react-query.
- Empty states: centered icon + short copy + primary action where relevant, e.g. Contacts tab
  empty → "No contacts yet" + `[Add contact]`; Activity feed empty → "No activity logged yet";
  Transactions empty → "No transactions for this merchant yet" (no action, read-only).
- Error states: inline `Alert` (destructive) within the tab/list region, not a full-page crash;
  react-query retry button. RLS-denied writes surface as toast: "You don't have permission to do
  that" rather than a generic 500.
- **Dashboard KPI tiles:** each tile shows its own `Skeleton` (label + large-number placeholder)
  independently while `dashboard_summary` loads, so tiles that resolve first render immediately
  rather than blocking on the slowest count; a tile-level fetch failure renders a compact inline
  `Alert` ("Couldn't load" + retry icon-button) inside just that tile, not the whole dashboard.
- **Dashboard activity feed:** skeleton rows on first load, identical pattern to the Merchant
  Detail Activity tab; empty state ("No activity yet") is unlikely in practice but handled the
  same way; error state is an inline `Alert` + retry within the feed `Card`, independent of the
  KPI row above it (partial-failure tolerant — KPIs and feed are separate queries).
- **Settings:** on load, each Card shows a `Skeleton` form (label rows + input placeholders) until
  current config resolves; if the config fetch fails, the Card shows a destructive `Alert` +
  retry and its Save button is disabled until data loads successfully (never let an admin "save"
  on top of an unknown/failed-to-load base state).

**Permission-gated controls (UI convenience layer only — RLS enforces for real)**

| Control | sales | support | ops | admin |
|---|---|---|---|---|
| Edit any merchant | own only (others read-only, fields disabled) | disabled (read-only) | ✅ | ✅ |
| Change merchant status/owner | own only | ❌ | ✅ | ✅ |
| Create merchant | ✅ | ❌ (hidden) | ✅ | ✅ |
| Edit contacts | ✅ | ✅ | ✅ | ✅ |
| Transactions: any write UI | never shown, anywhere, any role (no create/edit/delete affordances exist in the app) | | | |
| Create/edit ticket | read-only (fields disabled, can view) | ✅ | ✅ | ✅ |
| Log activity/note | ✅ (own-authored edits only) | ✅ | ✅ | ✅ |
| Edit others' activity notes | ❌ (disabled) | ❌ | ❌ | ❌ (author-only everywhere) |
| Create/edit tasks | own/assigned | ✅ | ✅ | ✅ |
| Users screen *(renamed from "Admin: Users")* | hidden from nav | hidden | hidden | ✅ |
| Dashboard (nav item + landing route) | hidden from nav | hidden | ✅ (default landing) | ✅ (default landing) |
| Settings screen (nav item + route) | hidden from nav | hidden | hidden | ✅ |

- Disabled controls still render (greyed `Button`/`Select` with a `Tooltip`: "You don't have
  permission to edit this") rather than disappearing, *except* where the action is structurally
  impossible for that role (e.g. Support never sees "New Merchant"; nobody ever sees transaction
  write controls). Rule of thumb: hide when the action is role-impossible by design; disable +
  tooltip when it's data-ownership-dependent (e.g. "own merchant" for Sales).
- Every mutation still goes through the normal Supabase client call — if RLS rejects it despite
  the UI allowing the attempt (stale role cache, edge case), catch and toast, don't assume success.

**Search / filter / pagination**
- Merchant list: debounced text search (legal_name/dba_name, ILIKE via PostgREST), `Select`
  filters for status and owner, combined into the react-query key so filter changes refetch
  cleanly; server-side pagination (cursor or page-based) — never load all merchants client-side.
- Global ⌘K search: single input, grouped results (Merchants / Tickets / Tasks), keyboard
  navigable, Enter to jump — implemented as a lightweight cross-entity PostgREST query, not a
  separate search index for v1.
- Tickets/Tasks lists: same debounced-filter-into-query-key pattern; status/priority/assignee as
  `Select`/`ToggleGroup`.
- Transactions: date-range + status filter only, no free-text search (high volume, indexed
  columns only).

**Inline edit vs modal**
- Single-field, low-risk edits (ticket status/priority/assignee, task status, merchant status) →
  inline `Select` with optimistic update.
- Multi-field creates/edits (new merchant, new ticket, new contact, new task, edit merchant
  profile fields) → `Dialog` or `Sheet` form with explicit Save/Cancel — avoids accidental
  multi-field drift and gives room for validation messaging.
- Activity notes → inline composer (`Textarea` + type `Select` + submit) pinned above the feed,
  not a modal — this is a high-frequency action and should have zero navigation friction.
- **Settings page (org config) → per-section save, not per-field inline-edit and not one
  page-wide submit.** Rationale: unlike ticket/task status edits, these are low-frequency,
  multi-field, and mutually-related-within-a-section values (e.g. an SLA-hour change is only
  meaningful reviewed alongside the other three priorities' thresholds at once) — per-field
  optimistic auto-save risks admins saving a half-edited, inconsistent SLA table one field at a
  time. A single whole-page submit is too coarse the other direction: it would force saving
  unrelated Notification Defaults changes together with Ticket SLA changes. Each `Card` (Ticket
  Priority & SLA Defaults; Notification Defaults) therefore has its own **Save / Reset** pair,
  dirty-state tracked per section (`Unsaved changes` label appears only on a touched section),
  and its own success/error toast — a failed SLA save doesn't roll back or block the Notification
  section, and vice versa.

**Bulk actions**
- Merchant list, Tickets queue, Tasks list support row `Checkbox` selection → contextual toolbar
  appears (e.g. "3 selected: [Reassign] [Change status]"). Bulk actions respect the same
  role-gating rules as single-row edits; button disabled if the selection includes rows the user
  can't act on (with a tooltip explaining why), or the bulk action is scoped to only apply to the
  eligible rows in the selection with a summary toast ("Updated 2 of 3 — 1 skipped: no
  permission").

**Realtime behavior**
- Activity feed, merchant-scoped Tickets tab, global Tickets queue, and Tasks lists subscribe to
  Supabase Realtime channels scoped by merchant_id (or assignee/global for queues).
- New inserts merge into the top of feeds with a subtle highlight fade-in; if the user has
  scrolled down, show a floating "↑ New activity" pill instead of forcibly scrolling them.
  Updates (e.g. ticket status changed by someone else) patch the row in place via react-query
  cache update, not a full refetch, to avoid layout jank.
- A small "🟢 live" indicator near list/feed headers communicates the realtime connection state
  (green = subscribed, grey = reconnecting) so agents trust that what they see is current when
  co-working a merchant.
- Presence (optional v2): small avatar stack ("Sam is also viewing this merchant") using Supabase
  Presence, purely informational, no locking.

**Navigation/deep-linking**
- `/merchants/:id?tab=tickets&ticket=4821` — tab and expanded-row state both reflected in URL so
  links from the global Tickets queue or notifications land precisely.
- `/tasks?view=my&status=todo` similarly encodes task-home filters.
- Sidebar item for a module highlights active; breadcrumb-less by design (the tab/header context
  in Merchant Detail substitutes for breadcrumbs).
