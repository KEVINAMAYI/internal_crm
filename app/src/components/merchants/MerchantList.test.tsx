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

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { useAuth } from '@/auth/AuthProvider'
import { listMerchants } from '@/api/merchants'
import { listProfiles } from '@/api/profiles'
import { MerchantList } from './MerchantList'

const mockUseAuth = vi.mocked(useAuth)
const mockListMerchants = vi.mocked(listMerchants)
const mockListProfiles = vi.mocked(listProfiles)

function renderList(selectedId?: string) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MerchantList selectedId={selectedId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MerchantList', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    mockListProfiles.mockResolvedValue([])
  })

  it('shows loading skeletons while the list is loading', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockListMerchants.mockReturnValue(new Promise(() => {}))

    const { container } = renderList()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no merchants', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })

    renderList()

    expect(await screen.findByText('No merchants found.')).toBeInTheDocument()
  })

  it('renders merchant rows with status and owner', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const merchant = buildMerchant({ legal_name: 'Acme Corp', dba_name: 'Acme' })
    mockListMerchants.mockResolvedValue({
      data: [{ ...merchant, owner: { full_name: 'Jane Doe' } }],
      count: 1,
    })

    renderList()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('1 merchants')).toBeInTheDocument()
  })

  it('navigates to the merchant detail page when a row is clicked', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    const merchant = buildMerchant({ id: 'merchant-42', legal_name: 'Acme Corp', dba_name: null })
    mockListMerchants.mockResolvedValue({ data: [{ ...merchant, owner: null }], count: 1 })
    const user = userEvent.setup()

    renderList()
    await user.click(await screen.findByText('Acme Corp'))

    expect(navigateMock).toHaveBeenCalledWith('/merchants/merchant-42')
  })

  it('shows the "New" button for roles that can create merchants', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    mockListMerchants.mockReturnValue(new Promise(() => {}))

    renderList()

    expect(screen.getByRole('button', { name: /New/ })).toBeInTheDocument()
  })

  it('hides the "New" button for support (cannot create merchants)', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))
    mockListMerchants.mockReturnValue(new Promise(() => {}))

    renderList()

    expect(screen.queryByRole('button', { name: /New/ })).not.toBeInTheDocument()
  })

  it('debounces the search input before triggering a new query', async () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockListMerchants.mockResolvedValue({ data: [], count: 0 })
    const user = userEvent.setup()

    renderList()
    await screen.findByText('No merchants found.')
    mockListMerchants.mockClear()

    await user.type(screen.getByPlaceholderText('Search merchants…'), 'acme')

    await waitFor(() =>
      expect(mockListMerchants).toHaveBeenCalledWith(expect.objectContaining({ q: 'acme' })),
    )
  })
})
