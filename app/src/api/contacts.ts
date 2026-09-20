import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ContactRow = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']

export async function listContacts(merchantId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createContact(input: ContactInsert) {
  const { data, error } = await supabase.from('contacts').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateContact(id: string, patch: ContactUpdate) {
  const { data, error } = await supabase.from('contacts').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw error
}
