import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2, Plus, TicketIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import {
  createTicket,
  listTicketsForMerchant,
  updateTicket,
  type TicketPriority,
  type TicketRow,
  type TicketStatus,
} from '@/api/tickets'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatRelativeTime } from '@/lib/format'
import { canWriteTickets } from '@/lib/roles'

const STATUS_OPTIONS: TicketStatus[] = ['open', 'pending', 'resolved', 'closed']
const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'normal', 'high', 'urgent']

type Ticket = TicketRow & { assignee: { id: string; full_name: string } | null }

export function TicketsTab({ merchantId }: { merchantId: string }) {
  const { role, user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('ticket'))
  const [newOpen, setNewOpen] = useState(false)
  const canWrite = canWriteTickets(role)

  const listKey = queryKeys.tickets.forMerchant(merchantId)
  const { data: tickets, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => listTicketsForMerchant(merchantId),
  })

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    const t = searchParams.get('ticket')
    if (t) setExpandedId(t)
  }, [searchParams])

  const toggleExpand = (id: string) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    const params = new URLSearchParams(searchParams)
    if (next) params.set('ticket', next)
    else params.delete('ticket')
    setSearchParams(params, { replace: true })
  }

  const patchMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<TicketRow> }) => updateTicket(vars.id, vars.patch),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<Ticket[]>(listKey)
      queryClient.setQueryData<Ticket[]>(listKey, (old) =>
        old?.map((t) => (t.id === vars.id ? { ...t, ...vars.patch } : t)),
      )
      return { previous }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous)
      toast.error("You don't have permission to do that", { description: error.message })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {tickets?.length ?? 0} ticket{tickets?.length === 1 ? '' : 's'}
        </h3>
        {canWrite && (
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" />
            New Ticket
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && tickets?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <TicketIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tickets for this merchant yet.</p>
        </div>
      )}

      <div className="space-y-2">
        {(tickets as Ticket[] | undefined)?.map((t) => (
          <Collapsible key={t.id} open={expandedId === t.id} onOpenChange={() => toggleExpand(t.id)}>
            <div className="rounded-lg border">
              <button
                onClick={() => toggleExpand(t.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"
              >
                {expandedId === t.id ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
                <TicketStatusBadge status={t.status} />
                <TicketPriorityBadge priority={t.priority} />
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {t.assignee?.full_name ?? 'Unassigned'}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                  {formatRelativeTime(t.updated_at)}
                </span>
              </button>
              <CollapsibleContent>
                <div className="space-y-3 border-t px-3 py-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={t.status}
                        disabled={!canWrite}
                        onValueChange={(v) => patchMutation.mutate({ id: t.id, patch: { status: v as TicketStatus } })}
                      >
                        <SelectTrigger className="h-8 w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <Select
                        value={t.priority}
                        disabled={!canWrite}
                        onValueChange={(v) =>
                          patchMutation.mutate({ id: t.id, patch: { priority: v as TicketPriority } })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Assignee</Label>
                      <Select
                        value={t.assignee_id ?? ''}
                        disabled={!canWrite}
                        onValueChange={(v) => patchMutation.mutate({ id: t.id, patch: { assignee_id: v } })}
                      >
                        <SelectTrigger className="h-8 w-40 text-sm">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      <NewTicketDialog
        merchantId={merchantId}
        open={newOpen}
        onOpenChange={setNewOpen}
        userId={user?.id ?? ''}
      />
    </div>
  )
}

function NewTicketDialog({
  merchantId,
  open,
  onOpenChange,
  userId,
}: {
  merchantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}) {
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('normal')

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        merchant_id: merchantId,
        subject,
        description: description || null,
        priority,
        created_by: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.forMerchant(merchantId) })
      toast.success('Ticket created')
      onOpenChange(false)
      setSubject('')
      setDescription('')
      setPriority('normal')
    },
    onError: (error: Error) => toast.error("Couldn't create ticket", { description: error.message }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Ticket</DialogTitle>
          <DialogDescription>Log a support ticket for this merchant.</DialogDescription>
        </DialogHeader>
        <form id="new-ticket-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Subject *</Label>
            <Input id="ticket-subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="new-ticket-form" disabled={mutation.isPending || !subject}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
