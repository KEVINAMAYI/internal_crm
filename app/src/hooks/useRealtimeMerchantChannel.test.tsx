import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { createTestQueryClient } from '@/test/renderWithProviders'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
import { useRealtimeMerchantChannel } from './useRealtimeMerchantChannel'

const mockSupabase = supabase as unknown as MockSupabaseClient

describe('useRealtimeMerchantChannel', () => {
  beforeEach(() => mockSupabase.__reset())

  it('does nothing when merchantId is undefined', () => {
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useRealtimeMerchantChannel(undefined), { wrapper })

    expect(result.current).toBe(false)
    expect(mockSupabase.channel).not.toHaveBeenCalled()
  })

  it('subscribes to a merchant-scoped channel and reports connected once SUBSCRIBED', async () => {
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useRealtimeMerchantChannel('merchant-1'), { wrapper })

    expect(mockSupabase.channel).toHaveBeenCalledWith('merchant:merchant-1')
    expect(result.current).toBe(false)

    act(() => {
      mockSupabase.__lastChannel?._emit('SUBSCRIBED')
    })

    await waitFor(() => expect(result.current).toBe(true))
  })

  it('invalidates the activities/tickets/summary/tasks query keys on postgres_changes callbacks', () => {
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    renderHook(() => useRealtimeMerchantChannel('merchant-1'), { wrapper })

    const channel = mockSupabase.__lastChannel!
    const onCalls = channel.on.mock.calls as [string, { table: string }, () => void][]

    const activitiesHandler = onCalls.find((c) => c[1].table === 'activities')?.[2]
    activitiesHandler?.()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.activities.list('merchant-1') })

    const ticketsHandler = onCalls.find((c) => c[1].table === 'support_tickets')?.[2]
    ticketsHandler?.()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tickets.forMerchant('merchant-1') })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.merchants.summary('merchant-1') })

    const tasksHandler = onCalls.find((c) => c[1].table === 'tasks')?.[2]
    tasksHandler?.()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.tasks.list({ view: 'team', merchantId: 'merchant-1' }),
    })
  })

  it('removes the channel and resets connected state on unmount / merchant change', () => {
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { unmount } = renderHook(() => useRealtimeMerchantChannel('merchant-1'), { wrapper })
    const channel = mockSupabase.__lastChannel

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel)
  })
})
