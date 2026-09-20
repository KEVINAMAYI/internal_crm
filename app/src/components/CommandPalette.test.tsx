import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/renderWithProviders'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/api/search')

import { globalSearch } from '@/api/search'
import { CommandPalette } from './CommandPalette'

const mockGlobalSearch = vi.mocked(globalSearch)

function renderPalette(open = true) {
  const onOpenChange = vi.fn()
  const queryClient = createTestQueryClient()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommandPalette open={open} onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onOpenChange, ...utils }
}

describe('CommandPalette', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    mockGlobalSearch.mockReset()
  })

  it('is not rendered in the DOM when closed', () => {
    renderPalette(false)
    expect(screen.queryByPlaceholderText(/Search merchants, tickets, tasks/)).not.toBeInTheDocument()
  })

  it('prompts to start typing when there is no query yet', () => {
    renderPalette(true)
    expect(screen.getByText('Start typing to search…')).toBeInTheDocument()
  })

  it('shows "No results found" once a query returns nothing', async () => {
    mockGlobalSearch.mockResolvedValue({ merchants: [], tickets: [], tasks: [] })
    const user = userEvent.setup()
    renderPalette(true)

    await user.type(screen.getByPlaceholderText(/Search merchants, tickets, tasks/), 'zzz')

    await waitFor(() => expect(screen.getByText('No results found.')).toBeInTheDocument())
  })

  it('renders grouped merchant/ticket/task results and navigates on selection', async () => {
    mockGlobalSearch.mockResolvedValue({
      merchants: [{ id: 'm1', legal_name: 'Acme Corp', dba_name: null, status: 'active' }],
      tickets: [{ id: 't1', subject: 'Payout delayed', status: 'open', merchant_id: 'm1', merchant: { legal_name: 'Acme Corp' } }],
      tasks: [{ id: 'k1', title: 'Follow up', status: 'todo', merchant_id: 'm1' }],
    })
    const user = userEvent.setup()
    const { onOpenChange } = renderPalette(true)

    await user.type(screen.getByPlaceholderText(/Search merchants, tickets, tasks/), 'acme')

    const merchantItem = await screen.findByText('Acme Corp')
    expect(screen.getByText('Payout delayed')).toBeInTheDocument()
    expect(screen.getByText('Follow up')).toBeInTheDocument()

    await user.click(merchantItem)

    expect(navigateMock).toHaveBeenCalledWith('/merchants/m1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('navigates to the ticket-scoped merchant tab when a ticket result is selected', async () => {
    mockGlobalSearch.mockResolvedValue({
      merchants: [],
      tickets: [{ id: 't1', subject: 'Payout delayed', status: 'open', merchant_id: 'm1', merchant: { legal_name: 'Acme Corp' } }],
      tasks: [],
    })
    const user = userEvent.setup()
    renderPalette(true)

    await user.type(screen.getByPlaceholderText(/Search merchants, tickets, tasks/), 'payout')
    await user.click(await screen.findByText('Payout delayed'))

    expect(navigateMock).toHaveBeenCalledWith('/merchants/m1?tab=tickets&ticket=t1')
  })

  it('navigates to the unlinked tasks view for a task with no merchant', async () => {
    mockGlobalSearch.mockResolvedValue({
      merchants: [],
      tickets: [],
      tasks: [{ id: 'k1', title: 'Unlinked follow up', status: 'todo', merchant_id: null }],
    })
    const user = userEvent.setup()
    renderPalette(true)

    await user.type(screen.getByPlaceholderText(/Search merchants, tickets, tasks/), 'follow')
    await user.click(await screen.findByText('Unlinked follow up'))

    expect(navigateMock).toHaveBeenCalledWith('/tasks?view=unlinked')
  })
})
