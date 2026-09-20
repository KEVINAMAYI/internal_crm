import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildTask } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/tasks')
vi.mock('@/api/profiles')
vi.mock('@/api/merchants')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { listTasks, updateTask } from '@/api/tasks'
import { listProfiles } from '@/api/profiles'
import { listMerchants } from '@/api/merchants'
import { toast } from 'sonner'
import TasksHomePage from './TasksHomePage'

const mockUseAuth = vi.mocked(useAuth)
const mockListTasks = vi.mocked(listTasks)
const mockUpdateTask = vi.mocked(updateTask)
const mockListProfiles = vi.mocked(listProfiles)
const mockListMerchants = vi.mocked(listMerchants)

function renderPage(initialEntry = '/tasks') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <TasksHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TasksHomePage', () => {
  beforeEach(() => {
    mockListTasks.mockReset()
    mockUpdateTask.mockReset()
    mockListProfiles.mockResolvedValue([])
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
  })

  it('defaults to the "My Tasks" view', async () => {
    mockListTasks.mockResolvedValue([])
    renderPage()
    await screen.findByText('No tasks here.')
    expect(mockListTasks).toHaveBeenCalledWith(expect.objectContaining({ view: 'mine' }))
  })

  it('switches views via the segmented control', async () => {
    mockListTasks.mockResolvedValue([])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('No tasks here.')
    mockListTasks.mockClear()
    await user.click(screen.getByRole('button', { name: 'Unlinked' }))

    await waitFor(() =>
      expect(mockListTasks).toHaveBeenCalledWith(expect.objectContaining({ view: 'unlinked' })),
    )
  })

  it('shows the merchant link for a linked task and "unlinked" text otherwise', async () => {
    mockListTasks.mockResolvedValue([
      { ...buildTask({ title: 'Linked task' }), assignee: null, merchant: { id: 'm1', legal_name: 'Acme', dba_name: null } },
      { ...buildTask({ title: 'Unlinked task', merchant_id: null }), assignee: null, merchant: null },
    ])

    renderPage()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('— unlinked')).toBeInTheDocument()
  })

  it('toggles a task to done via the checkbox when the user can write it', async () => {
    const task = buildTask({ id: 'task-1', created_by: 'user-1', assignee_id: 'user-1', status: 'todo' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUpdateTask.mockResolvedValue({ ...task, status: 'done' })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(task.title)
    await user.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalled())
    expect(mockUpdateTask.mock.calls[0][1]).toEqual(expect.objectContaining({ status: 'done' }))
  })

  it('disables the checkbox and the row menu for a task the user cannot write', async () => {
    const task = buildTask({ created_by: 'someone-else', assignee_id: 'someone-else' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support', user: { id: 'user-1' } as never }))

    renderPage()
    await screen.findByText(task.title)

    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('shows an error toast when toggling status is rejected', async () => {
    const task = buildTask({ created_by: 'user-1', assignee_id: 'user-1', status: 'todo' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    mockUpdateTask.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(task.title)
    await user.click(screen.getByRole('checkbox'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
  })

  it('opens the edit sheet for a writable task via the row menu', async () => {
    const task = buildTask({ id: 'task-1', title: 'Edit me', created_by: 'user-1', assignee_id: 'user-1' })
    mockListTasks.mockResolvedValue([{ ...task, assignee: null, merchant: null }])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('Edit me')
    await user.click(screen.getByRole('button', { name: '' }))

    expect(await screen.findByText('Edit Task')).toBeInTheDocument()
  })
})
