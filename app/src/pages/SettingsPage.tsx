import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSystemSettings, updateSystemSettings, type SystemSettingsRow } from '@/api/settings'
import { queryKeys } from '@/api/queryKeys'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Database } from '@/lib/database.types'

type TicketPriority = Database['public']['Enums']['ticket_priority']

const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'normal', 'low']

type TicketDefaultsDraft = {
  default_ticket_priority: TicketPriority
  sla_urgent_hours: number
  sla_high_hours: number
  sla_normal_hours: number
  sla_low_hours: number
  sla_urgent_enabled: boolean
  sla_high_enabled: boolean
  sla_normal_enabled: boolean
  sla_low_enabled: boolean
}

function ticketDraftFromRow(row: SystemSettingsRow): TicketDefaultsDraft {
  return {
    default_ticket_priority: row.default_ticket_priority,
    sla_urgent_hours: row.sla_urgent_hours,
    sla_high_hours: row.sla_high_hours,
    sla_normal_hours: row.sla_normal_hours,
    sla_low_hours: row.sla_low_hours,
    sla_urgent_enabled: row.sla_urgent_enabled,
    sla_high_enabled: row.sla_high_enabled,
    sla_normal_enabled: row.sla_normal_enabled,
    sla_low_enabled: row.sla_low_enabled,
  }
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.settings.system(),
    queryFn: getSystemSettings,
  })

  const [ticketDraft, setTicketDraft] = useState<TicketDefaultsDraft | null>(null)

  useEffect(() => {
    if (settings) setTicketDraft(ticketDraftFromRow(settings))
  }, [settings])

  const mutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: (row) => {
      queryClient.setQueryData(queryKeys.settings.system(), row)
      toast.success('Settings saved')
    },
    onError: (error: Error) => {
      toast.error("You don't have permission to do that", { description: error.message })
    },
  })

  const ticketDirty =
    !!settings && !!ticketDraft && JSON.stringify(ticketDraftFromRow(settings)) !== JSON.stringify(ticketDraft)

  const resetTicketDraft = () => settings && setTicketDraft(ticketDraftFromRow(settings))

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Org-level system configuration.</p>
      </div>

      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            Couldn't load settings.
            <Button variant="ghost" size="sm" className="h-7" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ticket Priority &amp; SLA Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {ticketDraft && !isLoading && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Default priority for new tickets</span>
                <Select
                  value={ticketDraft.default_ticket_priority}
                  onValueChange={(v) =>
                    setTicketDraft({ ...ticketDraft, default_ticket_priority: v as TicketPriority })
                  }
                >
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>SLA breach threshold (hours)</TableHead>
                    <TableHead>Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRIORITIES.map((p) => {
                    const hoursKey = `sla_${p}_hours` as const
                    const enabledKey = `sla_${p}_enabled` as const
                    return (
                      <TableRow key={p}>
                        <TableCell className="font-medium capitalize">{p}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-24 text-sm"
                            value={ticketDraft[hoursKey]}
                            onChange={(e) =>
                              setTicketDraft({
                                ...ticketDraft,
                                [hoursKey]: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={ticketDraft[enabledKey]}
                            onCheckedChange={(checked) =>
                              setTicketDraft({ ...ticketDraft, [enabledKey]: checked })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-end gap-2 pt-1">
                {ticketDirty && <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>}
                <Button variant="outline" size="sm" disabled={!ticketDirty} onClick={resetTicketDraft}>
                  Reset
                </Button>
                <Button
                  size="sm"
                  disabled={!ticketDirty || mutation.isPending}
                  onClick={() => ticketDraft && mutation.mutate(ticketDraft)}
                >
                  {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Save Ticket Defaults
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <CardTitle>Notification Defaults</CardTitle>
          <Badge variant="secondary" className="font-normal">
            coming soon
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Email me when a ticket is assigned to me' },
            { label: 'Email me when a task I own becomes overdue' },
            { label: 'Daily digest of open tickets' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Switch checked={false} disabled />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Not available yet</TooltipContent>
              </Tooltip>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <Button size="sm" disabled>
              Save Notification Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
