import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type TransactionRow = Database['public']['Tables']['transactions']['Row']
export type TxnStatus = Database['public']['Enums']['txn_status']

export const TRANSACTION_PAGE_SIZE = 25

export async function listTransactions(
  merchantId: string,
  params: { page?: number; pageSize?: number; status?: TxnStatus; from?: string; to?: string },
) {
  const { page = 0, pageSize = TRANSACTION_PAGE_SIZE, status, from, to } = params
  let query = supabase
    .from('transactions')
    .select('id, amount_cents, currency, status, external_id, processed_at', { count: 'exact' })
    .eq('merchant_id', merchantId)
    .order('processed_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('processed_at', from)
  if (to) query = query.lte('processed_at', to)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}
