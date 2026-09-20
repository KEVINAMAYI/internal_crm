import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type ActivityRow = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityType = Database['public']['Enums']['activity_type']

const ACTIVITY_SELECT = '*, author:profiles(id, full_name)'

export async function listActivities(merchantId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createActivity(input: ActivityInsert) {
  const { data, error } = await supabase.from('activities').insert(input).select(ACTIVITY_SELECT).single()
  if (error) throw error
  return data
}
