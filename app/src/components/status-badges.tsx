import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type MerchantStatus = Database['public']['Enums']['merchant_status']
type TicketStatus = Database['public']['Enums']['ticket_status']
type TicketPriority = Database['public']['Enums']['ticket_priority']
type TaskStatus = Database['public']['Enums']['task_status']
type TxnStatus = Database['public']['Enums']['txn_status']

const dot = (className: string) => (
  <span className={cn('size-1.5 rounded-full', className)} aria-hidden />
)

function ColorBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', className)}>
      {children}
    </Badge>
  )
}

const merchantStatusStyles: Record<MerchantStatus, { badge: string; dot: string }> = {
  lead: { badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300', dot: 'bg-sky-500' },
  onboarding: { badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
  active: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
  suspended: { badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500' },
  churned: { badge: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400', dot: 'bg-neutral-400' },
}

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  const s = merchantStatusStyles[status]
  return (
    <ColorBadge className={s.badge}>
      {dot(s.dot)}
      {status}
    </ColorBadge>
  )
}

const ticketStatusStyles: Record<TicketStatus, { badge: string; dot: string }> = {
  open: { badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500' },
  pending: { badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500' },
  resolved: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
  closed: { badge: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400', dot: 'bg-neutral-400' },
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const s = ticketStatusStyles[status]
  return (
    <ColorBadge className={s.badge}>
      {dot(s.dot)}
      {status}
    </ColorBadge>
  )
}

const priorityStyles: Record<TicketPriority, string> = {
  low: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
  normal: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  high: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
  urgent: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <ColorBadge className={priorityStyles[priority]}>{priority}</ColorBadge>
}

const taskStatusStyles: Record<TaskStatus, { badge: string; dot: string }> = {
  todo: { badge: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400', dot: 'bg-neutral-400' },
  in_progress: { badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500' },
  done: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300', dot: 'bg-emerald-500' },
  cancelled: { badge: 'border-neutral-200 bg-neutral-100 text-neutral-400 line-through dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500', dot: 'bg-neutral-400' },
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const s = taskStatusStyles[status]
  return (
    <ColorBadge className={s.badge}>
      {dot(s.dot)}
      {status.replace('_', ' ')}
    </ColorBadge>
  )
}

const txnStatusStyles: Record<TxnStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  refunded: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
  failed: 'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
  chargeback: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
}

export function TxnStatusBadge({ status }: { status: TxnStatus }) {
  return <ColorBadge className={txnStatusStyles[status]}>{status}</ColorBadge>
}
