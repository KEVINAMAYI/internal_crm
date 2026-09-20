import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildContact } from '@/test/factories'
import { createTestQueryClient } from '@/test/renderWithProviders'

vi.mock('@/api/contacts')
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { createContact, listContacts, updateContact } from '@/api/contacts'
import { toast } from 'sonner'
import { ContactsTab } from './ContactsTab'

const mockListContacts = vi.mocked(listContacts)
const mockCreateContact = vi.mocked(createContact)
const mockUpdateContact = vi.mocked(updateContact)

function renderTab(merchantId = 'merchant-1') {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ContactsTab merchantId={merchantId} />
    </QueryClientProvider>,
  )
}

describe('ContactsTab', () => {
  beforeEach(() => {
    mockListContacts.mockReset()
    mockCreateContact.mockReset()
    mockUpdateContact.mockReset()
  })

  it('shows an empty state with an "Add contact" affordance', async () => {
    mockListContacts.mockResolvedValue([])
    renderTab()
    expect(await screen.findByText('No contacts yet.')).toBeInTheDocument()
  })

  it('renders a table of contacts, marking the primary one', async () => {
    const contact = buildContact({ name: 'John Contact', is_primary: true })
    mockListContacts.mockResolvedValue([contact])

    renderTab()

    expect(await screen.findByText('John Contact')).toBeInTheDocument()
    expect(screen.getByText('1 contact')).toBeInTheDocument()
  })

  it('creates a new contact via the dialog', async () => {
    mockListContacts.mockResolvedValue([])
    mockCreateContact.mockResolvedValue(buildContact({ name: 'New Contact' }))
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No contacts yet.')
    await user.click(screen.getAllByRole('button', { name: /Add contact/ })[0])
    await user.type(screen.getByLabelText(/Name/), 'New Contact')
    await user.click(screen.getByRole('button', { name: /^Add contact$/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contact added'))
    expect(mockCreateContact.mock.calls[0][0]).toEqual(
      expect.objectContaining({ merchant_id: 'merchant-1', name: 'New Contact' }),
    )
  })

  it('edits an existing contact, pre-filling the dialog', async () => {
    const contact = buildContact({ id: 'contact-9', name: 'Jane Existing', title: 'CFO' })
    mockListContacts.mockResolvedValue([contact])
    mockUpdateContact.mockResolvedValue({ ...contact, title: 'CEO' })
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('Jane Existing')
    await user.click(screen.getByRole('button', { name: '' })) // pencil icon-only edit button

    const titleInput = await screen.findByLabelText('Title')
    expect(titleInput).toHaveValue('CFO')
    await user.clear(titleInput)
    await user.type(titleInput, 'CEO')
    await user.click(screen.getByRole('button', { name: /Save changes/ }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contact updated'))
    expect(mockUpdateContact.mock.calls[0][0]).toBe('contact-9')
    expect(mockUpdateContact.mock.calls[0][1]).toEqual(expect.objectContaining({ title: 'CEO' }))
  })

  it('shows an error toast when creation fails', async () => {
    mockListContacts.mockResolvedValue([])
    mockCreateContact.mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No contacts yet.')
    await user.click(screen.getAllByRole('button', { name: /Add contact/ })[0])
    await user.type(screen.getByLabelText(/Name/), 'X')
    await user.click(screen.getByRole('button', { name: /^Add contact$/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't add contact", expect.objectContaining({ description: 'denied' })),
    )
  })
})
