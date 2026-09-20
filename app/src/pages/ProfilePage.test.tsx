import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildAuthValue } from '@/test/authFixtures'
import { buildProfile } from '@/test/factories'

vi.mock('@/auth/AuthProvider')
vi.mock('@/hooks/useMyProfile')

import { useAuth } from '@/auth/AuthProvider'
import { useMyProfile } from '@/hooks/useMyProfile'
import ProfilePage from './ProfilePage'

const mockUseAuth = vi.mocked(useAuth)
const mockUseMyProfile = vi.mocked(useMyProfile)

describe('ProfilePage', () => {
  it('shows a loading placeholder while the profile is fetching', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockUseMyProfile.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useMyProfile>)

    render(<ProfilePage />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the profile details and role once loaded', () => {
    const profile = buildProfile({ full_name: 'Jane Doe', email: 'jane@example.com', is_active: true })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    mockUseMyProfile.mockReturnValue({ data: profile, isLoading: false } as ReturnType<typeof useMyProfile>)

    render(<ProfilePage />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Inactive when the profile is disabled', () => {
    const profile = buildProfile({ is_active: false })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockUseMyProfile.mockReturnValue({ data: profile, isLoading: false } as ReturnType<typeof useMyProfile>)

    render(<ProfilePage />)

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('calls signOut when the sign-out button is clicked', async () => {
    const signOut = vi.fn()
    const profile = buildProfile()
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', signOut }))
    mockUseMyProfile.mockReturnValue({ data: profile, isLoading: false } as ReturnType<typeof useMyProfile>)
    const user = userEvent.setup()

    render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: /Sign out/ }))

    expect(signOut).toHaveBeenCalled()
  })

  it('toggles the theme preference label when the appearance button is clicked', async () => {
    const profile = buildProfile()
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockUseMyProfile.mockReturnValue({ data: profile, isLoading: false } as ReturnType<typeof useMyProfile>)
    const user = userEvent.setup()

    render(<ProfilePage />)
    const button = screen.getByRole('button', { name: /(Light|Dark) mode/ })
    const initialLabel = button.textContent

    await user.click(button)

    expect(button.textContent).not.toBe(initialLabel)
  })
})
