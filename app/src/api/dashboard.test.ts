import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildActivity } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { getDashboardSummary, getRecentActivity } from './dashboard'

beforeEach(() => mockSupabase.__reset())

describe('getDashboardSummary', () => {
  it('returns the single RPC row on success', async () => {
    const summary = {
      merchant_count: 10,
      active_merchant_count: 6,
      open_ticket_count: 4,
      open_tickets_low: 1,
      open_tickets_normal: 1,
      open_tickets_high: 1,
      open_tickets_urgent: 1,
      overdue_task_count: 2,
    }
    mockSupabase.__setRpcResult({ data: summary, error: null })

    const result = await getDashboardSummary()

    expect(result).toEqual(summary)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('dashboard_summary')
  })

  it('throws when the RPC is rejected (e.g. non admin/ops role, 42501)', async () => {
    mockSupabase.__setRpcResult({ data: null, error: { message: 'permission denied', code: '42501' } })

    await expect(getDashboardSummary()).rejects.toEqual({ message: 'permission denied', code: '42501' })
  })
})

describe('getRecentActivity', () => {
  it('fetches recent activity with embedded merchant/author, ordered and limited', async () => {
    const activity = buildActivity()
    mockSupabase.__setTableResult('activities', { data: [activity], error: null })
    const builder = mockSupabase.from('activities')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await getRecentActivity()

    expect(result).toEqual([activity])
    expect(mockSupabase.from).toHaveBeenCalledWith('activities')
    const orderCall = builder._calls.find((c) => c.method === 'order')
    expect(orderCall?.args).toEqual(['created_at', { ascending: false }])
    const limitCall = builder._calls.find((c) => c.method === 'limit')
    expect(limitCall?.args).toEqual([20])
  })

  it('passes a custom limit through to the query', async () => {
    mockSupabase.__setTableResult('activities', { data: [], error: null })
    const builder = mockSupabase.from('activities')
    mockSupabase.from.mockReturnValueOnce(builder)

    await getRecentActivity(5)

    const limitCall = builder._calls.find((c) => c.method === 'limit')
    expect(limitCall?.args).toEqual([5])
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('activities', { data: null, error: { message: 'denied' } })
    await expect(getRecentActivity()).rejects.toEqual({ message: 'denied' })
  })
})
