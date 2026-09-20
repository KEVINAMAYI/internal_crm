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
  the Merchants module.** Sidebar = app-level sections (Merchants, Tickets, Tasks, Admin). Within
  Merchants, a list/detail split view is the workhorse screen where reps live all day.
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
| **Login** | Supabase Auth email/password (or magic link) sign-in; redirects to last route or Merchants list. |
| **App Shell** | Sidebar + topbar wrapper around all authenticated routes; holds global search, user menu, role badge. |
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
| **Admin: Users** | Manage Profiles — list users, role, is_active toggle (Admin only). |
| **Profile / Settings** | Current user's own profile view, theme/density prefs, sign out. |
| **403 / No Access** | Shown when RLS rejects an action or route despite UI gating (defense-in-depth). |
| **Not Found (404)** | Bad merchant id / route. |

---

## 3. Navigation & Layout (ASCII)

```
[App Shell: Sidebar (module nav) + Topbar (search, user menu)]
│
├─ [Merchants]  (default landing)
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
├─ [Admin]  (Admin role only, hidden otherwise)
│    └─ Users table → row ──▶ Edit-role / active-toggle Dialog
│
└─ [Profile menu ▾] (topbar, all roles)
     ├─ My Profile
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
| Admin: Users screen | hidden from nav | hidden | hidden | ✅ |

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
