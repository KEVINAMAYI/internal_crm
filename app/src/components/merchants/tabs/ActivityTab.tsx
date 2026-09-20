import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, MessageSquare, Phone, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createActivity, listActivities, type ActivityType } from '@/api/activities'
import { queryKeys } from '@/api/queryKeys'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatRelativeTime, initials } from '@/lib/format'

const typeIcon: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  system: Settings,
}

const TYPE_OPTIONS: ActivityType[] = ['note', 'call', 'email', 'meeting']

export function ActivityTab({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [type, setType] = useState<ActivityType>('note')

  const { data: activities, isLoading } = useQuery({
    queryKey: queryKeys.activities.list(merchantId),
    queryFn: () => listActivities(merchantId),
  })

  const mutation = useMutation({
    mutationFn: () => createActivity({ merchant_id: merchantId, type, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.list(merchantId) })
      setBody('')
    },
    onError: (error: Error) => {
      toast.error("Couldn't log activity", { description: error.message })
    },
  })

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="space-y-2 rounded-lg border p-3">
        <Textarea
          placeholder="Log a note, call, email, or meeting…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!body.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Log activity
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}

        {!isLoading && activities?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity logged yet.</p>
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
                <div className="flex items-center gap-1.5 text-sm">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{a.author?.full_name ?? 'Unknown'}</span>
                  <span className="text-muted-foreground">· {formatRelativeTime(a.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
