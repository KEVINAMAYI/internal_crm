import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildActivity } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { createActivity, listActivities } from './activities'

beforeEach(() => mockSupabase.__reset())

describe('listActivities', () => {
  it('scopes to the merchant and orders newest first', async () => {
    const activity = buildActivity()
    mockSupabase.__setTableResult('activities', { data: [activity], error: null })
    const builder = mockSupabase.from('activities')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listActivities('merchant-1')

    expect(result).toEqual([activity])
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['merchant_id', 'merchant-1'] })
    expect(builder._calls).toContainEqual({ method: 'order', args: ['created_at', { ascending: false }] })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('activities', { data: null, error: { message: 'denied' } })
    await expect(listActivities('merchant-1')).rejects.toEqual({ message: 'denied' })
  })
})

describe('createActivity', () => {
  it('inserts and returns the created activity', async () => {
    const activity = buildActivity()
    mockSupabase.__setTableResult('activities', { data: activity, error: null })

    const result = await createActivity({ merchant_id: 'merchant-1', body: activity.body })

    expect(result).toEqual(activity)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('activities', { data: null, error: { message: 'denied' } })
    await expect(createActivity({ merchant_id: 'merchant-1', body: 'x' })).rejects.toEqual({ message: 'denied' })
  })
})
