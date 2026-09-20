import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildContact } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { createContact, deleteContact, listContacts, updateContact } from './contacts'

beforeEach(() => mockSupabase.__reset())

describe('listContacts', () => {
  it('orders primary contacts first, then by name', async () => {
    const contacts = [buildContact()]
    mockSupabase.__setTableResult('contacts', { data: contacts, error: null })
    const builder = mockSupabase.from('contacts')
    mockSupabase.from.mockReturnValueOnce(builder)

    const result = await listContacts('merchant-1')

    expect(result).toEqual(contacts)
    const orderCalls = builder._calls.filter((c) => c.method === 'order')
    expect(orderCalls[0].args).toEqual(['is_primary', { ascending: false }])
    expect(orderCalls[1].args).toEqual(['name', { ascending: true }])
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('contacts', { data: null, error: { message: 'denied' } })
    await expect(listContacts('merchant-1')).rejects.toEqual({ message: 'denied' })
  })
})

describe('createContact', () => {
  it('inserts and returns the created contact', async () => {
    const contact = buildContact()
    mockSupabase.__setTableResult('contacts', { data: contact, error: null })

    const result = await createContact({ merchant_id: 'merchant-1', name: contact.name })

    expect(result).toEqual(contact)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('contacts', { data: null, error: { message: 'denied' } })
    await expect(createContact({ merchant_id: 'merchant-1', name: 'X' })).rejects.toEqual({ message: 'denied' })
  })
})

describe('updateContact', () => {
  it('updates and returns the patched contact', async () => {
    const contact = buildContact({ title: 'CFO' })
    mockSupabase.__setTableResult('contacts', { data: contact, error: null })

    const result = await updateContact(contact.id, { title: 'CFO' })

    expect(result).toEqual(contact)
  })
})

describe('deleteContact', () => {
  it('resolves with no return value on success', async () => {
    mockSupabase.__setTableResult('contacts', { data: null, error: null })
    await expect(deleteContact('contact-1')).resolves.toBeUndefined()
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('contacts', { data: null, error: { message: 'denied' } })
    await expect(deleteContact('contact-1')).rejects.toEqual({ message: 'denied' })
  })
})
