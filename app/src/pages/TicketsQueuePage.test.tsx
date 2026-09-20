import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildTicket } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/tickets')
vi.mock('@/api/profiles')

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { useAuth } from '@/auth/AuthProvider'
import { listTicketQueue } from '@/api/tickets'
import { listProfiles } from '@/api/profiles'
import TicketsQueuePage from './TicketsQueuePage'

const mockUseAuth = vi.mocked(useAuth)
const mockListTicketQueue = vi.mocked(listTicketQueue)
const mockListProfiles = vi.mocked(listProfiles)

function renderPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketsQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketsQueuePage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    mockListTicketQueue.mockReset()
    mockListProfiles.mockResolvedValue([])
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support', user: { id: 'user-1' } as never }))
  })

  it('renders the list view by default with an empty state', async () => {
    mockListTicketQueue.mockResolvedValue({ data: [], count: 0 })
    renderPage()
    expect(await screen.findByText('No tickets match these filters.')).toBeInTheDocument()
  })

  it('renders ticket rows with merchant/status/priority/assignee', async () => {
    const ticket = buildTicket({ subject: 'Payout delayed', priority: 'high' })
    mockListTicketQueue.mockResolvedValue({
      data: [{ ...ticket, assignee: { id: 'u1', full_name: 'Bob' }, merchant: { id: 'm1', legal_name: 'Acme', dba_name: null } }],
      count: 1,
    })

    renderPage()

    expect(await screen.findByText('Payout delayed')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('navigates to the merchant ticket tab when a row is clicked', async () => {
    const ticket = buildTicket({ id: 'ticket-1', merchant_id: 'm1', subject: 'Payout delayed' })
    mockListTicketQueue.mockResolvedValue({
      data: [{ ...ticket, assignee: null, merchant: { id: 'm1', legal_name: 'Acme', dba_name: null } }],
      count: 1,
    })
    const user = userEvent.setup()

    renderPage()
    await user.click(await screen.findByText('Payout delayed'))

    expect(navigateMock).toHaveBeenCalledWith('/merchants/m1?tab=tickets&ticket=ticket-1')
  })

  it('filters to "My Tickets" via the quick filter', async () => {
    mockListTicketQueue.mockResolvedValue({ data: [], count: 0 })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('No tickets match these filters.')
    mockListTicketQueue.mockClear()
    await user.click(screen.getByRole('button', { name: 'My Tickets' }))

    await waitFor(() =>
      expect(mockListTicketQueue).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'user-1' })),
    )
  })

  it('switches to the board view, hiding the list-only status filter', async () => {
    mockListTicketQueue.mockResolvedValue({ data: [], count: 0 })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('No tickets match these filters.')
    await user.click(screen.getByRole('button', { name: /Board/ }))

    expect(screen.getByText('Open')).toBeInTheDocument() // board column header
  })
})
