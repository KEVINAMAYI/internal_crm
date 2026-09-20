import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, Mail, MessageSquare, Phone, Settings, Ticket, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { type ActivityType } from '@/api/activities'
import { getDashboardSummary, getRecentActivity } from '@/api/dashboard'
import { queryKeys } from '@/api/queryKeys'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, initials } from '@/lib/format'

const typeIcon: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  system: Settings,
}

const TYPE_FILTERS: Array<'all' | ActivityType> = ['all', 'note', 'call', 'email', 'meeting', 'system']

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function KpiError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-2 py-6 text-sm text-destructive">
        <span className="flex items-center gap-1.5">
          <AlertCircle className="size-3.5" />
          Couldn't load
        </span>
        <Button variant="ghost" size="sm" className="h-7" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [activityType, setActivityType] = useState<'all' | ActivityType>('all')
  const [limit, setLimit] = useState(20)

  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: getDashboardSummary,
    staleTime: 60_000,
  })

  const activityQuery = useQuery({
    queryKey: queryKeys.dashboard.recentActivity(limit),
    queryFn: () => getRecentActivity(limit),
    staleTime: 30_000,
  })

  const summary = summaryQuery.data
  const activities = activityQuery.data?.filter(
    (a) => activityType === 'all' || a.type === activityType,
  )

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Org-wide overview across every merchant.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryQuery.isLoading && (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        )}

        {summaryQuery.isError && !summaryQuery.isLoading && (
          <>
            <KpiError onRetry={() => summaryQuery.refetch()} />
            <KpiError onRetry={() => summaryQuery.refetch()} />
            <KpiError onRetry={() => summaryQuery.refetch()} />
            <KpiError onRetry={() => summaryQuery.refetch()} />
          </>
        )}

        {summary && !summaryQuery.isLoading && !summaryQuery.isError && (
          <>
            <Card>
              <CardHeader>
                <span className="text-xs font-medium uppercase text-muted-foreground">Total Merchants</span>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2 text-2xl font-semibold">
                  <Building2 className="size-5 text-muted-foreground" />
                  {summary.merchant_count}
                </div>
                <Link to="/merchants" className="text-xs text-primary hover:underline">
                  View merchants →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="text-xs font-medium uppercase text-muted-foreground">Active Merchants</span>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-semibold">{summary.active_merchant_count}</div>
                <Link to="/merchants?status=active" className="text-xs text-primary hover:underline">
                  View active →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="text-xs font-medium uppercase text-muted-foreground">Open Tickets</span>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-2xl font-semibold">
                  <Ticket className="size-5 text-muted-foreground" />
                  {summary.open_ticket_count}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>🔴 urgent {summary.open_tickets_urgent}</span>
                  <span>🟠 high {summary.open_tickets_high}</span>
                  <span>🟡 normal {summary.open_tickets_normal}</span>
                  <span>⚪ low {summary.open_tickets_low}</span>
                </div>
                <Link to="/tickets" className="text-xs text-primary hover:underline">
                  View tickets →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="text-xs font-medium uppercase text-muted-foreground">Overdue Tasks</span>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-semibold">{summary.overdue_task_count}</div>
                <Link to="/tasks?view=team&status=overdue" className="text-xs text-primary hover:underline">
                  View overdue →
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b pb-4">
          <span className="text-sm font-semibold">Recent Activity</span>
          <Select value={activityType} onValueChange={(v) => setActivityType(v as 'all' | ActivityType)}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'all' ? 'All types' : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto pt-4">
          {activityQuery.isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}

          {activityQuery.isError && !activityQuery.isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between gap-2">
                Couldn't load recent activity.
                <Button variant="ghost" size="sm" className="h-7" onClick={() => activityQuery.refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!activityQuery.isLoading && !activityQuery.isError && activities?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          )}

          {activities?.map((a) => {
            const Icon = typeIcon[a.type]
            return (
              <div key={a.id} className="flex gap-3 rounded-lg border p-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {a.author ? initials(a.author.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">{a.author?.full_name ?? 'Unknown'}</span>
                    {a.merchant && (
                      <Link
                        to={`/merchants/${a.merchant.id}?tab=activity`}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                      >
                        {a.merchant.dba_name || a.merchant.legal_name}
                      </Link>
                    )}
                    <span className="text-muted-foreground">· {formatRelativeTime(a.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                </div>
              </div>
            )
          })}

          {!activityQuery.isLoading && !activityQuery.isError && (activityQuery.data?.length ?? 0) >= limit && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 20)}>
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
