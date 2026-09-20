import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/settings')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { getSystemSettings, updateSystemSettings, type SystemSettingsRow } from '@/api/settings'
import { toast } from 'sonner'
import SettingsPage from './SettingsPage'

const mockGetSystemSettings = vi.mocked(getSystemSettings)
const mockUpdateSystemSettings = vi.mocked(updateSystemSettings)

function buildSettingsRow(overrides: Partial<SystemSettingsRow> = {}): SystemSettingsRow {
  return {
    id: 1,
    default_ticket_priority: 'normal',
    sla_urgent_hours: 4,
    sla_high_hours: 8,
    sla_normal_hours: 24,
    sla_low_hours: 72,
    sla_urgent_enabled: true,
    sla_high_enabled: true,
    sla_normal_enabled: true,
    sla_low_enabled: false,
    notify_channel: 'email',
    notify_new_ticket_enabled: false,
    notify_task_due_soon_enabled: false,
    notify_ticket_sla_breach_enabled: false,
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by: null,
    ...overrides,
  } as SystemSettingsRow
}

function renderPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <SettingsPage />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockGetSystemSettings.mockReset()
    mockUpdateSystemSettings.mockReset()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
  })

  it('shows a loading state while settings are being fetched', () => {
    mockGetSystemSettings.mockReturnValue(new Promise(() => {}))

    const { container } = renderPage()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders the Save/Reset buttons disabled until a field is edited', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    renderPage()

    await screen.findByText('Default priority for new tickets')

    expect(screen.getByRole('button', { name: 'Save Ticket Defaults' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('marks the Ticket card dirty and enables Save/Reset when an SLA hours input changes', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const hourInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInputs[0], { target: { value: '6' } })

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Ticket Defaults' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
  })

  it('marks the Ticket card dirty when an SLA enabled switch is toggled', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const switches = screen.getAllByRole('switch')
    // The first 4 switches belong to the Ticket Defaults table (urgent/high/normal/low).
    await user.click(switches[0])

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('marks the Ticket card dirty when the default priority Select changes', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow({ default_ticket_priority: 'normal' }))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('urgent{Enter}')

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('calls the mutation on Save and clears dirty state on success', async () => {
    const row = buildSettingsRow()
    mockGetSystemSettings.mockResolvedValue(row)
    mockUpdateSystemSettings.mockResolvedValue({ ...row, sla_urgent_hours: 6 })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const hourInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInputs[0], { target: { value: '6' } })
    await user.click(screen.getByRole('button', { name: 'Save Ticket Defaults' }))

    await waitFor(() =>
      expect(mockUpdateSystemSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sla_urgent_hours: 6 }),
        expect.anything(),
      ),
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Settings saved'))
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('reverts to server values on Reset', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow({ sla_urgent_hours: 4 }))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const hourInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInputs[0], { target: { value: '99' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')[0]).toHaveValue(4)
  })

  it('shows an error toast when saving is rejected by RLS (non-admin)', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    mockUpdateSystemSettings.mockRejectedValue(new Error('permission denied for table system_settings'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Default priority for new tickets')
    const hourInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(hourInputs[0], { target: { value: '6' } })
    await user.click(screen.getByRole('button', { name: 'Save Ticket Defaults' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: 'permission denied for table system_settings' }),
      ),
    )
  })

  it('renders the Notification Defaults switches as genuinely disabled, each wrapped in a tooltip trigger, with Save always disabled', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    const user = userEvent.setup()
    renderPage()

    const title = await screen.findByText('Notification Defaults')
    const card = title.closest('[data-slot="card"]') as HTMLElement
    expect(card).toBeTruthy()
    const notificationSwitches = within(card).getAllByRole('switch')
    expect(notificationSwitches).toHaveLength(3)
    for (const s of notificationSwitches) {
      expect(s).toBeDisabled()
      expect(s.closest('[data-slot="tooltip-trigger"]')).toBeTruthy()
    }

    await user.hover(notificationSwitches[0])
    expect(await screen.findByText('Not available yet')).toBeInTheDocument()

    expect(within(card).getByRole('button', { name: 'Save Notification Defaults' })).toBeDisabled()
  })

  it('does not let a click toggle a disabled Notification switch', async () => {
    mockGetSystemSettings.mockResolvedValue(buildSettingsRow())
    const user = userEvent.setup()
    renderPage()

    const title = await screen.findByText('Notification Defaults')
    const card = title.closest('[data-slot="card"]') as HTMLElement
    const notificationSwitch = within(card).getAllByRole('switch')[0]
    await user.click(notificationSwitch)

    expect(notificationSwitch).toHaveAttribute('data-state', 'unchecked')
  })
})
