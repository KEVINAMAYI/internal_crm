import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'

vi.mock('@/auth/AuthProvider')

import { useAuth } from '@/auth/AuthProvider'
import { ProtectedRoute } from './ProtectedRoute'

const mockUseAuth = vi.mocked(useAuth)

function renderProtected(initialEntries: string[] = ['/merchants']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/merchants" element={<div>Merchants page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading spinner while auth state is resolving', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ loading: true, session: null }))

    const { container } = renderProtected()

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Merchants page')).not.toBeInTheDocument()
  })

  it('redirects to /login when there is no session', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ loading: false, session: null }))

    renderProtected()

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Merchants page')).not.toBeInTheDocument()
  })

  it('renders the protected outlet when a session is present', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ loading: false, session: { access_token: 'x' } }))

    renderProtected()

    expect(screen.getByText('Merchants page')).toBeInTheDocument()
  })
})
