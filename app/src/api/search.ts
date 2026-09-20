import { supabase } from '@/lib/supabase'

const RESULT_LIMIT = 6

export async function globalSearch(q: string) {
  if (!q.trim()) return { merchants: [], tickets: [], tasks: [] }

  const [merchants, tickets, tasks] = await Promise.all([
    supabase
      .from('merchants')
      .select('id, legal_name, dba_name, status')
      .or(`legal_name.ilike.%${q}%,dba_name.ilike.%${q}%`)
      .limit(RESULT_LIMIT),
    supabase
      .from('support_tickets')
      .select('id, subject, status, merchant_id, merchant:merchants(legal_name)')
      .ilike('subject', `%${q}%`)
      .limit(RESULT_LIMIT),
    supabase
      .from('tasks')
      .select('id, title, status, merchant_id')
      .ilike('title', `%${q}%`)
      .limit(RESULT_LIMIT),
  ])

  if (merchants.error) throw merchants.error
  if (tickets.error) throw tickets.error
  if (tasks.error) throw tasks.error

  return {
    merchants: merchants.data ?? [],
    tickets: tickets.data ?? [],
    tasks: tasks.data ?? [],
  }
}
