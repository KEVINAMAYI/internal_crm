import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type MerchantStatus = Database['public']['Enums']['merchant_status']
export type MerchantRow = Database['public']['Tables']['merchants']['Row']
export type MerchantInsert = Database['public']['Tables']['merchants']['Insert']
export type MerchantUpdate = Database['public']['Tables']['merchants']['Update']

export const MERCHANT_PAGE_SIZE = 25

export type MerchantListItem = MerchantRow & { owner: { full_name: string } | null }

export async function listMerchants(params: {
  q?: string
  status?: string
  owner?: string
  page?: number
  pageSize?: number
}) {
  const { q, status, owner, page = 0, pageSize = MERCHANT_PAGE_SIZE } = params
  let query = supabase
    .from('merchants')
    .select('id, legal_name, dba_name, mcc, status, owner_id, country, updated_at, owner:profiles(full_name)', {
      count: 'exact',
    })
    .order('updated_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (q) query = query.or(`legal_name.ilike.%${q}%,dba_name.ilike.%${q}%`)
  if (status) query = query.eq('status', status as MerchantStatus)
  if (owner) query = query.eq('owner_id', owner)

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data ?? []) as unknown as MerchantListItem[], count: count ?? 0 }
}

export async function getMerchant(id: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*, contacts(*), owner:profiles(id, full_name, email)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getMerchantSummary(merchantId: string) {
  const { data, error } = await supabase.rpc('merchant_summary', { p_merchant_id: merchantId })
  if (error) throw error
  return data?.[0] ?? { txn_count: 0, volume_cents: 0, open_tickets: 0 }
}

export async function createMerchant(input: MerchantInsert) {
  const { data, error } = await supabase.from('merchants').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateMerchant(id: string, patch: MerchantUpdate) {
  const { data, error } = await supabase.from('merchants').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
