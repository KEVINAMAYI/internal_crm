import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMerchant } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { createMerchant, getMerchant, getMerchantSummary, listMerchants, updateMerchant } from './merchants'

describe('listMerchants', () => {
  beforeEach(() => {
    mockSupabase.__reset()
  })

  it('returns data and count on success', async () => {
    const merchant = buildMerchant()
    mockSupabase.__setTableResult('merchants', { data: [merchant], error: null, count: 1 })

    const result = await listMerchants({ page: 0 })

    expect(result).toEqual({ data: [merchant], count: 1 })
    expect(mockSupabase.from).toHaveBeenCalledWith('merchants')
  })

  it('applies an ilike filter across legal_name/dba_name when q is provided', async () => {
    mockSupabase.__setTableResult('merchants', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('merchants')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listMerchants({ q: 'acme', page: 0 })

    const orCall = builder._calls.find((c) => c.method === 'or')
    expect(orCall?.args[0]).toContain('acme')
  })

  it('filters by status and owner when provided', async () => {
    mockSupabase.__setTableResult('merchants', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('merchants')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listMerchants({ status: 'active', owner: 'owner-1', page: 0 })

    const eqCalls = builder._calls.filter((c) => c.method === 'eq')
    expect(eqCalls).toContainEqual({ method: 'eq', args: ['status', 'active'] })
    expect(eqCalls).toContainEqual({ method: 'eq', args: ['owner_id', 'owner-1'] })
  })

  it('paginates using range based on page and pageSize', async () => {
    mockSupabase.__setTableResult('merchants', { data: [], error: null, count: 0 })
    const builder = mockSupabase.from('merchants')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listMerchants({ page: 2, pageSize: 10 })

    const rangeCall = builder._calls.find((c) => c.method === 'range')
    expect(rangeCall?.args).toEqual([20, 29])
  })

  it('defaults to an empty array/zero count when data/count are null', async () => {
    mockSupabase.__setTableResult('merchants', { data: null, error: null, count: null })

    const result = await listMerchants({ page: 0 })

    expect(result).toEqual({ data: [], count: 0 })
  })

  it('throws the Supabase error when the query fails', async () => {
    mockSupabase.__setTableResult('merchants', { data: null, error: { message: 'RLS denied' }, count: null })

    await expect(listMerchants({ page: 0 })).rejects.toEqual({ message: 'RLS denied' })
  })
})

describe('getMerchant', () => {
  beforeEach(() => mockSupabase.__reset())

  it('fetches a single merchant with embedded contacts/owner', async () => {
    const merchant = buildMerchant()
    mockSupabase.__setTableResult('merchants', { data: merchant, error: null })

    const result = await getMerchant(merchant.id)

    expect(result).toEqual(merchant)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('merchants', { data: null, error: { message: 'not found' } })
    await expect(getMerchant('missing')).rejects.toEqual({ message: 'not found' })
  })
})

describe('getMerchantSummary', () => {
  beforeEach(() => mockSupabase.__reset())

  it('returns the first row from the RPC result', async () => {
    mockSupabase.__setRpcResult({ data: [{ txn_count: 5, volume_cents: 1000, open_tickets: 2 }], error: null })

    const result = await getMerchantSummary('merchant-1')

    expect(result).toEqual({ txn_count: 5, volume_cents: 1000, open_tickets: 2 })
    expect(mockSupabase.rpc).toHaveBeenCalledWith('merchant_summary', { p_merchant_id: 'merchant-1' })
  })

  it('returns a zeroed default when the RPC returns no rows', async () => {
    mockSupabase.__setRpcResult({ data: [], error: null })

    const result = await getMerchantSummary('merchant-1')

    expect(result).toEqual({ txn_count: 0, volume_cents: 0, open_tickets: 0 })
  })

  it('throws when the RPC errors', async () => {
    mockSupabase.__setRpcResult({ data: null, error: { message: 'denied' } })
    await expect(getMerchantSummary('merchant-1')).rejects.toEqual({ message: 'denied' })
  })
})

describe('createMerchant', () => {
  beforeEach(() => mockSupabase.__reset())

  it('inserts and returns the created row', async () => {
    const merchant = buildMerchant()
    mockSupabase.__setTableResult('merchants', { data: merchant, error: null })

    const result = await createMerchant({ legal_name: merchant.legal_name })

    expect(result).toEqual(merchant)
  })

  it('throws on RLS rejection (e.g. support role creating a merchant)', async () => {
    mockSupabase.__setTableResult('merchants', {
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })

    await expect(createMerchant({ legal_name: 'X' })).rejects.toMatchObject({
      message: expect.stringContaining('row-level security'),
    })
  })
})

describe('updateMerchant', () => {
  beforeEach(() => mockSupabase.__reset())

  it('updates and returns the patched row', async () => {
    const merchant = buildMerchant({ status: 'suspended' })
    mockSupabase.__setTableResult('merchants', { data: merchant, error: null })

    const result = await updateMerchant(merchant.id, { status: 'suspended' })

    expect(result).toEqual(merchant)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('merchants', { data: null, error: { message: 'denied' } })
    await expect(updateMerchant('id', { status: 'active' })).rejects.toEqual({ message: 'denied' })
  })
})
