import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/auth/AuthProvider')
vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { useAuth } from '@/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import Login from './Login'

const mockUseAuth = vi.mocked(useAuth)
const mockSupabase = supabase as unknown as MockSupabaseClient

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Merchants page</div>} />
        <Route path="/merchants" element={<div>Merchants page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  beforeEach(() => mockSupabase.__reset())

  it('renders the sign-in form when there is no session', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: null }))
    renderLogin()

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('redirects to / when a session already exists', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: { access_token: 'x' } }))
    renderLogin()

    // No "from" location redirect target defined for this route in the test router,
    // so it falls through to root — the important behavior is it does NOT show the form.
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('shows an error alert when sign-in fails', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: null }))
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()

    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'demo@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })

  it('navigates to the destination on successful sign-in', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: null }))
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    const user = userEvent.setup()

    renderLogin()
    await user.type(screen.getByLabelText('Email'), 'demo@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Merchants page')).toBeInTheDocument())
  })
})
