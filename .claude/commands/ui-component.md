---
description: Scaffold a new React UI component, placed in the right route/screen per the UI/UX plan and technical spec
argument-hint: <ComponentName> "<description of what it does / where it's used>"
---

You are creating a new, production-quality React component for this project: **$1**

Description of what it should do / where it's used:
$2

If `$2` is empty, stop and ask the user for a short description before doing anything else —
the placement and design decisions below depend on it.

## 1. Ground yourself in the source of truth

Before writing any code, read (don't skim from memory):

- `TECHNICAL_IMPLEMENTATION.md` — schema (§2), roles/RLS matrix (§3.1), API/query patterns (§4),
  frontend structure and layout (§5).
- `docs/ui_ux_plan.md` — screen inventory, navigation, ASCII wireframes, interaction/state specs.

Use these, not assumptions, to decide:

- **Which entity/screen this component belongs to** (Merchant, Contact, Transaction, Ticket,
  Activity, Task, or a cross-cutting shell/nav element).
- **Where it lives in the route tree** — e.g. inside a Merchant Detail tab
  (`/merchants/:id?tab=...`), the global Tickets queue, the Tasks home, the command palette,
  or Admin. Match against the screen inventory and ASCII wireframes in `docs/ui_ux_plan.md`
  rather than inventing a new screen.
- **Its permission behavior**, per the CLAUDE.md gating rule: **hide** controls that are
  role-impossible by design, **disable + tooltip** controls that are data-ownership-dependent.
  Cross-check the role/table matrix in `TECHNICAL_IMPLEMENTATION.md` §3.1 for what the roles
  (`sales`, `support`, `ops`, `admin`) can actually do to the underlying entity. Never give a
  component a transaction write affordance — transactions are read-only for every role.
- **Its interaction pattern** — inline `Select` + optimistic update for single-field low-risk
  edits, `Dialog`/`Sheet` for multi-field create/edit, an inline composer (not a modal) for
  activity notes — per CLAUDE.md.

If the description doesn't clearly map to an existing screen/tab/entity in either doc, **ask
the user** where it belongs instead of guessing (per this repo's CLAUDE.md: ask before assuming
when the plan doesn't cover something).

## 2. Find the exact route and existing conventions

This repo may currently contain **specifications only** (check first — don't assume scaffolding
exists). Use Glob/Grep to check for:

- An existing `src/` tree, `package.json`, and component/page directories matching the planned
  layout in `TECHNICAL_IMPLEMENTATION.md` §5.1 (`src/components/`, `src/pages/`, `src/api/`,
  `src/components/tabs/`, etc.).
- Existing components of a similar kind (tables, tabs, badges, forms, dialogs) to match naming,
  file layout, prop conventions, styling approach, and how they consume `@supabase/supabase-js`
  / `@tanstack/react-query` / shadcn/ui primitives.
- Existing role-gating helpers (e.g. `RequireRole`, `useAuth`) and realtime/query-key patterns
  so the new component integrates rather than reinvents.

**If no scaffolding exists yet:** don't silently invent a whole app structure. Tell the user
the frontend hasn't been scaffolded, propose the minimal file(s) needed to place this one
component consistently with §5.1's planned layout, and confirm before creating new
directories/config beyond the component itself.

**If a file with this component's name already exists:** show the user what's there before
overwriting it.

## 3. Build the component

Write it to match what you found in step 2 (or, if unscaffolded, the planned structure in
`TECHNICAL_IMPLEMENTATION.md` §5.1):

- TypeScript, typed props, no `any`.
- shadcn/ui primitives for structure/styling, consistent with the layout conventions in
  `docs/ui_ux_plan.md`.
- Data access via the typed `@supabase/supabase-js` query builder / existing `src/api/*.ts`
  modules — no ad hoc fetch calls, no custom REST layer.
- Mutations wrapped so RLS rejection surfaces as a toast, never assumed to succeed just because
  the UI allowed the click (per CLAUDE.md).
- No comments unless a non-obvious constraint (e.g. an RLS or realtime gotcha) needs explaining.
- No unrelated refactors, no speculative props/abstractions beyond what `$2` actually requires.

## 4. Invoke the UI/UX reviewer subagent and test the component functionality using playright
- test the component using the subagent
- take the feedback from the ui reviewer and improve the functionality of the component 


## 5. Report back

Tell the user: the file path you created/modified, which screen/route it's wired into (or that
it's a standalone component pending wiring — say which parent it should be dropped into and why
you didn't do that yourself if it wasn't obvious), and its permission behavior. Keep it to a few
sentences.
