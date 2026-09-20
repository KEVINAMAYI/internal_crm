import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { buildAuthValue } from '@/test/authFixtures'
import { buildTicket } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/tickets')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { listTicketQueue, updateTicket } from '@/api/tickets'
import { toast } from 'sonner'
import { TicketsBoardView } from './TicketsBoardView'

const mockUseAuth = vi.mocked(useAuth)
const mockListTicketQueue = vi.mocked(listTicketQueue)
const mockUpdateTicket = vi.mocked(updateTicket)

function emptyQueue() {
  return Promise.resolve({ data: [], count: 0 })
}

function renderBoard() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <TicketsBoardView />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketsBoardView', () => {
  beforeEach(() => {
    mockUpdateTicket.mockReset()
  })

  it('renders one column per ticket status with an empty state when there is nothing in it', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    mockListTicketQueue.mockImplementation(emptyQueue)

    renderBoard()

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(await screen.findAllByText('No tickets')).toHaveLength(4)
  })

  it('renders a ticket card in its status column with priority and merchant', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    const ticket = buildTicket({ status: 'open', subject: 'Payout delayed', priority: 'high' })
    mockListTicketQueue.mockImplementation((filters) =>
      filters.status === 'open'
        ? Promise.resolve({
            data: [{ ...ticket, assignee: null, merchant: { id: 'm1', legal_name: 'Acme', dba_name: null } }],
            count: 1,
          })
        : emptyQueue(),
    )

    renderBoard()

    expect(await screen.findByText('Payout delayed')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('disables dragging and the card menu trigger for a role that cannot write tickets', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const ticket = buildTicket({ status: 'open', subject: 'Payout delayed' })
    mockListTicketQueue.mockImplementation((filters) =>
      filters.status === 'open'
        ? Promise.resolve({ data: [{ ...ticket, assignee: null, merchant: null }], count: 1 })
        : emptyQueue(),
    )

    renderBoard()
    await screen.findByText('Payout delayed')

    expect(screen.getByRole('button', { name: /Change status for Payout delayed/ })).toBeDisabled()
  })

  it('moves a ticket to a new status via the card menu and rolls back with a toast on RLS rejection', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    const ticket = buildTicket({ id: 'ticket-1', status: 'open', subject: 'Payout delayed' })
    mockListTicketQueue.mockImplementation((filters) =>
      filters.status === 'open'
        ? Promise.resolve({ data: [{ ...ticket, assignee: null, merchant: null }], count: 1 })
        : emptyQueue(),
    )
    mockUpdateTicket.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderBoard()
    await screen.findByText('Payout delayed')

    const menuTrigger = screen.getByRole('button', { name: /Change status for Payout delayed/ })
    menuTrigger.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('menuitem', { name: 'Pending' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
    expect(mockUpdateTicket).toHaveBeenCalledWith('ticket-1', { status: 'pending' })
  })
})
