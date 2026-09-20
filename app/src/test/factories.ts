import type { ActivityRow } from '@/api/activities'
import type { ContactRow } from '@/api/contacts'
import type { MerchantRow } from '@/api/merchants'
import type { ProfileRow } from '@/api/profiles'
import type { TaskRow } from '@/api/tasks'
import type { TicketRow } from '@/api/tickets'
import type { TransactionRow } from '@/api/transactions'

let seq = 0
function nextId(prefix: string) {
  seq += 1
  return `${prefix}-${seq}`
}

export function buildProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: nextId('profile'),
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'sales',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ProfileRow
}

export function buildMerchant(overrides: Partial<MerchantRow> = {}): MerchantRow {
  return {
    id: nextId('merchant'),
    legal_name: 'Acme Corp',
    dba_name: 'Acme',
    mcc: '5411',
    status: 'active',
    owner_id: 'owner-1',
    country: 'US',
    website: 'https://acme.example',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as MerchantRow
}

export function buildContact(overrides: Partial<ContactRow> = {}): ContactRow {
  return {
    id: nextId('contact'),
    merchant_id: 'merchant-1',
    name: 'John Contact',
    email: 'john@example.com',
    phone: '555-0100',
    title: 'Owner',
    is_primary: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ContactRow
}

export function buildTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: nextId('txn'),
    merchant_id: 'merchant-1',
    amount_cents: 12345,
    currency: 'USD',
    status: 'settled',
    external_id: 'ext-1',
    processed_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TransactionRow
}

export function buildTicket(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: nextId('ticket'),
    merchant_id: 'merchant-1',
    subject: 'Payout delayed',
    description: 'Merchant reports a delayed payout.',
    status: 'open',
    priority: 'normal',
    assignee_id: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TicketRow
}

export function buildActivity(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: nextId('activity'),
    merchant_id: 'merchant-1',
    author_id: 'user-1',
    type: 'note',
    body: 'Called the merchant about renewal.',
    ticket_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ActivityRow
}

export function buildTask(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: nextId('task'),
    title: 'Follow up on onboarding',
    notes: null,
    status: 'todo',
    due_date: '2026-02-01',
    assignee_id: 'user-1',
    created_by: 'user-1',
    merchant_id: 'merchant-1',
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TaskRow
}
