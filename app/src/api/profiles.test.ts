import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProfile } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { getProfile, listProfiles, updateProfile } from './profiles'

beforeEach(() => mockSupabase.__reset())

describe('listProfiles', () => {
  it('orders by full_name and returns the list', async () => {
    const profile = buildProfile()
    mockSupabase.__setTableResult('profiles', { data: [profile], error: null })
    const builder = mockSupabase.from('profiles')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listProfiles()

    expect(result).toEqual([profile])
    expect(builder._calls).toContainEqual({ method: 'order', args: ['full_name'] })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('profiles', { data: null, error: { message: 'denied' } })
    await expect(listProfiles()).rejects.toEqual({ message: 'denied' })
  })
})

describe('getProfile', () => {
  it('returns the profile matching the id', async () => {
    const profile = buildProfile()
    mockSupabase.__setTableResult('profiles', { data: profile, error: null })
    const result = await getProfile(profile.id)
    expect(result).toEqual(profile)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('profiles', { data: null, error: { message: 'not found' } })
    await expect(getProfile('missing')).rejects.toEqual({ message: 'not found' })
  })
})

describe('updateProfile', () => {
  it('updates and returns the patched profile (e.g. admin changing a role)', async () => {
    const profile = buildProfile({ role: 'ops' })
    mockSupabase.__setTableResult('profiles', { data: profile, error: null })

    const result = await updateProfile(profile.id, { role: 'ops' })

    expect(result).toEqual(profile)
  })

  it('throws when a non-admin attempts the update (RLS rejection)', async () => {
    mockSupabase.__setTableResult('profiles', {
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })

    await expect(updateProfile('id', { role: 'admin' })).rejects.toMatchObject({
      message: expect.stringContaining('row-level security'),
    })
  })
})
