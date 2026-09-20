import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'

vi.mock('@/auth/AuthProvider')

import { useAuth } from '@/auth/AuthProvider'
import { RequireRole, useHasRole } from './RequireRole'

const mockUseAuth = vi.mocked(useAuth)

describe('RequireRole', () => {
  it('renders children when the current role is in the allowed list', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))

    render(
      <RequireRole roles={['admin']}>
        <button>New Merchant</button>
      </RequireRole>,
    )

    expect(screen.getByText('New Merchant')).toBeInTheDocument()
  })

  it('hides children (renders null) when the role is not allowed and no fallback is given', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))

    const { container } = render(
      <RequireRole roles={['admin']}>
        <button>New Merchant</button>
      </RequireRole>,
    )

    expect(screen.queryByText('New Merchant')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the fallback when provided and the role is not allowed', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'support' }))

    render(
      <RequireRole roles={['admin']} fallback={<div>Forbidden</div>}>
        <button>New Merchant</button>
      </RequireRole>,
    )

    expect(screen.getByText('Forbidden')).toBeInTheDocument()
    expect(screen.queryByText('New Merchant')).not.toBeInTheDocument()
  })
})

describe('useHasRole', () => {
  function Probe({ roles }: { roles: Parameters<typeof useHasRole>[0] }) {
    return <span>{String(useHasRole(roles))}</span>
  }

  it('returns true when the current role is included', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'ops' }))
    render(<Probe roles={['ops', 'admin']} />)
    expect(screen.getByText('true')).toBeInTheDocument()
  })

  it('returns false when the current role is not included', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    render(<Probe roles={['ops', 'admin']} />)
    expect(screen.getByText('false')).toBeInTheDocument()
  })
})
