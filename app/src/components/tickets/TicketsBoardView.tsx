import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { MoreVertical } from 'lucide-react'
import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { queryKeys } from '@/api/queryKeys'
import {
  listTicketQueue,
  updateTicket,
  type TicketPriority,
  type TicketQueueFilters,
  type TicketStatus,
} from '@/api/tickets'
import { TicketPriorityBadge } from '@/components/status-badges'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { canWriteTickets } from '@/lib/roles'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'pending', label: 'Pending' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'closed', label: 'Closed' },
]

const BOARD_COLUMN_PAGE_SIZE = 50
const DRAG_ID_TYPE = 'application/x-ticket-id'
const DRAG_STATUS_TYPE = 'application/x-ticket-status'

type TicketQueueResult = Awaited<ReturnType<typeof listTicketQueue>>
type BoardTicket = TicketQueueResult['data'][number]

export function TicketsBoardView({
  priority,
  assigneeId,
}: {
  priority?: TicketPriority
  assigneeId?: string
}) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canWrite = canWriteTickets(role)
  const [dragOverStatus, setDragOverStatus] = useState<TicketStatus | null>(null)

  // Only set the highlight on dragenter and clear it on drop/dragend (not dragleave) —
  // clearing on dragleave flickers as the pointer crosses card boundaries inside a column.
  useEffect(() => {
    const clear = () => setDragOverStatus(null)
    window.addEventListener('dragend', clear)
    return () => window.removeEventListener('dragend', clear)
  }, [])

  const filtersFor = (status: TicketStatus): TicketQueueFilters => ({
    status,
    priority,
    assigneeId,
    page: 0,
    pageSize: BOARD_COLUMN_PAGE_SIZE,
  })

  const columnQueries = useQueries({
    queries: COLUMNS.map((c) => {
      const filters = filtersFor(c.status)
      return {
        queryKey: queryKeys.tickets.queue(filters),
        queryFn: () => listTicketQueue(filters),
      }
    }),
  })

  type MoveVars = { id: string; from: TicketStatus; to: TicketStatus }
  type MoveContext = {
    previousFrom?: TicketQueueResult
    previousTo?: TicketQueueResult
    fromKey: ReturnType<typeof queryKeys.tickets.queue>
    toKey: ReturnType<typeof queryKeys.tickets.queue>
  }

  const moveMutation = useMutation<unknown, Error, MoveVars, MoveContext>({
    mutationFn: (vars) => updateTicket(vars.id, { status: vars.to }),
    onMutate: async (vars) => {
      const fromKey = queryKeys.tickets.queue(filtersFor(vars.from))
      const toKey = queryKeys.tickets.queue(filtersFor(vars.to))
      await Promise.all([
        queryClient.cancelQueries({ queryKey: fromKey }),
        queryClient.cancelQueries({ queryKey: toKey }),
      ])
      const previousFrom = queryClient.getQueryData<TicketQueueResult>(fromKey)
      const previousTo = queryClient.getQueryData<TicketQueueResult>(toKey)
      const moved = previousFrom?.data.find((t) => t.id === vars.id)
      if (moved && previousFrom) {
        queryClient.setQueryData<TicketQueueResult>(fromKey, {
          data: previousFrom.data.filter((t) => t.id !== vars.id),
          count: previousFrom.count - 1,
        })
        queryClient.setQueryData<TicketQueueResult>(toKey, {
          data: [{ ...moved, status: vars.to }, ...(previousTo?.data ?? [])],
          count: (previousTo?.count ?? 0) + 1,
        })
      }
      return { previousFrom, previousTo, fromKey, toKey }
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousFrom) queryClient.setQueryData(context.fromKey, context.previousFrom)
      if (context?.previousTo) queryClient.setQueryData(context.toKey, context.previousTo)
      toast.error("You don't have permission to do that", { description: error.message })
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.queue(filtersFor(vars.from)) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.queue(filtersFor(vars.to)) })
    },
  })

  const handleDrop = (to: TicketStatus) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverStatus(null)
    if (!canWrite) return
    const id = e.dataTransfer.getData(DRAG_ID_TYPE)
    const from = e.dataTransfer.getData(DRAG_STATUS_TYPE) as TicketStatus
    if (!id || !from || from === to) return
    moveMutation.mutate({ id, from, to })
  }

  const moveTo = (t: BoardTicket, to: TicketStatus) => moveMutation.mutate({ id: t.id, from: t.status, to })

  return (
    <div className="grid flex-1 auto-cols-[minmax(200px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col, i) => {
        const query = columnQueries[i]
        const tickets = query.data?.data ?? []
        const total = query.data?.count ?? tickets.length
        const isDragTarget = dragOverStatus === col.status && canWrite
        const isTruncated = total > tickets.length

        return (
          <div
            key={col.status}
            className={cn(
              'flex flex-col rounded-lg border bg-muted/30 transition-colors',
              isDragTarget && 'border-2 border-dashed border-primary bg-primary/5',
            )}
            onDragEnter={(e) => {
              if (!canWrite) return
              e.preventDefault()
              setDragOverStatus(col.status)
            }}
            onDragOver={(e) => {
              if (!canWrite) return
              e.preventDefault()
            }}
            onDrop={handleDrop(col.status)}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-muted-foreground">{query.isLoading ? '…' : total}</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {query.isLoading && (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              )}

              {!query.isLoading && tickets.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">No tickets</p>
              )}

              {tickets.map((t) => {
                const merchantName = t.merchant?.dba_name || t.merchant?.legal_name || 'Unknown merchant'
                const menuTrigger = (
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={!canWrite}
                      aria-label={`Change status for ${t.subject}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                )

                return (
                  <Card
                    key={t.id}
                    draggable={canWrite}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_ID_TYPE, t.id)
                      e.dataTransfer.setData(DRAG_STATUS_TYPE, t.status)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className={cn('gap-2 py-3 shadow-none transition-shadow hover:shadow-sm', canWrite && 'active:cursor-grabbing')}
                  >
                    <CardContent className="space-y-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/merchants/${t.merchant_id}?tab=tickets&ticket=${t.id}`)}
                        aria-label={`Open ticket: ${t.subject}, ${merchantName}, ${t.priority} priority`}
                        className="block w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <p className="line-clamp-2 text-sm font-medium">{t.subject}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{merchantName}</p>
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <TicketPriorityBadge priority={t.priority} />
                        <span className="truncate text-xs text-muted-foreground">
                          {t.assignee?.full_name ?? 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">{formatRelativeTime(t.updated_at)}</p>
                        <DropdownMenu>
                          {canWrite ? (
                            menuTrigger
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>{menuTrigger}</span>
                              </TooltipTrigger>
                              <TooltipContent>You don't have permission to edit this</TooltipContent>
                            </Tooltip>
                          )}
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {COLUMNS.filter((c) => c.status !== t.status).map((c) => (
                              <DropdownMenuItem key={c.status} onSelect={() => moveTo(t, c.status)}>
                                {c.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {!query.isLoading && isTruncated && (
                <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
                  Showing {tickets.length} of {total} — refine filters to narrow
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
