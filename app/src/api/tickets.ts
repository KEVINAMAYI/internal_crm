import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type TicketRow = Database['public']['Tables']['support_tickets']['Row']
export type TicketInsert = Database['public']['Tables']['support_tickets']['Insert']
export type TicketUpdate = Database['public']['Tables']['support_tickets']['Update']
export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = Database['public']['Enums']['ticket_priority']

const TICKET_SELECT = '*, assignee:profiles!support_tickets_assignee_id_fkey(id, full_name)'
const TICKET_QUEUE_SELECT =
  '*, assignee:profiles!support_tickets_assignee_id_fkey(id, full_name), merchant:merchants(id, legal_name, dba_name)'

export async function listTicketsForMerchant(merchantId: string) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(TICKET_SELECT)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type TicketQueueFilters = {
  status?: TicketStatus
  priority?: TicketPriority
  assigneeId?: string
  page?: number
  pageSize?: number
}

export const TICKET_QUEUE_PAGE_SIZE = 25

export async function listTicketQueue(filters: TicketQueueFilters) {
  const { status, priority, assigneeId, page = 0, pageSize = TICKET_QUEUE_PAGE_SIZE } = filters
  let query = supabase
    .from('support_tickets')
    .select(TICKET_QUEUE_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (assigneeId) query = query.eq('assignee_id', assigneeId)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createTicket(input: TicketInsert) {
  const { data, error } = await supabase.from('support_tickets').insert(input).select(TICKET_SELECT).single()
  if (error) throw error
  return data
}

export async function updateTicket(id: string, patch: TicketUpdate) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update(patch)
    .eq('id', id)
    .select(TICKET_SELECT)
    .single()
  if (error) throw error
  return data
}
