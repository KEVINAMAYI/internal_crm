import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMerchant } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/merchants')
vi.mock('@/hooks/useRealtimeMerchantChannel')
vi.mock('@/components/merchants/MerchantList', () => ({
  MerchantList: ({ selectedId }: { selectedId?: string }) => <div>MerchantList selected={selectedId}</div>,
}))
vi.mock('@/components/merchants/MerchantHeader', () => ({
  MerchantHeader: ({ merchant }: { merchant: { legal_name: string } }) => <div>Header: {merchant.legal_name}</div>,
}))
vi.mock('@/components/merchants/tabs/ActivityTab', () => ({ ActivityTab: ({ merchantId }: { merchantId: string }) => <div>ActivityTab {merchantId}</div> }))
vi.mock('@/components/merchants/tabs/ContactsTab', () => ({ ContactsTab: ({ merchantId }: { merchantId: string }) => <div>ContactsTab {merchantId}</div> }))
vi.mock('@/components/merchants/tabs/TicketsTab', () => ({ TicketsTab: ({ merchantId }: { merchantId: string }) => <div>TicketsTab {merchantId}</div> }))
vi.mock('@/components/merchants/tabs/TransactionsTab', () => ({ TransactionsTab: ({ merchantId }: { merchantId: string }) => <div>TransactionsTab {merchantId}</div> }))
vi.mock('@/components/merchants/tabs/TasksTab', () => ({ TasksTab: ({ merchantId }: { merchantId: string }) => <div>TasksTab {merchantId}</div> }))

import { getMerchant } from '@/api/merchants'
import { useRealtimeMerchantChannel } from '@/hooks/useRealtimeMerchantChannel'
import MerchantsPage from './MerchantsPage'

const mockGetMerchant = vi.mocked(getMerchant)
const mockUseRealtimeMerchantChannel = vi.mocked(useRealtimeMerchantChannel)

function renderPage(initialEntry: string) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/merchants" element={<MerchantsPage />} />
          <Route path="/merchants/:id" element={<MerchantsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MerchantsPage', () => {
  beforeEach(() => {
    mockGetMerchant.mockReset()
    mockUseRealtimeMerchantChannel.mockReturnValue(false)
  })

  it('prompts to select a merchant when no id is in the route', () => {
    renderPage('/merchants')
    expect(screen.getByText('Select a merchant to view details.')).toBeInTheDocument()
  })

  it('shows a loading skeleton while the merchant is fetching', () => {
    mockGetMerchant.mockReturnValue(new Promise(() => {}))
    const { container } = renderPage('/merchants/merchant-1')
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an error alert when the merchant fails to load', async () => {
    mockGetMerchant.mockRejectedValue(new Error('not found'))
    renderPage('/merchants/merchant-1')
    expect(await screen.findByText("Couldn't load merchant")).toBeInTheDocument()
  })

  it('renders the header and the default (activity) tab once loaded', async () => {
    const merchant = buildMerchant({ id: 'merchant-1', legal_name: 'Acme Corp' })
    mockGetMerchant.mockResolvedValue(merchant)

    renderPage('/merchants/merchant-1')

    expect(await screen.findByText('Header: Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('ActivityTab merchant-1')).toBeInTheDocument()
  })

  it('switches tabs when a tab trigger is clicked', async () => {
    const merchant = buildMerchant({ id: 'merchant-1', legal_name: 'Acme Corp' })
    mockGetMerchant.mockResolvedValue(merchant)
    const user = userEvent.setup()

    renderPage('/merchants/merchant-1')
    await screen.findByText('Header: Acme Corp')
    await user.click(screen.getByRole('tab', { name: 'Contacts' }))

    await waitFor(() => expect(screen.getByText('ContactsTab merchant-1')).toBeInTheDocument())
  })

  it('honors the ?tab= query param as the initial tab', async () => {
    const merchant = buildMerchant({ id: 'merchant-1' })
    mockGetMerchant.mockResolvedValue(merchant)

    renderPage('/merchants/merchant-1?tab=tickets')

    expect(await screen.findByText('TicketsTab merchant-1')).toBeInTheDocument()
  })

  it('shows a "live" indicator once the realtime channel connects', async () => {
    const merchant = buildMerchant({ id: 'merchant-1' })
    mockGetMerchant.mockResolvedValue(merchant)
    mockUseRealtimeMerchantChannel.mockReturnValue(true)

    renderPage('/merchants/merchant-1')

    expect(await screen.findByText('live')).toBeInTheDocument()
  })

  it('shows "connecting" while the realtime channel is not yet subscribed', async () => {
    const merchant = buildMerchant({ id: 'merchant-1' })
    mockGetMerchant.mockResolvedValue(merchant)
    mockUseRealtimeMerchantChannel.mockReturnValue(false)

    renderPage('/merchants/merchant-1')

    expect(await screen.findByText('connecting')).toBeInTheDocument()
  })
})
