import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { globalSearch } from './search'

beforeEach(() => mockSupabase.__reset())

describe('globalSearch', () => {
  it('returns empty result sets without querying when q is blank', async () => {
    const result = await globalSearch('   ')

    expect(result).toEqual({ merchants: [], tickets: [], tasks: [] })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('queries merchants, tickets, and tasks in parallel and shapes the result', async () => {
    mockSupabase.__setTableResult('merchants', { data: [{ id: 'm1', legal_name: 'Acme' }], error: null })
    mockSupabase.__setTableResult('support_tickets', { data: [{ id: 't1', subject: 'Help' }], error: null })
    mockSupabase.__setTableResult('tasks', { data: [{ id: 'k1', title: 'Follow up' }], error: null })

    const result = await globalSearch('acme')

    expect(result.merchants).toEqual([{ id: 'm1', legal_name: 'Acme' }])
    expect(result.tickets).toEqual([{ id: 't1', subject: 'Help' }])
    expect(result.tasks).toEqual([{ id: 'k1', title: 'Follow up' }])
    expect(mockSupabase.from).toHaveBeenCalledWith('merchants')
    expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets')
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
  })

  it('defaults each result to an empty array when data is null', async () => {
    mockSupabase.__setDefaultResult({ data: null, error: null })
    const result = await globalSearch('acme')
    expect(result).toEqual({ merchants: [], tickets: [], tasks: [] })
  })

  it('throws if the merchants query fails', async () => {
    mockSupabase.__setTableResult('merchants', { data: null, error: { message: 'merchants denied' } })
    await expect(globalSearch('acme')).rejects.toEqual({ message: 'merchants denied' })
  })

  it('throws if the tickets query fails', async () => {
    mockSupabase.__setTableResult('support_tickets', { data: null, error: { message: 'tickets denied' } })
    await expect(globalSearch('acme')).rejects.toEqual({ message: 'tickets denied' })
  })

  it('throws if the tasks query fails', async () => {
    mockSupabase.__setTableResult('tasks', { data: null, error: { message: 'tasks denied' } })
    await expect(globalSearch('acme')).rejects.toEqual({ message: 'tasks denied' })
  })
})
