import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMerchant } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/merchants')
vi.mock('@/api/profiles')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { updateMerchant } from '@/api/merchants'
import { listProfiles } from '@/api/profiles'
import { toast } from 'sonner'
import { EditMerchantSheet } from './EditMerchantSheet'

const mockUpdateMerchant = vi.mocked(updateMerchant)
const mockListProfiles = vi.mocked(listProfiles)

function renderSheet(merchant: ReturnType<typeof buildMerchant>, onOpenChange = vi.fn()) {
  const queryClient = createTestQueryClient()
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditMerchantSheet merchant={merchant} open onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ),
  }
}

describe('EditMerchantSheet', () => {
  beforeEach(() => {
    mockListProfiles.mockResolvedValue([])
  })

  it('pre-fills the form with the merchant’s current details', () => {
    const merchant = buildMerchant({ legal_name: 'Acme Corp', dba_name: 'Acme', mcc: '5411' })
    renderSheet(merchant)

    expect(screen.getByLabelText(/Legal name/)).toHaveValue('Acme Corp')
    expect(screen.getByLabelText(/DBA name/)).toHaveValue('Acme')
    expect(screen.getByLabelText(/MCC/)).toHaveValue('5411')
  })

  it('submits the patched fields and closes on success', async () => {
    const merchant = buildMerchant({ legal_name: 'Acme Corp' })
    mockUpdateMerchant.mockResolvedValue({ ...merchant, legal_name: 'Acme Corp Updated' })
    const user = userEvent.setup()

    const { onOpenChange } = renderSheet(merchant)
    await user.clear(screen.getByLabelText(/Legal name/))
    await user.type(screen.getByLabelText(/Legal name/), 'Acme Corp Updated')
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(toast.success).toHaveBeenCalledWith('Merchant updated')
    expect(mockUpdateMerchant.mock.calls[0][0]).toBe(merchant.id)
    expect(mockUpdateMerchant.mock.calls[0][1]).toEqual(
      expect.objectContaining({ legal_name: 'Acme Corp Updated' }),
    )
  })

  it('shows an error toast when the update is rejected by RLS', async () => {
    const merchant = buildMerchant()
    mockUpdateMerchant.mockRejectedValue(new Error('new row violates row-level security policy'))
    const user = userEvent.setup()

    renderSheet(merchant)
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You don't have permission to do that",
        expect.objectContaining({ description: expect.stringContaining('row-level security') }),
      ),
    )
  })
})
