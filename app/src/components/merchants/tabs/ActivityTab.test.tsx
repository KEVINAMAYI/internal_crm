import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildActivity } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/activities')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { createActivity, listActivities } from '@/api/activities'
import { toast } from 'sonner'
import { ActivityTab } from './ActivityTab'

const mockListActivities = vi.mocked(listActivities)
const mockCreateActivity = vi.mocked(createActivity)

function renderTab(merchantId = 'merchant-1') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityTab merchantId={merchantId} />
    </QueryClientProvider>,
  )
}

describe('ActivityTab', () => {
  beforeEach(() => {
    mockListActivities.mockReset()
    mockCreateActivity.mockReset()
  })

  it('shows an empty state when there is no activity yet', async () => {
    mockListActivities.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText('No activity logged yet.')).toBeInTheDocument()
  })

  it('renders logged activities with author and body', async () => {
    const activity = buildActivity({ body: 'Called about renewal', author_id: 'user-1' })
    mockListActivities.mockResolvedValue([
      { ...activity, author: { id: 'user-1', full_name: 'Jane Doe' } },
    ])

    renderTab()

    expect(await screen.findByText('Called about renewal')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('disables "Log activity" until a note body is entered', async () => {
    mockListActivities.mockResolvedValue([])
    renderTab()
    await screen.findByText('No activity logged yet.')

    expect(screen.getByRole('button', { name: /Log activity/ })).toBeDisabled()
  })

  it('submits a new note and clears the composer on success', async () => {
    mockListActivities.mockResolvedValue([])
    mockCreateActivity.mockResolvedValue({
      id: 'activity-1',
      merchant_id: 'merchant-1',
      author_id: 'user-1',
      type: 'note',
      body: 'Called the merchant',
      ticket_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      author: { id: 'user-1', full_name: 'Jane Doe' },
    })
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No activity logged yet.')
    const textarea = screen.getByPlaceholderText(/Log a note, call, email, or meeting/)
    await user.type(textarea, 'Called the merchant')
    await user.click(screen.getByRole('button', { name: /Log activity/ }))

    await waitFor(() => expect(textarea).toHaveValue(''))
    expect(mockCreateActivity.mock.calls[0][0]).toEqual(
      expect.objectContaining({ merchant_id: 'merchant-1', type: 'note', body: 'Called the merchant' }),
    )
  })

  it('shows an error toast when logging the activity fails', async () => {
    mockListActivities.mockResolvedValue([])
    mockCreateActivity.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No activity logged yet.')
    await user.type(screen.getByPlaceholderText(/Log a note, call, email, or meeting/), 'x')
    await user.click(screen.getByRole('button', { name: /Log activity/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't log activity", expect.objectContaining({ description: 'denied' })),
    )
  })
})
