import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { buildAuthValue } from '@/test/authFixtures'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/hooks/useMyProfile')
vi.mock('@/api/search')
vi.mock('@/api/profiles')
vi.mock('@/api/merchants')
vi.mock('@/api/tasks')
vi.mock('@/api/tickets')
vi.mock('@/api/dashboard')
vi.mock('@/api/settings')

import { useAuth } from '@/auth/AuthProvider'
import { useMyProfile } from '@/hooks/useMyProfile'
import { listProfiles } from '@/api/profiles'
import { getDashboardSummary, getRecentActivity } from '@/api/dashboard'
import { getSystemSettings } from '@/api/settings'
import App from './App'

const mockUseAuth = vi.mocked(useAuth)
const mockUseMyProfile = vi.mocked(useMyProfile)
const mockListProfiles = vi.mocked(listProfiles)
const mockGetDashboardSummary = vi.mocked(getDashboardSummary)
const mockGetRecentActivity = vi.mocked(getRecentActivity)
const mockGetSystemSettings = vi.mocked(getSystemSettings)

function renderApp(initialEntry: string) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App routing', () => {
  beforeEach(() => {
    mockUseMyProfile.mockReturnValue({ data: undefined } as ReturnType<typeof useMyProfile>)
    mockListProfiles.mockResolvedValue([])
    mockGetDashboardSummary.mockReturnValue(new Promise(() => {}))
    mockGetRecentActivity.mockReturnValue(new Promise(() => {}))
    mockGetSystemSettings.mockReturnValue(new Promise(() => {}))
  })

  it('redirects to /login when there is no session', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ session: null, loading: false }))
    renderApp('/merchants')
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
  })

  it('redirects the index route to /merchants for the sales role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/')
    expect(await screen.findByText('Merchants')).toBeInTheDocument()
  })

  it('redirects the index route to /merchants for the support role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    renderApp('/')
    expect(await screen.findByText('Merchants')).toBeInTheDocument()
  })

  it('redirects the index route to /dashboard for the ops role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    renderApp('/')
    expect(await screen.findByText('Org-wide overview across every merchant.')).toBeInTheDocument()
  })

  it('redirects the index route to /dashboard for the admin role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    renderApp('/')
    expect(await screen.findByText('Org-wide overview across every merchant.')).toBeInTheDocument()
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

  it('renders the Forbidden page for /dashboard when the role is sales or support', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/dashboard')
    expect(await screen.findByText("You don't have access")).toBeInTheDocument()
  })

  it('renders the Dashboard page for ops and admin', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    renderApp('/dashboard')
    expect(await screen.findByText('Org-wide overview across every merchant.')).toBeInTheDocument()
  })

  it('renders the Forbidden page for /settings when the role is not admin', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    renderApp('/settings')
    expect(await screen.findByText("You don't have access")).toBeInTheDocument()
  })

  it('renders the Settings page for the admin role', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    renderApp('/settings')
    expect(await screen.findByText('Org-level system configuration.')).toBeInTheDocument()
  })

  it('renders NotFound for an unknown route', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    renderApp('/this/does/not/exist')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})
