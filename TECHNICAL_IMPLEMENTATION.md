# Merchant CRM — Technical Implementation Plan

An internal, merchant-centric CRM for a payments processor. Provides Sales, Support,
and Ops teams a single view of each merchant: profile, contacts, read-only
transaction history, support tickets, activity/notes, and tasks.

**Stack:** Supabase (Postgres + Auth + Row-Level Security + auto-generated REST/Realtime APIs)
on the backend, React (Vite + TypeScript) on the frontend.

**Design principle:** minimal surface area, normalized data, security enforced at the
database layer (RLS) so the frontend cannot bypass authorization.

---

## 1. Architecture Overview

```
┌──────────────────────────── React SPA (Vite + TS) ────────────────────────────┐
│  Auth (Supabase JS) → Merchant List → Merchant Detail (tabs)                    │
│  Data: @tanstack/react-query + @supabase/supabase-js client                     │
└───────────────┬────────────────────────────────────────────────────────────────┘
                │  HTTPS (JWT bearer)  +  WebSocket (Realtime)
┌───────────────▼────────────────────────────────────────────────────────────────┐
│                                 Supabase                                          │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │  GoTrue  │  │  PostgREST   │  │  Realtime (WS)     │  │  Edge Functions    │  │
│  │  (Auth)  │  │  (REST API)  │  │  (live updates)    │  │  (txn ingest, opt) │  │
│  └────┬─────┘  └──────┬───────┘  └─────────┬──────────┘  └─────────┬──────────┘  │
│       └───────────────┴────────────┬───────┴───────────────────────┘             │
│                          Postgres + Row-Level Security                            │
└──────────────────────────────────────────────────────────────────────────────────┘
                                     ▲
                     Transactions ingested by external payments
                     system → service_role writes (read-only to app)
```

Key ideas:
- The React app talks **directly** to Supabase via PostgREST; RLS is the authorization boundary.
- **Transactions are read-only** to all app users — written only by a backend ingestion
  path using the `service_role` key (Edge Function, batch job, or DB replication).
- **Roles** (`sales`, `support`, `ops`, `admin`) are stored on a `profiles` row and
  surfaced in the JWT via a custom access-token hook, so RLS policies can read them cheaply.

---

## 2. Data Model (Normalized Relational Schema)

Entities: **Merchant, Contact, Transaction (read-only), SupportTicket, Activity/Note, Task**,
plus supporting **profiles** (app users) and enums.

### 2.1 Enums

```sql
create type user_role       as enum ('sales', 'support', 'ops', 'admin');
create type merchant_status as enum ('lead', 'onboarding', 'active', 'suspended', 'churned');
create type ticket_status   as enum ('open', 'pending', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type task_status     as enum ('todo', 'in_progress', 'done', 'cancelled');
create type txn_status      as enum ('pending', 'settled', 'refunded', 'failed', 'chargeback');
create type activity_type   as enum ('note', 'call', 'email', 'meeting', 'system');
```

### 2.2 Tables

```sql
-- App users (mirrors auth.users). Role drives RLS + UI.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        user_role not null default 'support',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Core merchant record. Optionally owned by a Sales rep.
create table merchants (
  id            uuid primary key default gen_random_uuid(),
  legal_name    text not null,
  dba_name      text,
  mcc           text,                              -- merchant category code
  status        merchant_status not null default 'lead',
  owner_id      uuid references profiles(id),      -- assigned Sales rep
  website       text,
  country       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on merchants (status);
create index on merchants (owner_id);
create index on merchants using gin (to_tsvector('simple',
  coalesce(legal_name,'') || ' ' || coalesce(dba_name,'')));   -- search

-- One merchant → many contacts.
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  title        text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on contacts (merchant_id);

-- Read-only to the app. Written only by service_role ingestion.
create table transactions (
  id             uuid primary key default gen_random_uuid(),
  merchant_id    uuid not null references merchants(id) on delete restrict,
  external_id    text unique,                      -- id from payments system (idempotency)
  amount_cents   bigint not null,
  currency       char(3) not null default 'USD',
  status         txn_status not null,
  processed_at   timestamptz not null,
  created_at     timestamptz not null default now()
);
create index on transactions (merchant_id, processed_at desc);

create table support_tickets (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  subject      text not null,
  description  text,
  status       ticket_status not null default 'open',
  priority     ticket_priority not null default 'normal',
  assignee_id  uuid references profiles(id),
  created_by   uuid not null references profiles(id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on support_tickets (merchant_id, status);
create index on support_tickets (assignee_id);

-- Activity feed / notes. Polymorphic-lite: always tied to a merchant,
-- optionally references a ticket for context.
create table activities (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  ticket_id    uuid references support_tickets(id) on delete set null,
  type         activity_type not null default 'note',
  body         text not null,
  author_id    uuid not null references profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index on activities (merchant_id, created_at desc);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  title        text not null,
  notes        text,
  status       task_status not null default 'todo',
  due_date     date,
  assignee_id  uuid references profiles(id),
  created_by   uuid not null references profiles(id) default auth.uid(),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index on tasks (assignee_id, status);
create index on tasks (merchant_id);
```

### 2.3 Relationships (ER summary)

```
profiles 1──* merchants (owner_id)
merchant 1──* contacts
merchant 1──* transactions        (read-only)
merchant 1──* support_tickets ──* activities (optional ticket_id link)
merchant 1──* activities
merchant 1──* tasks
profiles 1──* {tickets.assignee, tasks.assignee, activities.author, ...}
```

### 2.4 `updated_at` trigger

```sql
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_merchants_updated  before update on merchants
  for each row execute function set_updated_at();
create trigger trg_tickets_updated    before update on support_tickets
  for each row execute function set_updated_at();
```

---

## 3. Auth & Role Model

### 3.1 Roles

| Role      | Merchants           | Contacts | Transactions | Tickets              | Activities        | Tasks                |
|-----------|---------------------|----------|--------------|----------------------|-------------------|----------------------|
| **sales** | R/W (own + all read)| R/W      | R            | R                    | R/W (own author)  | R/W (own/assigned)   |
| **support**| R                  | R        | R            | R/W                  | R/W               | R/W                  |
| **ops**   | R/W                 | R/W      | R            | R/W                  | R/W               | R/W                  |
| **admin** | Full                | Full     | R (+ ingest via service_role) | Full | Full          | Full                 |

Everyone can **read** every merchant (internal tool, merchant-centric visibility is the point).
Write scoping keeps changes accountable. Transactions are **read-only for all roles** — the
only writer is the ingestion path using `service_role`, which bypasses RLS.

### 3.2 Putting role in the JWT (custom access token hook)

```sql
-- Runs on token issue; injects role claim so RLS avoids a profiles lookup per query.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare claims jsonb; user_role user_role;
begin
  select role into user_role from public.profiles where id = (event->>'user_id')::uuid;
  claims := event->'claims';
  claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(coalesce(user_role,'support')));
  return jsonb_set(event, '{claims}', claims);
end $$;
-- Enable in Dashboard → Auth → Hooks (Custom Access Token).
```

Helper used by policies:

```sql
create or replace function auth.role_name() returns user_role
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role')::user_role,
    'support'
  );
$$;
```

### 3.3 Auto-provision profile on signup

```sql
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.4 Row-Level Security policies (representative)

Enable RLS on every table, then:

```sql
alter table merchants        enable row level security;
alter table contacts         enable row level security;
alter table transactions     enable row level security;
alter table support_tickets  enable row level security;
alter table activities       enable row level security;
alter table tasks            enable row level security;
alter table profiles         enable row level security;

-- MERCHANTS: everyone reads; ops/admin or owner writes.
create policy merch_read on merchants for select
  to authenticated using (true);
create policy merch_write on merchants for all
  to authenticated
  using  (auth.role_name() in ('ops','admin') or owner_id = auth.uid())
  with check (auth.role_name() in ('ops','admin') or owner_id = auth.uid());

-- TRANSACTIONS: read-only to all authenticated users. No insert/update/delete policy
-- exists → all writes are denied for anon/authenticated; service_role bypasses RLS.
create policy txn_read on transactions for select
  to authenticated using (true);

-- SUPPORT TICKETS: all read; support/ops/admin write; sales read-only.
create policy tix_read on support_tickets for select
  to authenticated using (true);
create policy tix_write on support_tickets for all
  to authenticated
  using  (auth.role_name() in ('support','ops','admin'))
  with check (auth.role_name() in ('support','ops','admin'));

-- ACTIVITIES: all read; author or ops/admin can modify their own.
create policy act_read  on activities for select to authenticated using (true);
create policy act_insert on activities for insert to authenticated
  with check (author_id = auth.uid());
create policy act_modify on activities for update using
  (author_id = auth.uid() or auth.role_name() in ('ops','admin'));

-- TASKS: all read; creator/assignee/ops/admin write.
create policy task_read  on tasks for select to authenticated using (true);
create policy task_write on tasks for all to authenticated
  using  (auth.role_name() in ('ops','admin')
          or created_by = auth.uid() or assignee_id = auth.uid())
  with check (auth.role_name() in ('ops','admin')
          or created_by = auth.uid() or assignee_id = auth.uid());

-- PROFILES: read all (for assignee pickers); self-update only; admin full.
create policy prof_read on profiles for select to authenticated using (true);
create policy prof_self on profiles for update using (id = auth.uid());
```

---

## 4. APIs / Queries (Supabase-backed)

No custom REST layer needed — PostgREST auto-generates endpoints from the schema, and
`@supabase/supabase-js` gives a typed query builder. Below are the core access patterns.

### 4.1 Client setup

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // generated: `supabase gen types typescript`
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 4.2 Core queries

```ts
// Merchant list with search, status filter, pagination.
export const listMerchants = (q: string, status?: string, page = 0, size = 25) => {
  let query = supabase
    .from('merchants')
    .select('id, legal_name, dba_name, status, owner:profiles(full_name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(page * size, page * size + size - 1);
  if (q)      query = query.or(`legal_name.ilike.%${q}%,dba_name.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  return query;
};

// Merchant detail header + contacts in one round trip (embedded resource).
export const getMerchant = (id: string) =>
  supabase.from('merchants')
    .select('*, contacts(*), owner:profiles(full_name,email)')
    .eq('id', id).single();

// Tab: Activity feed (paginated, newest first).
export const getActivities = (merchantId: string) =>
  supabase.from('activities')
    .select('*, author:profiles(full_name)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

// Tab: Tickets for merchant.
export const getTickets = (merchantId: string) =>
  supabase.from('support_tickets')
    .select('*, assignee:profiles(full_name)')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

// Tab: Transactions (read-only), server-side paginated.
export const getTransactions = (merchantId: string, page = 0, size = 50) =>
  supabase.from('transactions')
    .select('id, amount_cents, currency, status, processed_at', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('processed_at', { ascending: false })
    .range(page * size, page * size + size - 1);

// Mutations (RLS enforces authorization automatically).
export const addNote = (merchantId: string, body: string) =>
  supabase.from('activities').insert({ merchant_id: merchantId, type: 'note', body });

export const createTicket = (t: TicketInsert) =>
  supabase.from('support_tickets').insert(t).select().single();
```

### 4.3 Aggregations via RPC (optional)

For merchant KPIs (30-day volume, txn count) expose a `security definer` SQL function
and call it with `supabase.rpc('merchant_summary', { p_merchant_id })` — keeps heavy
aggregation in Postgres rather than shipping rows to the client.

```sql
create or replace function merchant_summary(p_merchant_id uuid)
returns table (txn_count bigint, volume_cents bigint, open_tickets bigint)
language sql stable security definer as $$
  select
    (select count(*) from transactions t where t.merchant_id = p_merchant_id
        and t.processed_at > now() - interval '30 days'),
    (select coalesce(sum(amount_cents),0) from transactions t
        where t.merchant_id = p_merchant_id and t.status = 'settled'
        and t.processed_at > now() - interval '30 days'),
    (select count(*) from support_tickets s
        where s.merchant_id = p_merchant_id and s.status in ('open','pending'));
$$;
```

### 4.4 Realtime

Subscribe to `activities`, `support_tickets`, and `tasks` for the open merchant so
multiple agents see live updates:

```ts
supabase.channel(`merchant:${id}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'activities', filter: `merchant_id=eq.${id}` },
      () => queryClient.invalidateQueries({ queryKey: ['activities', id] }))
  .subscribe();
```

### 4.5 Transaction ingestion (write path)

Transactions never come from the browser. Options, cheapest first:
1. **Edge Function** (`/functions/ingest-transactions`) invoked by the payments system
   webhook; uses `service_role` client; upserts on `external_id` for idempotency.
2. Scheduled batch (pg_cron + Edge Function) pulling from the processor's API.
3. Logical replication / ETL into the `transactions` table.

```ts
// supabase/functions/ingest-transactions/index.ts (service_role — bypasses RLS)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
await admin.from('transactions').upsert(rows, { onConflict: 'external_id' });
```

---

## 5. React Frontend

### 5.1 Stack & structure

- **Vite + React + TypeScript**, `@supabase/supabase-js`, `@tanstack/react-query`
  (caching + Realtime invalidation), `react-router-dom`, a light component kit
  (e.g. shadcn/ui or MUI). Types generated from the DB schema.

```
src/
  lib/supabase.ts          database.types.ts
  auth/AuthProvider.tsx    RequireRole.tsx
  api/                     merchants.ts  tickets.ts  activities.ts  transactions.ts  tasks.ts
  pages/
    Login.tsx
    MerchantList.tsx
    MerchantDetail.tsx     ← tabs container
  components/
    tabs/ActivityTab.tsx  TicketsTab.tsx  TransactionsTab.tsx  ContactsTab.tsx  TasksTab.tsx
    MerchantHeader.tsx  RoleBadge.tsx  DataTable.tsx
```

### 5.2 Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  Merchant CRM         🔍 search…            [Kevin ▾  role: ops]        │  top bar
├───────────────┬───────────────────────────────────────────────────────┤
│ MERCHANTS     │  Acme Retail LLC   (dba "Acme")     status: ● active    │
│ [🔍 filter]   │  MCC 5411 · owner: J. Rivera · US    [30d vol $482k]    │  header + KPIs
│               ├───────────────────────────────────────────────────────┤
│ ● Acme Retail │  [ Activity ] [ Tickets ] [ Transactions ] [ Tasks ]   │  tabs
│   Blue Café   │ ┌───────────────────────────────────────────────────┐ │
│   Nova SaaS   │ │  ActivityTab: note composer + reverse-chron feed  │ │
│   …           │ │  (author, type badge, timestamp)                  │ │
│ ‹ 1 2 3 ›     │ └───────────────────────────────────────────────────┘ │
└───────────────┴───────────────────────────────────────────────────────┘
```

- **Master–detail:** left `MerchantList` (virtualized/paginated, server-side search
  + status filter); right `MerchantDetail` routed by `/merchants/:id`.
- **Tabs** (`?tab=activity|tickets|transactions|tasks`, deep-linkable), each lazy-loaded
  and independently fetched via react-query:
  - **Activity** — note composer (`type` selector) + realtime feed.
  - **Tickets** — table with status/priority/assignee; create + inline status change (write-gated by role).
  - **Transactions** — **read-only** paginated table; no create/edit affordances at all.
  - **Tasks** — assignable to-dos with due dates.
  - **Contacts** — shown in header panel or its own tab.

### 5.3 Auth & role gating (UI is convenience; RLS is the real gate)

```tsx
// RequireRole hides/disables actions; the DB still enforces via RLS.
const { role } = useAuth();                 // from JWT app_metadata.role
const canEditTickets = ['support','ops','admin'].includes(role);
<Button disabled={!canEditTickets} onClick={createTicket}>New Ticket</Button>
```

- `AuthProvider` wraps `supabase.auth.onAuthStateChange`, exposes `{ user, role }`.
- Protected routes redirect unauthenticated users to `/login` (email/password or SSO via GoTrue).
- Role read from `session.access_token` claims (decoded) — never trusted for security,
  only for showing/hiding controls.

---

## 6. React ↔ Supabase Integration Points

| Concern            | Mechanism                                                                 |
|--------------------|--------------------------------------------------------------------------|
| Auth session       | `supabase.auth` + `onAuthStateChange`; JWT auto-attached to every request |
| Authorization      | **RLS policies** (server-side); `role` claim from custom access-token hook |
| Data fetching      | `supabase-js` query builder wrapped in react-query hooks (cache + retries)|
| Nested reads       | PostgREST embedded resources (`select('*, contacts(*)')`) — one round trip|
| Mutations          | `.insert/.update/.delete`; success invalidates react-query keys           |
| Live updates       | Realtime channel per merchant → `invalidateQueries` on change             |
| Heavy aggregation  | `supabase.rpc()` calling `security definer` SQL functions                  |
| Read-only txns     | No write policy on `transactions`; UI renders no edit controls            |
| Txn ingestion      | Edge Function / batch with `service_role` (bypasses RLS)                   |
| Type safety        | `supabase gen types typescript` → shared `Database` type end-to-end        |

---

## 7. Delivery Plan (minimal → scalable)

1. **Schema & RLS** — run migrations (`supabase/migrations/*.sql`): enums, tables,
   triggers, policies, access-token hook. Seed a few merchants + profiles.
2. **Auth** — enable email/password (or SSO), wire the custom access-token hook,
   verify `role` appears in the JWT.
3. **Frontend shell** — Vite app, `AuthProvider`, protected routing, generated types.
4. **Merchant list + detail** — master-detail with search/filter/pagination.
5. **Tabs** — Activity (write), Tickets (write, role-gated), Transactions (read-only), Tasks.
6. **Realtime + RPC KPIs** — live activity feed, merchant summary tiles.
7. **Ingestion** — Edge Function upserting transactions on `external_id`.

**Scales via:** Postgres indexes + server-side pagination, RLS as a single authorization
source of truth, PostgREST horizontal scaling, and react-query caching. New entities or
roles are additive (new table + policies + tab) without reworking the core.

### 7.1 Not in scope (deliberate cuts for "minimal")

Audit-log tables, field-level encryption, full-text ranking beyond `ilike`/`tsvector`,
bulk import UI, notifications, and analytics dashboards — all layer on later without
schema rework.
```

