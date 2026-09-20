import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildTask } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/tasks')
vi.mock('@/api/profiles')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { createTask, listTasks, updateTask } from '@/api/tasks'
import { listProfiles } from '@/api/profiles'
import { toast } from 'sonner'
import { TasksTab } from './TasksTab'

const mockUseAuth = vi.mocked(useAuth)
const mockListTasks = vi.mocked(listTasks)
const mockCreateTask = vi.mocked(createTask)
const mockUpdateTask = vi.mocked(updateTask)
const mockListProfiles = vi.mocked(listProfiles)

function renderTab(merchantId = 'merchant-1') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TasksTab merchantId={merchantId} />
    </QueryClientProvider>,
  )
}

describe('TasksTab', () => {
  beforeEach(() => {
    mockListTasks.mockReset()
    mockCreateTask.mockReset()
    mockUpdateTask.mockReset()
    mockListProfiles.mockResolvedValue([])
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
  })

  it('shows an empty state when there are no tasks', async () => {
    mockListTasks.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText('No tasks for this merchant yet.')).toBeInTheDocument()
  })

  it('renders tasks with assignee and due date', async () => {
    const task = buildTask({ title: 'Follow up', assignee_id: 'user-2' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: { id: 'user-2', full_name: 'Bob' }, merchant: null }])

    renderTab()

    expect(await screen.findByText('Follow up')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('disables the checkbox for a user who cannot write the task', async () => {
    const task = buildTask({ created_by: 'someone-else', assignee_id: 'someone-else' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support', user: { id: 'user-1' } as never }))

    renderTab()
    await screen.findByText(task.title)

    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('enables the checkbox for the assignee and toggles status to done', async () => {
    const task = buildTask({ id: 'task-1', created_by: 'someone-else', assignee_id: 'user-1', status: 'todo' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUpdateTask.mockResolvedValue({ ...task, status: 'done' })
    const user = userEvent.setup()

    renderTab()
    await screen.findByText(task.title)
    await user.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalled())
    expect(mockUpdateTask.mock.calls[0][0]).toBe('task-1')
    expect(mockUpdateTask.mock.calls[0][1]).toEqual(expect.objectContaining({ status: 'done' }))
  })

  it('creates a new task linked to the merchant', async () => {
    mockListTasks.mockResolvedValue([])
    mockCreateTask.mockResolvedValue(buildTask({ title: 'New task' }))
    const user = userEvent.setup()

    renderTab('merchant-1')
    await screen.findByText('No tasks for this merchant yet.')
    await user.click(screen.getByRole('button', { name: /New Task/ }))
    await user.type(screen.getByLabelText(/Title/), 'New task')
    await user.click(screen.getByRole('button', { name: /Create task/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Task created'))
    expect(mockCreateTask.mock.calls[0][0]).toEqual(
      expect.objectContaining({ merchant_id: 'merchant-1', title: 'New task', created_by: 'user-1' }),
    )
  })

  it('shows an error toast when toggling status fails (RLS rejection)', async () => {
    const task = buildTask({ created_by: 'user-1', assignee_id: 'user-1', status: 'todo' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUpdateTask.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderTab()
    await screen.findByText(task.title)
    await user.click(screen.getByRole('checkbox'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
  })
})
