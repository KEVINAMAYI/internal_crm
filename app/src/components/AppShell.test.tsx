import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/hooks/useMyProfile')
vi.mock('@/api/search')

import { useAuth } from '@/auth/AuthProvider'
import { useMyProfile } from '@/hooks/useMyProfile'
import { AppShell } from './AppShell'

const mockUseAuth = vi.mocked(useAuth)
const mockUseMyProfile = vi.mocked(useMyProfile)

function renderShell(initialEntry = '/merchants') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/merchants" element={<div>Merchants content</div>} />
            <Route path="/tickets" element={<div>Tickets content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    mockUseMyProfile.mockReturnValue({ data: undefined } as ReturnType<typeof useMyProfile>)
  })

  it('always shows the core navigation items', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderShell()

    expect(screen.getByRole('link', { name: /Merchants/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tickets/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tasks/ })).toBeInTheDocument()
  })

  it('hides the Users nav item for non-admin roles', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderShell()

    expect(screen.queryByRole('link', { name: /Users/ })).not.toBeInTheDocument()
  })

  it('shows the Users nav item for the admin role', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    renderShell()

    expect(screen.getByRole('link', { name: /Users/ })).toBeInTheDocument()
  })

  it('hides Dashboard, Users, and Settings for sales', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderShell()

    expect(screen.queryByRole('link', { name: /Dashboard/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Users/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
  })

  it('hides Dashboard, Users, and Settings for support', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    renderShell()

    expect(screen.queryByRole('link', { name: /Dashboard/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Users/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
  })

  it('shows only Dashboard (not Users/Settings) for ops', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    renderShell()

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Users/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
  })

  it('shows Dashboard, Users, and Settings for admin', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    renderShell()

    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Users/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settings/ })).toBeInTheDocument()
  })

  it('renders the routed page content via the Outlet', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderShell('/merchants')

    expect(screen.getByText('Merchants content')).toBeInTheDocument()
  })

  it('opens the command palette when the search button is clicked', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: /Search merchants, tickets, tasks/ }))

    expect(await screen.findByText('Start typing to search…')).toBeInTheDocument()
  })
})
