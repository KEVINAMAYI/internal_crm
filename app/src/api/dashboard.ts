import { supabase } from '@/lib/supabase'

export type DashboardSummary = {
  merchant_count: number
  active_merchant_count: number
  open_ticket_count: number
  open_tickets_low: number
  open_tickets_normal: number
  open_tickets_high: number
  open_tickets_urgent: number
  overdue_task_count: number
}

export async function getDashboardSummary() {
  const { data, error } = await supabase.rpc('dashboard_summary').single()
  if (error) throw error
  return data as DashboardSummary
}

const RECENT_ACTIVITY_SELECT =
  '*, merchant:merchants(id, legal_name, dba_name), author:profiles(id, full_name)'

export async function getRecentActivity(limit = 20) {
  const { data, error } = await supabase
    .from('activities')
    .select(RECENT_ACTIVITY_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
