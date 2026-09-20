import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildMerchant } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/merchants')

import { listMerchants } from '@/api/merchants'
import { MerchantCombobox } from './MerchantCombobox'

const mockListMerchants = vi.mocked(listMerchants)

function renderCombobox(value = '', onChange = vi.fn()) {
  const queryClient = createTestQueryClient()
  return {
    onChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MerchantCombobox value={value} onChange={onChange} />
      </QueryClientProvider>,
    ),
  }
}

describe('MerchantCombobox', () => {
  it('shows the unlinked placeholder when no merchant is selected', () => {
    renderCombobox()
    expect(screen.getByText('No merchant (unlinked)')).toBeInTheDocument()
  })

  it('shows the selected merchant’s dba/legal name once its data has loaded', async () => {
    const merchant = buildMerchant({ id: 'merchant-1', legal_name: 'Acme Corp', dba_name: 'Acme' })
    mockListMerchants.mockResolvedValue({ data: [merchant], count: 1 })
    const user = userEvent.setup()

    renderCombobox('merchant-1')
    await user.click(screen.getByRole('combobox'))

    expect(await screen.findAllByText('Acme')).not.toHaveLength(0)
  })

  it('lets the user pick a merchant from the list, calling onChange with its id', async () => {
    const merchant = buildMerchant({ id: 'merchant-7', legal_name: 'Beta Inc', dba_name: null })
    mockListMerchants.mockResolvedValue({ data: [merchant], count: 1 })
    const user = userEvent.setup()

    const { onChange } = renderCombobox()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Beta Inc'))

    expect(onChange).toHaveBeenCalledWith('merchant-7')
  })

  it('lets the user clear the selection via "No merchant (unlinked)"', async () => {
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })
    const user = userEvent.setup()

    const { onChange } = renderCombobox('merchant-1')
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'No merchant (unlinked)' }))

    expect(onChange).toHaveBeenCalledWith('')
  })
})
