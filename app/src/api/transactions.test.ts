import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransaction } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { listTransactions } from './transactions'

beforeEach(() => mockSupabase.__reset())

// Per CLAUDE.md, transactions are read-only to every app role — this module only ever
// performs a `select`; there is intentionally no create/update/delete API to test.
describe('listTransactions', () => {
  it('scopes the query to the given merchant and returns data/count', async () => {
    const txn = buildTransaction()
    mockSupabase.__setTableResult('transactions', { data: [txn], error: null, count: 1 })
    const builder = mockSupabase.from('transactions')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listTransactions('merchant-1', {})

    expect(result).toEqual({ data: [txn], count: 1 })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['merchant_id', 'merchant-1'] })
  })

  it('applies status/from/to filters when provided', async () => {
    mockSupabase.__setTableResult('transactions', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('transactions')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTransactions('merchant-1', { status: 'settled', from: '2026-01-01', to: '2026-01-31' })

    expect(builder._calls).toContainEqual({ method: 'eq', args: ['status', 'settled'] })
    expect(builder._calls).toContainEqual({ method: 'gte', args: ['processed_at', '2026-01-01'] })
    expect(builder._calls).toContainEqual({ method: 'lte', args: ['processed_at', '2026-01-31'] })
  })

  it('paginates via range', async () => {
    mockSupabase.__setTableResult('transactions', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('transactions')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTransactions('merchant-1', { page: 1, pageSize: 25 })

    expect(builder._calls).toContainEqual({ method: 'range', args: [25, 49] })
  })

  it('defaults to an empty array/zero count', async () => {
    mockSupabase.__setTableResult('transactions', { data: null, error: null, count: null })
    const result = await listTransactions('merchant-1', {})
    expect(result).toEqual({ data: [], count: 0 })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('transactions', { data: null, error: { message: 'denied' }, count: null })
    await expect(listTransactions('merchant-1', {})).rejects.toEqual({ message: 'denied' })
  })
})
