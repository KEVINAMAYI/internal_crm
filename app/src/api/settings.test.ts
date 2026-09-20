import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { getSystemSettings, updateSystemSettings, type SystemSettingsRow } from './settings'

function buildSettingsRow(overrides: Partial<SystemSettingsRow> = {}): SystemSettingsRow {
  return {
    id: 1,
    default_ticket_priority: 'normal',
    sla_urgent_hours: 4,
    sla_high_hours: 8,
    sla_normal_hours: 24,
    sla_low_hours: 72,
    sla_urgent_enabled: true,
    sla_high_enabled: true,
    sla_normal_enabled: true,
    sla_low_enabled: false,
    notify_channel: 'email',
    notify_new_ticket_enabled: false,
    notify_task_due_soon_enabled: false,
    notify_ticket_sla_breach_enabled: false,
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by: null,
    ...overrides,
  } as SystemSettingsRow
}

beforeEach(() => mockSupabase.__reset())

describe('getSystemSettings', () => {
  it('fetches the singleton row (id=1)', async () => {
    const row = buildSettingsRow()
    mockSupabase.__setTableResult('system_settings', { data: row, error: null })
    const builder = mockSupabase.from('system_settings')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await getSystemSettings()

    expect(result).toEqual(row)
    expect(mockSupabase.from).toHaveBeenCalledWith('system_settings')
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['id', 1] })
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('system_settings', { data: null, error: { message: 'denied' } })
    await expect(getSystemSettings()).rejects.toEqual({ message: 'denied' })
  })
})

describe('updateSystemSettings', () => {
  it('updates the singleton row and returns the patched row', async () => {
    const row = buildSettingsRow({ sla_urgent_hours: 2 })
    mockSupabase.__setTableResult('system_settings', { data: row, error: null })
    const builder = mockSupabase.from('system_settings')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await updateSystemSettings({ sla_urgent_hours: 2 })

    expect(result).toEqual(row)
    expect(builder._calls).toContainEqual({ method: 'update', args: [{ sla_urgent_hours: 2 }] })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['id', 1] })
  })

  it('throws on RLS rejection (e.g. non-admin role attempting to write system_settings)', async () => {
    mockSupabase.__setTableResult('system_settings', {
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })

    await expect(updateSystemSettings({ sla_urgent_hours: 2 })).rejects.toMatchObject({
      message: expect.stringContaining('row-level security'),
    })
  })
})
