import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildMerchant } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/merchants')
vi.mock('@/api/profiles')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { getMerchantSummary, updateMerchant } from '@/api/merchants'
import { listProfiles } from '@/api/profiles'
import { toast } from 'sonner'
import { MerchantHeader } from './MerchantHeader'

const mockUseAuth = vi.mocked(useAuth)
const mockGetMerchantSummary = vi.mocked(getMerchantSummary)
const mockUpdateMerchant = vi.mocked(updateMerchant)
const mockListProfiles = vi.mocked(listProfiles)

function renderHeader(merchant: ReturnType<typeof buildMerchant>, onTabChange = vi.fn()) {
  const queryClient = createTestQueryClient()
  return {
    onTabChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {/* @ts-expect-error - partial merchant shape is sufficient for this component's usage */}
          <MerchantHeader merchant={merchant} onTabChange={onTabChange} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('MerchantHeader', () => {
  beforeEach(() => {
    mockListProfiles.mockResolvedValue([])
    mockGetMerchantSummary.mockResolvedValue({ txn_count: 3, volume_cents: 150000, open_tickets: 1 })
  })

  it('renders merchant name, dba, and metadata', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops', user: { id: 'owner-1' } as never }))
    const merchant = { ...buildMerchant({ legal_name: 'Acme Corp', dba_name: 'Acme', owner_id: 'owner-1' }), owner: { id: 'owner-1', full_name: 'Jane Doe', email: 'jane@x.com' }, contacts: [] }

    renderHeader(merchant)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('dba "Acme"')).toBeInTheDocument()
    expect(screen.getByText('Owner: Jane Doe')).toBeInTheDocument()
  })

  it('shows the 30-day summary once loaded', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    const merchant = { ...buildMerchant(), owner: null, contacts: [] }

    renderHeader(merchant)

    expect(await screen.findByText('$1,500.00')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows a read-only status badge (not a Select) for a sales user who does not own the merchant', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
    const merchant = { ...buildMerchant({ owner_id: 'someone-else', status: 'active' }), owner: null, contacts: [] }

    renderHeader(merchant)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows an editable status Select for ops', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    const merchant = { ...buildMerchant({ status: 'active' }), owner: null, contacts: [] }

    renderHeader(merchant)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('hides the "Edit Merchant" button for a non-owning sales user', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
    const merchant = { ...buildMerchant({ owner_id: 'someone-else' }), owner: null, contacts: [] }

    renderHeader(merchant)

    expect(screen.queryByRole('button', { name: /Edit Merchant/ })).not.toBeInTheDocument()
  })

  it('shows the "Edit Merchant" button for the owning sales user', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
    const merchant = { ...buildMerchant({ owner_id: 'user-1' }), owner: null, contacts: [] }

    renderHeader(merchant)

    expect(screen.getByRole('button', { name: /Edit Merchant/ })).toBeInTheDocument()
  })

  it('calls onTabChange for the quick-action buttons', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    const merchant = { ...buildMerchant(), owner: null, contacts: [] }
    const user = userEvent.setup()

    const { onTabChange } = renderHeader(merchant)
    await user.click(screen.getByRole('button', { name: /Log Activity/ }))
    await user.click(screen.getByRole('button', { name: /New Ticket/ }))
    await user.click(screen.getByRole('button', { name: /New Task/ }))

    expect(onTabChange).toHaveBeenNthCalledWith(1, 'activity')
    expect(onTabChange).toHaveBeenNthCalledWith(2, 'tickets')
    expect(onTabChange).toHaveBeenNthCalledWith(3, 'tasks')
  })

  it('changing the status Select triggers an optimistic update and shows an error toast on RLS rejection', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    mockUpdateMerchant.mockRejectedValue(new Error('new row violates row-level security policy'))
    const merchant = { ...buildMerchant({ status: 'active' }), owner: null, contacts: [] }
    const user = userEvent.setup()

    renderHeader(merchant)
    screen.getByRole('combobox').focus()
    await user.keyboard('{Enter}')
    await user.keyboard('s{Enter}') // "suspended" is the only status starting with "s"

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: expect.stringContaining('row-level security') }),
      ),
    )
  })
})
