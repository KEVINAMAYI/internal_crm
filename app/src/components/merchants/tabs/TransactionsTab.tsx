import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { useState } from 'react'
import { listTransactions, TRANSACTION_PAGE_SIZE, type TxnStatus } from '@/api/transactions'
import { queryKeys } from '@/api/queryKeys'
import { TxnStatusBadge } from '@/components/status-badges'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatMoney } from '@/lib/format'

const STATUS_OPTIONS: TxnStatus[] = ['pending', 'settled', 'refunded', 'failed', 'chargeback']

export function TransactionsTab({ merchantId }: { merchantId: string }) {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(0)

  const filters = { page, status: (status || undefined) as TxnStatus | undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.transactions.list(merchantId, page, { status }),
    queryFn: () => listTransactions(merchantId, filters),
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.count / TRANSACTION_PAGE_SIZE)) : 1

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Read-only — transactions are ingested from the payments system, no create/edit here.
        </p>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
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

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && data?.data.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Receipt className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No transactions for this merchant yet.</p>
        </div>
      )}

      {!!data?.data.length && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>External ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.processed_at)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(t.amount_cents, t.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{t.currency}</TableCell>
                  <TableCell>
                    <TxnStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.external_id ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {page * TRANSACTION_PAGE_SIZE + 1}–
              {Math.min((page + 1) * TRANSACTION_PAGE_SIZE, data.count)} of {data.count}
            </span>
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
        </>
      )}
    </div>
  )
}
