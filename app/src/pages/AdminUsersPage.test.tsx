import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProfile } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/profiles')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { listProfiles, updateProfile } from '@/api/profiles'
import { toast } from 'sonner'
import AdminUsersPage from './AdminUsersPage'

const mockListProfiles = vi.mocked(listProfiles)
const mockUpdateProfile = vi.mocked(updateProfile)

function renderPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminUsersPage />
    </QueryClientProvider>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    mockListProfiles.mockReset()
    mockUpdateProfile.mockReset()
  })

  it('renders a row per user with name, email, role, and active status', async () => {
    const profile = buildProfile({ full_name: 'Jane Doe', email: 'jane@example.com', role: 'sales' })
    mockListProfiles.mockResolvedValue([profile])

    renderPage()

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('changes a user’s role via the Select and shows a success toast', async () => {
    const profile = buildProfile({ id: 'user-1', full_name: 'Jane Doe', role: 'sales' })
    mockListProfiles.mockResolvedValue([profile])
    mockUpdateProfile.mockResolvedValue({ ...profile, role: 'ops' })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('Jane Doe')

    const roleTrigger = screen.getByRole('combobox')
    roleTrigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('o{Enter}') // "ops"

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('User updated'))
    expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', { role: 'ops' })
  })

  it('toggles active status via the Switch', async () => {
    const profile = buildProfile({ id: 'user-1', is_active: true })
    mockListProfiles.mockResolvedValue([profile])
    mockUpdateProfile.mockResolvedValue({ ...profile, is_active: false })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(profile.full_name)
    await user.click(screen.getByRole('switch'))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith('user-1', { is_active: false }))
  })

  it('shows an error toast when a non-admin attempts the update (RLS rejection)', async () => {
    const profile = buildProfile({ id: 'user-1', is_active: true })
    mockListProfiles.mockResolvedValue([profile])
    mockUpdateProfile.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(profile.full_name)
    await user.click(screen.getByRole('switch'))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'denied' }),
      ),
    )
  })
})
