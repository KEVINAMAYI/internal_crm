import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, MapPin, Pencil, Ticket, CheckSquare2, MessageSquarePlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { getMerchant, getMerchantSummary, updateMerchant, type MerchantStatus } from '@/api/merchants'
import { queryKeys } from '@/api/queryKeys'
import { EditMerchantSheet } from '@/components/merchants/EditMerchantSheet'
import { MerchantStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/format'
import { canChangeMerchantStatusOrOwner, canEditMerchant } from '@/lib/roles'

const STATUS_OPTIONS: MerchantStatus[] = ['lead', 'onboarding', 'active', 'suspended', 'churned']

type Merchant = Awaited<ReturnType<typeof getMerchant>>

export function MerchantHeader({
  merchant,
  onTabChange,
}: {
  merchant: Merchant
  onTabChange: (tab: string) => void
}) {
  const { role, user } = useAuth()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.merchants.summary(merchant.id),
    queryFn: () => getMerchantSummary(merchant.id),
  })

  const statusMutation = useMutation({
    mutationFn: (status: MerchantStatus) => updateMerchant(merchant.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchants.detail(merchant.id) })
      queryClient.invalidateQueries({ queryKey: ['merchants', 'list'] })
    },
    onError: (error: Error) => {
      toast.error("You don't have permission to do that", { description: error.message })
    },
  })

  const canEdit = canEditMerchant(role, merchant.owner_id, user?.id ?? '')
  const canChangeStatus = canChangeMerchantStatusOrOwner(role, merchant.owner_id, user?.id ?? '')

  return (
    <div className="shrink-0 border-b bg-background px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{merchant.legal_name}</h1>
            {merchant.dba_name && (
              <span className="text-sm text-muted-foreground">dba "{merchant.dba_name}"</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {merchant.mcc && <span>MCC {merchant.mcc}</span>}
            {merchant.owner && <span>Owner: {merchant.owner.full_name}</span>}
            {merchant.country && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {merchant.country}
              </span>
            )}
            {merchant.website && (
              <a
                href={merchant.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <Globe className="size-3.5" />
                Website
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canChangeStatus ? (
            <Select
              value={merchant.status}
              onValueChange={(v) => statusMutation.mutate(v as MerchantStatus)}
            >
              <SelectTrigger className="h-8 w-36 text-sm">
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
          ) : (
            <MerchantStatusBadge status={merchant.status} />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
        {summaryLoading ? (
          <Skeleton className="h-4 w-64" />
        ) : (
          <>
            <span>
              <span className="text-muted-foreground">30-day volume: </span>
              <span className="font-medium">{formatMoney(summary?.volume_cents ?? 0)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Transactions: </span>
              <span className="font-medium">{summary?.txn_count ?? 0}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Open tickets: </span>
              <span className="font-medium">{summary?.open_tickets ?? 0}</span>
            </span>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onTabChange('activity')}>
          <MessageSquarePlus className="size-3.5" />
          Log Activity
        </Button>
        <Button variant="outline" size="sm" onClick={() => onTabChange('tickets')}>
          <Ticket className="size-3.5" />
          New Ticket
        </Button>
        <Button variant="outline" size="sm" onClick={() => onTabChange('tasks')}>
          <CheckSquare2 className="size-3.5" />
          New Task
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Edit Merchant
          </Button>
        )}
      </div>

      <EditMerchantSheet merchant={merchant} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
