import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

export type SystemSettingsRow = Database['public']['Tables']['system_settings']['Row']
export type SystemSettingsUpdate = Database['public']['Tables']['system_settings']['Update']

export async function getSystemSettings() {
  const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updateSystemSettings(patch: SystemSettingsUpdate) {
  const { data, error } = await supabase
    .from('system_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single()
  if (error) throw error
  return data
}
