import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { queryKeys } from '@/api/queryKeys'
import { supabase } from '@/lib/supabase'

/**
 * Subscribes to activities/support_tickets/tasks changes scoped to one merchant so
 * multiple agents viewing the same record see live updates. Returns connection state
 * for a small live indicator.
 */
export function useRealtimeMerchantChannel(merchantId: string | undefined) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!merchantId) return

    const channel = supabase
      .channel(`merchant:${merchantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `merchant_id=eq.${merchantId}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.list(merchantId) }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `merchant_id=eq.${merchantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tickets.forMerchant(merchantId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.merchants.summary(merchantId) })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `merchant_id=eq.${merchantId}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list({ view: 'team', merchantId }) }),
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => {
      setConnected(false)
      supabase.removeChannel(channel)
    }
  }, [merchantId, queryClient])

  return connected
}
