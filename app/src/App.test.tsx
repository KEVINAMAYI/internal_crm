import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/hooks/useMyProfile')
vi.mock('@/api/search')
vi.mock('@/api/profiles')
vi.mock('@/api/merchants')
vi.mock('@/api/tasks')
vi.mock('@/api/tickets')

import { useAuth } from '@/auth/AuthProvider'
import { useMyProfile } from '@/hooks/useMyProfile'
import { listProfiles } from '@/api/profiles'
import App from './App'

const mockUseAuth = vi.mocked(useAuth)
const mockUseMyProfile = vi.mocked(useMyProfile)
const mockListProfiles = vi.mocked(listProfiles)

function renderApp(initialEntry: string) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App routing', () => {
  beforeEach(() => {
    mockUseMyProfile.mockReturnValue({ data: undefined } as ReturnType<typeof useMyProfile>)
    mockListProfiles.mockResolvedValue([])
  })

  it('redirects to /login when there is no session', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: null, loading: false }))
    renderApp('/merchants')
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  })

  it('redirects the index route to /merchants when authenticated', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/')
    expect(await screen.findByText('Merchants')).toBeInTheDocument()
  })

  it('renders the Forbidden page for /admin/users when the role is not admin', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/admin/users')
    expect(await screen.findByText("You don't have access")).toBeInTheDocument()
  })

  it('renders the Admin Users page for the admin role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    renderApp('/admin/users')
    expect(await screen.findByText('Manage roles and active status for all users.')).toBeInTheDocument()
  })

  it('renders NotFound for an unknown route', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/this/does/not/exist')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})
