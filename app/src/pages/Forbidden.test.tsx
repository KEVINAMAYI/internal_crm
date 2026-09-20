import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Forbidden from './Forbidden'

describe('Forbidden', () => {
  it('renders an access-denied message and a link back to Merchants', () => {
    render(
      <MemoryRouter>
        <Forbidden />
      </MemoryRouter>,
    )

    expect(screen.getByText("You don't have access")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Merchants' })).toHaveAttribute('href', '/merchants')
  })
})
