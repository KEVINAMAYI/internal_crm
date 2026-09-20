import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  MerchantStatusBadge,
  TaskStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
  TxnStatusBadge,
} from './status-badges'

describe('MerchantStatusBadge', () => {
  it.each(['lead', 'onboarding', 'active', 'suspended', 'churned'] as const)('renders the %s status', (status) => {
    render(<MerchantStatusBadge status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})

describe('TicketStatusBadge', () => {
  it.each(['open', 'pending', 'resolved', 'closed'] as const)('renders the %s status', (status) => {
    render(<TicketStatusBadge status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})

describe('TicketPriorityBadge', () => {
  it.each(['low', 'normal', 'high', 'urgent'] as const)('renders the %s priority', (priority) => {
    render(<TicketPriorityBadge priority={priority} />)
    expect(screen.getByText(priority)).toBeInTheDocument()
  })
})

describe('TaskStatusBadge', () => {
  it.each(['todo', 'in_progress', 'done', 'cancelled'] as const)('renders the %s status', (status) => {
    render(<TaskStatusBadge status={status} />)
    expect(screen.getByText(status.replace('_', ' '))).toBeInTheDocument()
  })
})

describe('TxnStatusBadge', () => {
  it.each(['pending', 'settled', 'refunded', 'failed', 'chargeback'] as const)('renders the %s status', (status) => {
    render(<TxnStatusBadge status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})
