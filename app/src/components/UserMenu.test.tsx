import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { buildProfile } from '@/test/factories'
import { buildAuthValue } from '@/test/authFixtures'

vi.mock('@/auth/AuthProvider')
vi.mock('@/hooks/useMyProfile')

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { useAuth } from '@/auth/AuthProvider'
import { useMyProfile } from '@/hooks/useMyProfile'
import { UserMenu } from './UserMenu'

const mockUseAuth = vi.mocked(useAuth)
const mockUseMyProfile = vi.mocked(useMyProfile)

function renderUserMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  )
}

describe('UserMenu', () => {
  it('shows a loading placeholder while the profile is not yet fetched', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockUseMyProfile.mockReturnValue({ data: undefined } as ReturnType<typeof useMyProfile>)

    renderUserMenu()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
  })

  it('shows the profile name and role badge once loaded', () => {
    const profile = buildProfile({ full_name: 'Jane Doe', email: 'jane@example.com' })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'admin' }))
    mockUseMyProfile.mockReturnValue({ data: profile } as ReturnType<typeof useMyProfile>)

    renderUserMenu()

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  // These two use keyboard interaction (focus + Enter/ArrowDown) rather than
  // `user.click()` to open/navigate the Radix DropdownMenu. Clicking a Radix trigger a
  // second time within the same jsdom `document` in the same test file leaves the
  // pointer/mouse "button held" state corrupted inside @testing-library/user-event
  // (a documented jsdom + user-event + Radix interaction, not an application bug),
  // silently preventing the menu from reopening. Keyboard interaction sidesteps that and
  // is equally valid coverage of the same user-facing behavior (and of keyboard a11y).
  it('opens the dropdown and navigates to /profile on "My Profile"', async () => {
    const user = userEvent.setup()
    const profile = buildProfile({ full_name: 'Jane Doe' })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales' }))
    mockUseMyProfile.mockReturnValue({ data: profile } as ReturnType<typeof useMyProfile>)

    renderUserMenu()
    screen.getByRole('button', { name: /Jane Doe/ }).focus()
    await user.keyboard('{Enter}')
    await screen.findByText('My Profile')
    await user.keyboard('{Enter}')

    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('calls signOut when "Sign out" is selected', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    const profile = buildProfile({ full_name: 'Jane Doe' })
    mockUseAuth.mockReturnValue(buildAuthValue({ role: 'sales', signOut }))
    mockUseMyProfile.mockReturnValue({ data: profile } as ReturnType<typeof useMyProfile>)

    renderUserMenu()
    screen.getByRole('button', { name: /Jane Doe/ }).focus()
    await user.keyboard('{Enter}')
    await screen.findByText('Sign out')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(signOut).toHaveBeenCalled()
  })
})
