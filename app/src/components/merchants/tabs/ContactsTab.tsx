import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Star, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  createContact,
  listContacts,
  updateContact,
  type ContactRow,
} from '@/api/contacts'
import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type FormState = { name: string; email: string; phone: string; title: string; is_primary: boolean }
const emptyForm: FormState = { name: '', email: '', phone: '', title: '', is_primary: false }

export function ContactsTab({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContactRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: contacts, isLoading } = useQuery({
    queryKey: queryKeys.contacts.list(merchantId),
    queryFn: () => listContacts(merchantId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list(merchantId) })

  const createMutation = useMutation({
    mutationFn: () =>
      createContact({
        merchant_id: merchantId,
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title || null,
        is_primary: form.is_primary,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Contact added')
      setDialogOpen(false)
    },
    onError: (error: Error) => toast.error("Couldn't add contact", { description: error.message }),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateContact(editing!.id, {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title || null,
        is_primary: form.is_primary,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Contact updated')
      setDialogOpen(false)
    },
    onError: (error: Error) => toast.error("Couldn't update contact", { description: error.message }),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (c: ContactRow) => {
    setEditing(c)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', title: c.title ?? '', is_primary: c.is_primary })
    setDialogOpen(true)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {contacts?.length ?? 0} contact{contacts?.length === 1 ? '' : 's'}
        </h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Add contact
        </Button>
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && contacts?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UserRound className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add contact
          </Button>
        </div>
      )}

      {!!contacts?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="flex items-center gap-1.5 font-medium">
                  {c.is_primary && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                  {c.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.title ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit contact' : 'Add contact'}</DialogTitle>
            <DialogDescription>Contact details for this merchant.</DialogDescription>
          </DialogHeader>
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-title">Title</Label>
              <Input
                id="contact-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="contact-primary"
                checked={form.is_primary}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_primary: !!v }))}
              />
              <Label htmlFor="contact-primary" className="font-normal">
                Primary contact
              </Label>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="contact-form" disabled={pending || !form.name}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
