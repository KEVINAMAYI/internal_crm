import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import type { UserRole } from '@/lib/roles'

/**
 * Hides children unless the current role is role-eligible.
 * UX convenience only — RLS is the real permission boundary.
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { role } = useAuth()
  if (!roles.includes(role)) return <>{fallback}</>
  return <>{children}</>
}

export function useHasRole(roles: UserRole[]) {
  const { role } = useAuth()
  return roles.includes(role)
}
