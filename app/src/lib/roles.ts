import type { Database } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']

export const ALL_ROLES: UserRole[] = ['sales', 'support', 'ops', 'admin']

/** Role matrix from docs/ui_ux_plan.md §5 — UI convenience only, RLS is the real gate. */
export const canCreateMerchant = (role: UserRole) =>
  role === 'sales' || role === 'ops' || role === 'admin'

export const canEditMerchant = (role: UserRole, ownerId: string | null, userId: string) =>
  role === 'ops' || role === 'admin' || (role === 'sales' && ownerId === userId)

export const canChangeMerchantStatusOrOwner = (role: UserRole, ownerId: string | null, userId: string) =>
  role === 'ops' || role === 'admin' || (role === 'sales' && ownerId === userId)

export const canWriteContacts = (_role: UserRole) => true

export const canWriteTickets = (role: UserRole) =>
  role === 'support' || role === 'ops' || role === 'admin'

export const canEditActivity = (authorId: string, userId: string, role: UserRole) =>
  authorId === userId || role === 'ops' || role === 'admin'

export const canWriteTask = (
  role: UserRole,
  createdBy: string,
  assigneeId: string | null,
  userId: string,
) => role === 'ops' || role === 'admin' || createdBy === userId || assigneeId === userId

export const isAdmin = (role: UserRole) => role === 'admin'

export const roleLabel: Record<UserRole, string> = {
  sales: 'Sales',
  support: 'Support',
  ops: 'Ops',
  admin: 'Admin',
}
