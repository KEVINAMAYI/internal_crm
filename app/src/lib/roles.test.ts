import { describe, expect, it } from 'vitest'
import {
  ALL_ROLES,
  canChangeMerchantStatusOrOwner,
  canCreateMerchant,
  canEditActivity,
  canEditMerchant,
  canWriteContacts,
  canWriteTask,
  canWriteTickets,
  isAdmin,
  roleLabel,
} from './roles'

describe('ALL_ROLES', () => {
  it('lists exactly the four roles', () => {
    expect(ALL_ROLES).toEqual(['sales', 'support', 'ops', 'admin'])
  })
})

describe('canCreateMerchant', () => {
  it.each(['sales', 'ops', 'admin'] as const)('allows %s', (role) => {
    expect(canCreateMerchant(role)).toBe(true)
  })

  it('denies support', () => {
    expect(canCreateMerchant('support')).toBe(false)
  })
})

describe('canEditMerchant', () => {
  it('allows ops regardless of ownership', () => {
    expect(canEditMerchant('ops', 'someone-else', 'user-1')).toBe(true)
  })

  it('allows admin regardless of ownership', () => {
    expect(canEditMerchant('admin', 'someone-else', 'user-1')).toBe(true)
  })

  it('allows sales who owns the merchant', () => {
    expect(canEditMerchant('sales', 'user-1', 'user-1')).toBe(true)
  })

  it('denies sales who does not own the merchant', () => {
    expect(canEditMerchant('sales', 'someone-else', 'user-1')).toBe(false)
  })

  it('denies sales when merchant has no owner', () => {
    expect(canEditMerchant('sales', null, 'user-1')).toBe(false)
  })

  it('denies support unconditionally', () => {
    expect(canEditMerchant('support', 'user-1', 'user-1')).toBe(false)
  })
})

describe('canChangeMerchantStatusOrOwner', () => {
  it('mirrors canEditMerchant rules', () => {
    expect(canChangeMerchantStatusOrOwner('ops', null, 'user-1')).toBe(true)
    expect(canChangeMerchantStatusOrOwner('sales', 'user-1', 'user-1')).toBe(true)
    expect(canChangeMerchantStatusOrOwner('sales', 'other', 'user-1')).toBe(false)
    expect(canChangeMerchantStatusOrOwner('support', 'user-1', 'user-1')).toBe(false)
  })
})

describe('canWriteContacts', () => {
  it('allows every role', () => {
    for (const role of ALL_ROLES) {
      expect(canWriteContacts(role)).toBe(true)
    }
  })
})

describe('canWriteTickets', () => {
  it('allows support, ops, admin', () => {
    expect(canWriteTickets('support')).toBe(true)
    expect(canWriteTickets('ops')).toBe(true)
    expect(canWriteTickets('admin')).toBe(true)
  })

  it('denies sales', () => {
    expect(canWriteTickets('sales')).toBe(false)
  })
})

describe('canEditActivity', () => {
  it('allows the author', () => {
    expect(canEditActivity('user-1', 'user-1', 'sales')).toBe(true)
  })

  it('allows ops/admin editing someone else’s activity', () => {
    expect(canEditActivity('author-1', 'user-1', 'ops')).toBe(true)
    expect(canEditActivity('author-1', 'user-1', 'admin')).toBe(true)
  })

  it('denies a non-author, non-ops/admin role', () => {
    expect(canEditActivity('author-1', 'user-1', 'sales')).toBe(false)
    expect(canEditActivity('author-1', 'user-1', 'support')).toBe(false)
  })
})

describe('canWriteTask', () => {
  it('allows ops and admin unconditionally', () => {
    expect(canWriteTask('ops', 'someone', null, 'user-1')).toBe(true)
    expect(canWriteTask('admin', 'someone', null, 'user-1')).toBe(true)
  })

  it('allows the creator', () => {
    expect(canWriteTask('sales', 'user-1', null, 'user-1')).toBe(true)
  })

  it('allows the assignee', () => {
    expect(canWriteTask('support', 'someone-else', 'user-1', 'user-1')).toBe(true)
  })

  it('denies an unrelated sales/support user', () => {
    expect(canWriteTask('sales', 'someone-else', 'someone-else-too', 'user-1')).toBe(false)
  })
})

describe('isAdmin', () => {
  it('is true only for admin', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('ops')).toBe(false)
    expect(isAdmin('sales')).toBe(false)
    expect(isAdmin('support')).toBe(false)
  })
})

describe('roleLabel', () => {
  it('has a human label for every role', () => {
    for (const role of ALL_ROLES) {
      expect(roleLabel[role]).toBeTruthy()
    }
  })
})
