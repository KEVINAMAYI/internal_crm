import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'

describe('queryKeys', () => {
  it('builds a stable merchants.list key including filters', () => {
    const filters = { q: 'acme', page: 0 }
    expect(queryKeys.merchants.list(filters)).toEqual(['merchants', 'list', filters])
  })

  it('builds merchants.detail and merchants.summary keys scoped to an id', () => {
    expect(queryKeys.merchants.detail('m1')).toEqual(['merchants', 'detail', 'm1'])
    expect(queryKeys.merchants.summary('m1')).toEqual(['merchants', 'summary', 'm1'])
  })

  it('builds a contacts.list key scoped to a merchant', () => {
    expect(queryKeys.contacts.list('m1')).toEqual(['contacts', 'm1'])
  })

  it('builds a transactions.list key including page and filters', () => {
    expect(queryKeys.transactions.list('m1', 2, { status: 'settled' })).toEqual([
      'transactions',
      'm1',
      2,
      { status: 'settled' },
    ])
  })

  it('builds distinct tickets keys for merchant scope vs. global queue', () => {
    expect(queryKeys.tickets.forMerchant('m1')).toEqual(['tickets', 'merchant', 'm1'])
    expect(queryKeys.tickets.queue({ status: 'open' })).toEqual(['tickets', 'queue', { status: 'open' }])
  })

  it('builds an activities.list key scoped to a merchant', () => {
    expect(queryKeys.activities.list('m1')).toEqual(['activities', 'm1'])
  })

  it('builds a tasks.list key including filters', () => {
    expect(queryKeys.tasks.list({ view: 'mine' })).toEqual(['tasks', 'list', { view: 'mine' }])
  })

  it('builds profiles.all and profiles.me keys, tolerating an undefined userId', () => {
    expect(queryKeys.profiles.all()).toEqual(['profiles', 'all'])
    expect(queryKeys.profiles.me('u1')).toEqual(['profiles', 'me', 'u1'])
    expect(queryKeys.profiles.me(undefined)).toEqual(['profiles', 'me', undefined])
  })

  it('builds a search.global key scoped to the query string', () => {
    expect(queryKeys.search.global('acme')).toEqual(['search', 'global', 'acme'])
  })
})
