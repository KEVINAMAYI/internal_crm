import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/dashboard')

import { getDashboardSummary, getRecentActivity, type DashboardSummary } from '@/api/dashboard'
import DashboardPage from './DashboardPage'

const mockGetDashboardSummary = vi.mocked(getDashboardSummary)
const mockGetRecentActivity = vi.mocked(getRecentActivity)

function buildSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    merchant_count: 42,
    active_merchant_count: 30,
    open_ticket_count: 7,
    open_tickets_low: 1,
    open_tickets_normal: 2,
    open_tickets_high: 3,
    open_tickets_urgent: 1,
    overdue_task_count: 5,
    ...overrides,
  }
}

function buildFeedActivity(overrides: Partial<Awaited<ReturnType<typeof getRecentActivity>>[number]> = {}) {
  return {
    id: `activity-${Math.random()}`,
    merchant_id: 'merchant-1',
    author_id: 'user-1',
    type: 'note' as const,
    body: 'Called the merchant about renewal.',
    ticket_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    merchant: { id: 'merchant-1', legal_name: 'Acme Corp', dba_name: 'Acme' },
    author: { id: 'user-1', full_name: 'Jane Doe' },
    ...overrides,
  } as Awaited<ReturnType<typeof getRecentActivity>>[number]
}

function renderPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockGetDashboardSummary.mockReset()
    mockGetRecentActivity.mockReset()
  })

  it('shows loading skeletons for both the KPI tiles and the activity feed', () => {
    mockGetDashboardSummary.mockReturnValue(new Promise(() => {}))
    mockGetRecentActivity.mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders KPI values from the dashboard_summary response', async () => {
    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    mockGetRecentActivity.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders the open-tickets priority breakdown', async () => {
    mockGetDashboardSummary.mockResolvedValue(
      buildSummary({ open_tickets_urgent: 9, open_tickets_high: 8, open_tickets_normal: 7, open_tickets_low: 6 }),
    )
    mockGetRecentActivity.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText(/urgent 9/)).toBeInTheDocument()
    expect(screen.getByText(/high 8/)).toBeInTheDocument()
    expect(screen.getByText(/normal 7/)).toBeInTheDocument()
    expect(screen.getByText(/low 6/)).toBeInTheDocument()
  })

  it('shows a KPI error state with retry, independent of a successful activity feed', async () => {
    mockGetDashboardSummary.mockRejectedValue(new Error('rpc failed'))
    mockGetRecentActivity.mockResolvedValue([buildFeedActivity({ body: 'Feed still loads' })])
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findAllByText("Couldn't load")).not.toHaveLength(0)
    expect(await screen.findByText('Feed still loads')).toBeInTheDocument()

    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    await user.click(screen.getAllByRole('button', { name: 'Retry' })[0])

    expect(await screen.findByText('42')).toBeInTheDocument()
  })

  it('shows an activity-feed error state with retry, independent of successful KPI tiles', async () => {
    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    mockGetRecentActivity.mockRejectedValue(new Error('feed failed'))
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(await screen.findByText("Couldn't load recent activity.")).toBeInTheDocument()

    mockGetRecentActivity.mockResolvedValue([buildFeedActivity({ body: 'Now it loads' })])
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Now it loads')).toBeInTheDocument()
  })

  it('shows an empty state when there is no recent activity', async () => {
    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    mockGetRecentActivity.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('No activity yet.')).toBeInTheDocument()
  })

  it('filters the activity feed by type via the Select', async () => {
    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    mockGetRecentActivity.mockResolvedValue([
      buildFeedActivity({ id: 'a1', type: 'note', body: 'A note' }),
      buildFeedActivity({ id: 'a2', type: 'call', body: 'A call' }),
    ])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('A note')
    expect(screen.getByText('A call')).toBeInTheDocument()

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('call{Enter}')

    expect(screen.getByText('A call')).toBeInTheDocument()
    expect(screen.queryByText('A note')).not.toBeInTheDocument()
  })

  it('loads more activity, increasing the requested limit', async () => {
    mockGetDashboardSummary.mockResolvedValue(buildSummary())
    const firstPage = Array.from({ length: 20 }, (_, i) => buildFeedActivity({ id: `a${i}`, body: `Item ${i}` }))
    mockGetRecentActivity.mockResolvedValueOnce(firstPage)
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('Item 0')

    mockGetRecentActivity.mockResolvedValueOnce([...firstPage, buildFeedActivity({ id: 'a20', body: 'Item 20' })])
    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => expect(mockGetRecentActivity).toHaveBeenLastCalledWith(40))
    expect(await screen.findByText('Item 20')).toBeInTheDocument()
  })
})
