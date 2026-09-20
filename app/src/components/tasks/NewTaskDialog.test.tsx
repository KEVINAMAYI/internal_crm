import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTask } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/tasks')
vi.mock('@/api/profiles')
vi.mock('@/api/merchants')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { createTask } from '@/api/tasks'
import { listProfiles } from '@/api/profiles'
import { listMerchants } from '@/api/merchants'
import { toast } from 'sonner'
import { NewTaskDialog } from './NewTaskDialog'

const mockCreateTask = vi.mocked(createTask)
const mockListProfiles = vi.mocked(listProfiles)
const mockListMerchants = vi.mocked(listMerchants)

function renderDialog(onOpenChange = vi.fn(), userId = 'user-1') {
  const queryClient = createTestQueryClient()
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <NewTaskDialog open onOpenChange={onOpenChange} userId={userId} />
      </QueryClientProvider>,
    ),
  }
}

describe('NewTaskDialog (standalone)', () => {
  beforeEach(() => {
    mockCreateTask.mockReset()
    mockListProfiles.mockResolvedValue([])
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })
  })

  it('disables submit until a title is entered', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /Create task/ })).toBeDisabled()
  })

  it('creates a task, optionally with no merchant (unlinked)', async () => {
    mockCreateTask.mockResolvedValue(buildTask({ title: 'Unlinked task', merchant_id: null }))
    const user = userEvent.setup()

    const { onOpenChange } = renderDialog(vi.fn(), 'user-1')
    await user.type(screen.getByLabelText(/Title/), 'Unlinked task')
    await user.click(screen.getByRole('button', { name: /Create task/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Task created'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockCreateTask.mock.calls[0][0]).toEqual(
      expect.objectContaining({ title: 'Unlinked task', merchant_id: null, created_by: 'user-1' }),
    )
  })

  it('shows an error toast when creation fails', async () => {
    mockCreateTask.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderDialog()
    await user.type(screen.getByLabelText(/Title/), 'x')
    await user.click(screen.getByRole('button', { name: /Create task/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't create task", expect.objectContaining({ description: 'denied' })),
    )
  })
})
