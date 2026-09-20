import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, LayoutGrid, List, Ticket as TicketIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import { listTicketQueue, TICKET_QUEUE_PAGE_SIZE, type TicketPriority, type TicketStatus } from '@/api/tickets'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/status-badges'
import { TicketsBoardView } from '@/components/tickets/TicketsBoardView'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: TicketStatus[] = ['open', 'pending', 'resolved', 'closed']
const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'normal', 'high', 'urgent']

export default function TicketsQueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<'list' | 'board'>('list')

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    staleTime: 5 * 60_000,
  })

  const filters = {
    status: (status || undefined) as TicketStatus | undefined,
    priority: (priority || undefined) as TicketPriority | undefined,
    assigneeId: assigneeId || undefined,
    page,
  }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.tickets.queue(filters),
    queryFn: () => listTicketQueue(filters),
    placeholderData: (prev) => prev,
    enabled: view === 'list',
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / TICKET_QUEUE_PAGE_SIZE)) : 1

  const quickFilters = [
    { label: 'All', active: !assigneeId, onClick: () => setAssigneeId('') },
    { label: 'My Tickets', active: assigneeId === user?.id, onClick: () => setAssigneeId(user?.id ?? '') },
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tickets</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {quickFilters.map((f) => (
            <button
              key={f.label}
              aria-pressed={f.active}
              onClick={() => {
                f.onClick()
                setPage(0)
              }}
              className={cn(
                'rounded px-2.5 py-1 text-sm transition-colors',
                f.active ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {view === 'list' && (
          <Select
            value={status || 'all'}
            onValueChange={(v) => {
              setStatus(v === 'all' ? '' : v)
              setPage(0)
            }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={priority || 'all'}
          onValueChange={(v) => {
            setPriority(v === 'all' ? '' : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assigneeId || 'all'}
          onValueChange={(v) => {
            setAssigneeId(v === 'all' ? '' : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {profiles?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors',
                view === 'list' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <List className="size-3.5" />
              List
            </button>
            <button
              aria-pressed={view === 'board'}
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors',
                view === 'board' ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </button>
          </div>
        </div>
      </div>

      {view === 'board' && (
        <TicketsBoardView
          priority={filters.priority}
          assigneeId={filters.assigneeId}
        />
      )}

      {view === 'list' && isLoading && <Skeleton className="h-64 w-full" />}

      {view === 'list' && !isLoading && data?.data.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <TicketIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tickets match these filters.</p>
        </div>
      )}

      {view === 'list' && !!data?.data.length && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/merchants/${t.merchant_id}?tab=tickets&ticket=${t.id}`)}
                >
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.merchant?.dba_name || t.merchant?.legal_name}
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <TicketPriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.assignee?.full_name ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(t.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {page * TICKET_QUEUE_PAGE_SIZE + 1}–
              {Math.min((page + 1) * TICKET_QUEUE_PAGE_SIZE, data.count)} of {data.count}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                disabled={page + 1 >= totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
