import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProfile } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/profiles')

import { useAuth } from '@/auth/AuthProvider'
import { getProfile } from '@/api/profiles'
import { useMyProfile } from './useMyProfile'

const mockUseAuth = vi.mocked(useAuth)
const mockGetProfile = vi.mocked(getProfile)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is disabled (does not fetch) when there is no authenticated user', () => {
    mockUseAuth.mockReturnValue({
      session: null,
      user: null,
      role: 'support',
      loading: false,
      signOut: vi.fn(),
    })

    const { result } = renderHook(() => useMyProfile(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetProfile).not.toHaveBeenCalled()
  })

  it('fetches the profile for the current user id once authenticated', async () => {
    const profile = buildProfile({ id: 'user-1' })
    mockUseAuth.mockReturnValue({
      session: {},
      user: { id: 'user-1' } as never,
      role: 'sales',
      loading: false,
      signOut: vi.fn(),
    })
    mockGetProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useMyProfile(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(profile))
    expect(mockGetProfile).toHaveBeenCalledWith('user-1')
  })

  it('surfaces an error state when the fetch fails', async () => {
    mockUseAuth.mockReturnValue({
      session: {},
      user: { id: 'user-1' } as never,
      role: 'sales',
      loading: false,
      signOut: vi.fn(),
    })
    mockGetProfile.mockRejectedValue(new Error('not found'))

    const { result } = renderHook(() => useMyProfile(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
