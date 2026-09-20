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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { createTicket, listTicketsForMerchant, updateTicket } from '@/api/tickets'
import { listProfiles } from '@/api/profiles'
import { toast } from 'sonner'
import { TicketsTab } from './TicketsTab'

const mockUseAuth = vi.mocked(useAuth)
const mockListTickets = vi.mocked(listTicketsForMerchant)
const mockCreateTicket = vi.mocked(createTicket)
const mockUpdateTicket = vi.mocked(updateTicket)
const mockListProfiles = vi.mocked(listProfiles)

function renderTab(merchantId = 'merchant-1') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketsTab merchantId={merchantId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketsTab', () => {
  beforeEach(() => {
    mockListTickets.mockReset()
    mockCreateTicket.mockReset()
    mockUpdateTicket.mockReset()
    mockListProfiles.mockResolvedValue([])
  })

  it('shows an empty state when there are no tickets', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    mockListTickets.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText('No tickets for this merchant yet.')).toBeInTheDocument()
  })

  it('shows "New Ticket" for support/ops/admin but not for sales', async () => {
    mockListTickets.mockResolvedValue([])

    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const { unmount } = renderTab()
    await screen.findByText('No tickets for this merchant yet.')
    expect(screen.queryByRole('button', { name: /New Ticket/ })).not.toBeInTheDocument()
    unmount()

    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    renderTab()
    await screen.findByText('No tickets for this merchant yet.')
    expect(screen.getByRole('button', { name: /New Ticket/ })).toBeInTheDocument()
  })

  it('expands a ticket row to reveal status/priority/assignee controls', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    const ticket = buildTicket({ subject: 'Payout delayed' })
    mockListTickets.mockResolvedValue([{ ...ticket, assignee: null }])
    const user = userEvent.setup()

    renderTab()
    await user.click(await screen.findByText('Payout delayed'))

    expect(await screen.findAllByText('Status')).not.toHaveLength(0)
  })

  it('disables the status/priority/assignee Selects for sales (read-only)', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const ticket = buildTicket({ subject: 'Payout delayed' })
    mockListTickets.mockResolvedValue([{ ...ticket, assignee: null }])
    const user = userEvent.setup()

    renderTab()
    await user.click(await screen.findByText('Payout delayed'))

    const comboboxes = await screen.findAllByRole('combobox')
    for (const box of comboboxes) expect(box).toBeDisabled()
  })

  it('optimistically updates status and rolls back with a toast on RLS rejection', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    const ticket = buildTicket({ id: 'ticket-1', subject: 'Payout delayed', status: 'open' })
    mockListTickets.mockResolvedValue([{ ...ticket, assignee: null }])
    mockUpdateTicket.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderTab()
    await user.click(await screen.findByText('Payout delayed'))

    const statusTrigger = screen.getAllByRole('combobox')[0]
    statusTrigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('p{Enter}') // "pending"

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
    // after rollback, the select should reflect the original "open" status again
    await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('open'))
  })

  it('creates a new ticket via the dialog', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support', user: { id: 'user-1' } as never }))
    mockListTickets.mockResolvedValue([])
    mockCreateTicket.mockResolvedValue(buildTicket({ subject: 'New issue' }))
    const user = userEvent.setup()

    renderTab('merchant-1')
    await screen.findByText('No tickets for this merchant yet.')
    await user.click(screen.getByRole('button', { name: /New Ticket/ }))
    await user.type(screen.getByLabelText(/Subject/), 'New issue')
    await user.click(screen.getByRole('button', { name: /Create ticket/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Ticket created'))
    expect(mockCreateTicket.mock.calls[0][0]).toEqual(
      expect.objectContaining({ merchant_id: 'merchant-1', subject: 'New issue', created_by: 'user-1' }),
    )
  })
})
