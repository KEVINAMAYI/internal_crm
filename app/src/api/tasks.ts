import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']
export type TaskStatus = Database['public']['Enums']['task_status']

export type TaskView = 'mine' | 'assignedByMe' | 'team' | 'unlinked'

const TASK_SELECT =
  '*, assignee:profiles!tasks_assignee_id_fkey(id, full_name), merchant:merchants(id, legal_name, dba_name)'

export type TaskListFilters = {
  view: TaskView
  userId: string
  status?: TaskStatus
  merchantId?: string
  overdueOnly?: boolean
}

export async function listTasks(filters: TaskListFilters) {
  const { view, userId, status, merchantId, overdueOnly } = filters
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (view === 'mine') query = query.eq('assignee_id', userId)
  if (view === 'assignedByMe') query = query.eq('created_by', userId)
  if (view === 'unlinked') query = query.is('merchant_id', null)

  if (overdueOnly) {
    query = query.lt('due_date', new Date().toISOString().slice(0, 10)).not('status', 'in', '(done,cancelled)')
  } else if (status) {
    query = query.eq('status', status)
  }
  if (merchantId) query = query.eq('merchant_id', merchantId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createTask(input: TaskInsert) {
  const { data, error } = await supabase.from('tasks').insert(input).select(TASK_SELECT).single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, patch: TaskUpdate) {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select(TASK_SELECT).single()
  if (error) throw error
  return data
}
