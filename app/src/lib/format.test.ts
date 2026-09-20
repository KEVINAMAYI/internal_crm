import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDate, formatDateTime, formatMoney, formatRelativeTime, initials } from './format'

describe('formatMoney', () => {
  it('formats cents as USD by default', () => {
    expect(formatMoney(12345)).toBe('$123.45')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('respects an explicit currency', () => {
    expect(formatMoney(500, 'EUR')).toContain('5.00')
  })

  it('formats negative amounts (refunds)', () => {
    expect(formatMoney(-1000)).toBe('-$10.00')
  })
})

describe('formatDate', () => {
  it('returns an em-dash for null/undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats an ISO date string', () => {
    expect(formatDate('2026-01-15T00:00:00.000Z')).toMatch(/Jan/)
  })
})

describe('formatDateTime', () => {
  it('returns an em-dash for null/undefined', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('formats an ISO datetime string with a time component', () => {
    const result = formatDateTime('2026-01-15T14:30:00.000Z')
    expect(result).toMatch(/Jan/)
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns an em-dash for null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('—')
    expect(formatRelativeTime(undefined)).toBe('—')
  })

  it('formats minutes ago', () => {
    expect(formatRelativeTime('2026-01-15T11:45:00.000Z')).toMatch(/minute/)
  })

  it('formats hours ago', () => {
    expect(formatRelativeTime('2026-01-15T09:00:00.000Z')).toMatch(/hour/)
  })

  it('formats days ago', () => {
    expect(formatRelativeTime('2026-01-12T12:00:00.000Z')).toMatch(/day/)
  })

  it('formats months ago', () => {
    expect(formatRelativeTime('2025-10-01T12:00:00.000Z')).toMatch(/month/)
  })

  it('formats a future time', () => {
    expect(formatRelativeTime('2026-01-15T12:30:00.000Z')).toMatch(/minute/)
  })
})

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Jane Doe')).toBe('JD')
  })

  it('uppercases single-word names', () => {
    expect(initials('cher')).toBe('C')
  })

  it('caps at two initials for long names', () => {
    expect(initials('John Jacob Jingleheimer Schmidt')).toBe('JJ')
  })

  it('handles extra whitespace between words gracefully', () => {
    expect(initials('Jane  Doe')).toBe('JD')
  })
})
