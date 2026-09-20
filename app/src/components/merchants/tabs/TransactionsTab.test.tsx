import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTransaction } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/transactions')

import { listTransactions } from '@/api/transactions'
import { TransactionsTab } from './TransactionsTab'

const mockListTransactions = vi.mocked(listTransactions)

function renderTab(merchantId = 'merchant-1') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionsTab merchantId={merchantId} />
    </QueryClientProvider>,
  )
}

// Transactions are strictly read-only to every app role (CLAUDE.md) — this component and
// `api/transactions.ts` never expose a create/update/delete path, so these tests only cover
// read/display/pagination/filter behavior, never a write.
describe('TransactionsTab', () => {
  beforeEach(() => {
    mockListTransactions.mockReset()
  })

  it('always shows the read-only notice', async () => {
    mockListTransactions.mockResolvedValue({ data: [], count: 0 })
    renderTab()
    expect(await screen.findByText(/Read-only/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no transactions', async () => {
    mockListTransactions.mockResolvedValue({ data: [], count: 0 })
    renderTab()
    expect(await screen.findByText('No transactions for this merchant yet.')).toBeInTheDocument()
  })

  it('renders a table of transactions with formatted amount/date/status', async () => {
    const txn = buildTransaction({ amount_cents: 12345, currency: 'USD', status: 'settled' })
    mockListTransactions.mockResolvedValue({ data: [txn], count: 1 })

    renderTab()

    expect(await screen.findByText('$123.45')).toBeInTheDocument()
    expect(screen.getByText('settled')).toBeInTheDocument()
  })

  it('does not render any create/edit/delete affordance anywhere on the tab', async () => {
    const txn = buildTransaction()
    mockListTransactions.mockResolvedValue({ data: [txn], count: 1 })

    renderTab()
    await screen.findByText(txn.external_id!)

    expect(screen.queryByRole('button', { name: /new|create|add|edit|delete/i })).not.toBeInTheDocument()
  })

  it('shows pagination controls scoped to the total count', async () => {
    const txns = Array.from({ length: 25 }, (_, i) => buildTransaction({ external_id: `ext-${i}` }))
    mockListTransactions.mockResolvedValue({ data: txns, count: 60 })

    renderTab()

    expect(await screen.findByText('Showing 1–25 of 60')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('scopes the query to the given merchant id', async () => {
    mockListTransactions.mockResolvedValue({ data: [], count: 0 })
    renderTab('merchant-42')
    await screen.findByText('No transactions for this merchant yet.')
    expect(mockListTransactions).toHaveBeenCalledWith('merchant-42', expect.anything())
  })
})
