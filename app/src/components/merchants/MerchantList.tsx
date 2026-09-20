import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { listMerchants, MERCHANT_PAGE_SIZE } from '@/api/merchants'
import { queryKeys } from '@/api/queryKeys'
import { NewMerchantSheet } from '@/components/merchants/NewMerchantSheet'
import { MerchantStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { canCreateMerchant } from '@/lib/roles'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['lead', 'onboarding', 'active', 'suspended', 'churned'] as const

export function MerchantList({ selectedId }: { selectedId?: string }) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(0)
  const [newMerchantOpen, setNewMerchantOpen] = useState(false)
  const debouncedQ = useDebouncedValue(q, 300)

  const filters = { q: debouncedQ || undefined, status: status || undefined, page }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.merchants.list(filters),
    queryFn: () => listMerchants(filters),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / MERCHANT_PAGE_SIZE)) : 1

  const openMerchant = (id: string) => {
    const tab = searchParams.get('tab')
    navigate(`/merchants/${id}${tab ? `?tab=${tab}` : ''}`)
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Merchants</h2>
          {canCreateMerchant(role) && (
            <Button size="sm" className="h-7 gap-1" onClick={() => setNewMerchantOpen(true)}>
              <Plus className="size-3.5" />
              New
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
            placeholder="Search merchants…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="h-8 w-full text-sm">
            <SelectValue placeholder="All statuses" />
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
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col p-1.5">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-md p-2.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}

          {!isLoading && data?.data.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No merchants found.</p>
          )}

          {data?.data.map((m) => (
            <button
              key={m.id}
              onClick={() => openMerchant(m.id)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-md p-2.5 text-left text-sm transition-colors hover:bg-accent',
                selectedId === m.id && 'bg-accent',
              )}
            >
              <span className="w-full truncate font-medium">{m.dba_name || m.legal_name}</span>
              <span className="flex w-full items-center justify-between gap-2">
                <MerchantStatusBadge status={m.status} />
                {m.owner && (
                  <span className="truncate text-xs text-muted-foreground">{m.owner.full_name}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t p-2 text-xs text-muted-foreground">
        <span>{data?.count ?? 0} merchants</span>
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

      <NewMerchantSheet
        open={newMerchantOpen}
        onOpenChange={setNewMerchantOpen}
        onCreated={(id) => openMerchant(id)}
      />
    </div>
  )
}
