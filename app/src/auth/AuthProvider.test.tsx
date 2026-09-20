import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
import { AuthProvider, useAuth } from './AuthProvider'

const mockSupabase = supabase as unknown as MockSupabaseClient

function base64UrlEncode(json: unknown) {
  return btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeAccessToken(appMetadata: Record<string, unknown>) {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' })
  const body = base64UrlEncode({ app_metadata: appMetadata })
  return `${header}.${body}.sig`
}

function Consumer() {
  const { role, loading, session, user } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="role">{role}</span>
      <span data-testid="session">{session ? 'authenticated' : 'anonymous'}</span>
      <span data-testid="user">{user?.id ?? 'none'}</span>
    </div>
  )
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => mockSupabase.__reset())

  it('starts in a loading state, then resolves with no session -> role defaults to support', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('role')).toHaveTextContent('support')
    expect(screen.getByTestId('session')).toHaveTextContent('anonymous')
  })

  it('derives the role from the JWT app_metadata once a session resolves', async () => {
    const session = {
      access_token: makeAccessToken({ role: 'ops' }),
      user: { id: 'user-1' },
    }
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ops'))
    expect(screen.getByTestId('user')).toHaveTextContent('user-1')
  })

  it('falls back to the support role when the JWT has no app_metadata.role', async () => {
    const session = { access_token: makeAccessToken({}), user: { id: 'user-1' } }
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session } })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('support'))
  })

  it('updates state when the auth state change listener fires', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    let authChangeCallback: ((event: string, session: unknown) => void) | undefined
    mockSupabase.auth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('anonymous'))

    const session = { access_token: makeAccessToken({ role: 'admin' }), user: { id: 'user-2' } }
    act(() => {
      authChangeCallback?.('SIGNED_IN', session)
    })

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'))
  })

  it('throws when useAuth is called outside of an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider')
    spy.mockRestore()
  })
})
