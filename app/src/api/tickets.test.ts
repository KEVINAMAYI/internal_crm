import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTicket } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { createTicket, listTicketQueue, listTicketsForMerchant, updateTicket } from './tickets'

beforeEach(() => mockSupabase.__reset())

describe('listTicketsForMerchant', () => {
  it('scopes to the merchant and orders by created_at desc', async () => {
    const ticket = buildTicket()
    mockSupabase.__setTableResult('support_tickets', { data: [ticket], error: null })
    const builder = mockSupabase.from('support_tickets')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listTicketsForMerchant('merchant-1')

    expect(result).toEqual([ticket])
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['merchant_id', 'merchant-1'] })
    expect(builder._calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: false }] })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: null, error: { message: 'denied' } })
    await expect(listTicketsForMerchant('merchant-1')).rejects.toEqual({ message: 'denied' })
  })
})

describe('listTicketQueue', () => {
  it('applies status/priority/assignee filters and returns data + count', async () => {
    const ticket = buildTicket()
    mockSupabase.__setTableResult('support_tickets', { data: [ticket], error: null, count: 1 })
    const builder = mockSupabase.from('support_tickets')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listTicketQueue({ status: 'open', priority: 'high', assigneeId: 'user-1' })

    expect(result).toEqual({ data: [ticket], count: 1 })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['status', 'open'] })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['priority', 'high'] })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['assignee_id', 'user-1'] })
  })

  it('omits filters that are not provided', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('support_tickets')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTicketQueue({})

    expect(builder._calls.filter((c) => c.method === 'eq')).toHaveLength(0)
  })

  it('defaults to an empty array/zero count', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: null, error: null, count: null })
    const result = await listTicketQueue({})
    expect(result).toEqual({ data: [], count: 0 })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: null, error: { message: 'denied' }, count: null })
    await expect(listTicketQueue({})).rejects.toEqual({ message: 'denied' })
  })
})

describe('createTicket', () => {
  it('inserts and returns the created ticket', async () => {
    const ticket = buildTicket()
    mockSupabase.__setTableResult('support_tickets', { data: ticket, error: null })

    const result = await createTicket({ merchant_id: 'merchant-1', subject: ticket.subject, created_by: 'user-1' })

    expect(result).toEqual(ticket)
  })

  it('throws when a sales user attempts to create a ticket (RLS rejection)', async () => {
    mockSupabase.__setTableResult('support_tickets', {
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })

    await expect(
      createTicket({ merchant_id: 'merchant-1', subject: 'x', created_by: 'sales-user' }),
    ).rejects.toMatchObject({ message: expect.stringContaining('row-level security') })
  })
})

describe('updateTicket', () => {
  it('updates and returns the patched ticket', async () => {
    const ticket = buildTicket({ status: 'resolved' })
    mockSupabase.__setTableResult('support_tickets', { data: ticket, error: null })

    const result = await updateTicket(ticket.id, { status: 'resolved' })

    expect(result).toEqual(ticket)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: null, error: { message: 'denied' } })
    await expect(updateTicket('id', { status: 'closed' })).rejects.toEqual({ message: 'denied' })
  })
})
