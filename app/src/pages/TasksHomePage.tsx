import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckSquare2, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { queryKeys } from '@/api/queryKeys'
import { listTasks, updateTask, type TaskRow, type TaskStatus, type TaskView } from '@/api/tasks'
import { EditTaskSheet } from '@/components/tasks/EditTaskSheet'
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog'
import { TaskStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { canWriteTask } from '@/lib/roles'
import { cn } from '@/lib/utils'

const VIEWS: { value: TaskView; label: string }[] = [
  { value: 'mine', label: 'My Tasks' },
  { value: 'assignedByMe', label: 'Assigned by Me' },
  { value: 'team', label: 'Team' },
  { value: 'unlinked', label: 'Unlinked' },
]

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']

export default function TasksHomePage() {
  const { role, user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as TaskView) || 'mine'
  const status = searchParams.get('status') ?? ''
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const filters = {
    view,
    userId: user?.id ?? '',
    status: (status && status !== 'overdue' ? status : undefined) as TaskStatus | undefined,
    overdueOnly: status === 'overdue',
  }
  const listKey = queryKeys.tasks.list(filters)
  const { data: tasks, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => listTasks(filters),
    enabled: !!user,
  })

  const toggleMutation = useMutation({
    mutationFn: (t: TaskRow) =>
      updateTask(t.id, {
        status: t.status === 'done' ? 'todo' : 'done',
        completed_at: t.status === 'done' ? null : new Date().toISOString(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (error: Error) => toast.error("You don't have permission to do that", { description: error.message }),
  })

  const setView = (v: TaskView) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', v)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <CheckSquare2 className="size-3.5" />
          New Task
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={cn(
                'rounded px-2.5 py-1 text-sm transition-colors',
                view === v.value ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            const params = new URLSearchParams(searchParams)
            if (v === 'all') params.delete('status')
            else params.set('status', v)
            setSearchParams(params, { replace: true })
          }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && tasks?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <CheckSquare2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks here.</p>
        </div>
      )}

      <div className="space-y-2">
        {tasks?.map((t) => {
          const canWrite = canWriteTask(role, t.created_by, t.assignee_id, user?.id ?? '')
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <Checkbox
                checked={t.status === 'done'}
                disabled={!canWrite}
                onCheckedChange={() => toggleMutation.mutate(t)}
              />
              <span
                className={cn(
                  'flex-1 truncate',
                  t.status === 'done' ? 'text-muted-foreground line-through' : 'font-medium',
                )}
              >
                {t.title}
              </span>
              {t.merchant ? (
                <Link
                  to={`/merchants/${t.merchant.id}?tab=tasks`}
                  className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-accent sm:inline"
                >
                  {t.merchant.dba_name || t.merchant.legal_name}
                </Link>
              ) : (
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">— unlinked</span>
              )}
              <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                Due {formatDate(t.due_date)}
              </span>
              <TaskStatusBadge status={t.status} />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                disabled={!canWrite}
                onClick={() => setEditing(t)}
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </div>
          )
        })}
      </div>

      {editing && (
        <EditTaskSheet task={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} />
      )}
      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} userId={user?.id ?? ''} />
    </div>
  )
}
