import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckSquare2, Loader2, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import { createTask, listTasks, updateTask, type TaskRow } from '@/api/tasks'
import { TaskStatusBadge } from '@/components/status-badges'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/format'
import { canWriteTask } from '@/lib/roles'

export function TasksTab({ merchantId }: { merchantId: string }) {
  const { role, user } = useAuth()
  const queryClient = useQueryClient()
  const [newOpen, setNewOpen] = useState(false)

  const listKey = queryKeys.tasks.list({ view: 'team', merchantId })
  const { data: tasks, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => listTasks({ view: 'team', userId: user?.id ?? '', merchantId }),
    enabled: !!user,
  })

  const toggleMutation = useMutation({
    mutationFn: (t: TaskRow) =>
      updateTask(t.id, {
        status: t.status === 'done' ? 'todo' : 'done',
        completed_at: t.status === 'done' ? null : new Date().toISOString(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
    onError: (error: Error) => toast.error("You don't have permission to do that", { description: error.message }),
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {tasks?.length ?? 0} task{tasks?.length === 1 ? '' : 's'}
        </h3>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-3.5" />
          New Task
        </Button>
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {!isLoading && tasks?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <CheckSquare2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tasks for this merchant yet.</p>
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
              <span className={t.status === 'done' ? 'flex-1 truncate line-through text-muted-foreground' : 'flex-1 truncate font-medium'}>
                {t.title}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {t.assignee?.full_name ?? 'Unassigned'}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                Due {formatDate(t.due_date)}
              </span>
              <TaskStatusBadge status={t.status} />
            </div>
          )
        })}
      </div>

      <NewTaskDialog merchantId={merchantId} open={newOpen} onOpenChange={setNewOpen} userId={user?.id ?? ''} listKey={listKey} />
    </div>
  )
}

function NewTaskDialog({
  merchantId,
  open,
  onOpenChange,
  userId,
  listKey,
}: {
  merchantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  listKey: readonly unknown[]
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      createTask({
        merchant_id: merchantId,
        title,
        notes: notes || null,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
        created_by: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey })
      toast.success('Task created')
      onOpenChange(false)
      setTitle('')
      setNotes('')
      setDueDate('')
      setAssigneeId('')
    },
    onError: (error: Error) => toast.error("Couldn't create task", { description: error.message }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>Create a task linked to this merchant.</DialogDescription>
        </DialogHeader>
        <form id="new-task-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea id="task-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="w-full">
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
        </form>
        <DialogFooter>
          <Button type="submit" form="new-task-form" disabled={mutation.isPending || !title}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
