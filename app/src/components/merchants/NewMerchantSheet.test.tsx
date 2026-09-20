import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildMerchant } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/auth/AuthProvider')
vi.mock('@/api/merchants')
vi.mock('@/api/profiles')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useAuth } from '@/auth/AuthProvider'
import { createMerchant } from '@/api/merchants'
import { listProfiles } from '@/api/profiles'
import { toast } from 'sonner'
import { NewMerchantSheet } from './NewMerchantSheet'

const mockUseAuth = vi.mocked(useAuth)
const mockCreateMerchant = vi.mocked(createMerchant)
const mockListProfiles = vi.mocked(listProfiles)

function renderSheet(onCreated = vi.fn(), onOpenChange = vi.fn()) {
  const queryClient = createTestQueryClient()
  return {
    onCreated,
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <NewMerchantSheet open onOpenChange={onOpenChange} onCreated={onCreated} />
      </QueryClientProvider>,
    ),
  }
}

describe('NewMerchantSheet', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', user: { id: 'user-1' } as never }))
    mockListProfiles.mockResolvedValue([])
  })

  it('disables the submit button until a legal name is entered', () => {
    renderSheet()
    expect(screen.getByRole('button', { name: /Create merchant/ })).toBeDisabled()
  })

  it('submits the form and calls onCreated with the new merchant id on success', async () => {
    const merchant = buildMerchant({ id: 'merchant-99', legal_name: 'New Co' })
    mockCreateMerchant.mockResolvedValue(merchant)
    const user = userEvent.setup()

    const { onCreated, onOpenChange } = renderSheet()
    await user.type(screen.getByLabelText(/Legal name/), 'New Co')
    await user.click(screen.getByRole('button', { name: /Create merchant/ }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('merchant-99'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith('New Co created')
    expect(mockCreateMerchant.mock.calls[0][0]).toEqual(
      expect.objectContaining({ legal_name: 'New Co', status: 'lead' }),
    )
  })

  it('shows an error toast when creation is rejected (e.g. support role, RLS denies insert)', async () => {
    mockCreateMerchant.mockRejectedValue(new Error('new row violates row-level security policy'))
    const user = userEvent.setup()

    renderSheet()
    await user.type(screen.getByLabelText(/Legal name/), 'New Co')
    await user.click(screen.getByRole('button', { name: /Create merchant/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't create merchant",
        expect.objectContaining({ description: expect.stringContaining('row-level security') }),
      ),
    )
  })
})
