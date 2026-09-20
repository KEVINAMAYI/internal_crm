import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import { updateTask, type TaskRow, type TaskStatus } from '@/api/tasks'
import { MerchantCombobox } from '@/components/merchants/MerchantCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']

export function EditTaskSheet({
  task,
  open,
  onOpenChange,
}: {
  task: TaskRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '')
  const [merchantId, setMerchantId] = useState(task.merchant_id ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateTask(task.id, {
        title,
        notes: notes || null,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
        merchant_id: merchantId || null,
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task updated')
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error("You don't have permission to do that", { description: error.message }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
          <SheetDescription>Update task details.</SheetDescription>
        </SheetHeader>
        <form id="edit-task-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title">Title *</Label>
            <Input id="edit-task-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task-notes">Notes</Label>
            <Textarea id="edit-task-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Merchant</Label>
            <MerchantCombobox value={merchantId} onChange={setMerchantId} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-task-due">Due date</Label>
              <Input id="edit-task-due" type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        </form>
        <SheetFooter>
          <Button type="submit" form="edit-task-form" disabled={mutation.isPending || !title}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
