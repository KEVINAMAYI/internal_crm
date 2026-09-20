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

import { updateTask } from '@/api/tasks'
import { listProfiles } from '@/api/profiles'
import { listMerchants } from '@/api/merchants'
import { toast } from 'sonner'
import { EditTaskSheet } from './EditTaskSheet'

const mockUpdateTask = vi.mocked(updateTask)
const mockListProfiles = vi.mocked(listProfiles)
const mockListMerchants = vi.mocked(listMerchants)

function renderSheet(task: ReturnType<typeof buildTask>, onOpenChange = vi.fn()) {
  const queryClient = createTestQueryClient()
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditTaskSheet task={task} open onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ),
  }
}

describe('EditTaskSheet', () => {
  beforeEach(() => {
    mockUpdateTask.mockReset()
    mockListProfiles.mockResolvedValue([])
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })
  })

  it('pre-fills the form with the task’s current details', () => {
    const task = buildTask({ title: 'Follow up', notes: 'Call back' })
    renderSheet(task)

    expect(screen.getByLabelText(/Title/)).toHaveValue('Follow up')
    expect(screen.getByLabelText(/Notes/)).toHaveValue('Call back')
  })

  it('submits the patched fields and closes on success', async () => {
    const task = buildTask({ id: 'task-1', title: 'Follow up' })
    mockUpdateTask.mockResolvedValue({ ...task, title: 'Follow up (updated)' })
    const user = userEvent.setup()

    const { onOpenChange } = renderSheet(task)
    await user.clear(screen.getByLabelText(/Title/))
    await user.type(screen.getByLabelText(/Title/), 'Follow up (updated)')
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(toast.success).toHaveBeenCalledWith('Task updated')
    expect(mockUpdateTask.mock.calls[0][0]).toBe('task-1')
    expect(mockUpdateTask.mock.calls[0][1]).toEqual(
      expect.objectContaining({ title: 'Follow up (updated)' }),
    )
  })

  it('shows an error toast when the update is rejected', async () => {
    const task = buildTask()
    mockUpdateTask.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderSheet(task)
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
  })
})
