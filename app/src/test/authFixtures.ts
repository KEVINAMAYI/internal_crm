import type { User } from '@supabase/supabase-js'
import { vi } from 'vitest'
import type { UserRole } from '@/lib/roles'

export type AuthContextValue = {
  session: unknown
  user: User | null
  role: UserRole
  loading: boolean
  signOut: () => Promise<void>
}

export function buildAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: { access_token: 'token', user: { id: 'user-1' } },
    user: { id: 'user-1', email: 'jane@example.com' } as User,
    role: 'sales',
    loading: false,
    signOut: vi.fn(async () => {}),
    ...overrides,
  }
}
