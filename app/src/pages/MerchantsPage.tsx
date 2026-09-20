import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2 } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getMerchant } from '@/api/merchants'
import { queryKeys } from '@/api/queryKeys'
import { MerchantHeader } from '@/components/merchants/MerchantHeader'
import { MerchantList } from '@/components/merchants/MerchantList'
import { ActivityTab } from '@/components/merchants/tabs/ActivityTab'
import { ContactsTab } from '@/components/merchants/tabs/ContactsTab'
import { TasksTab } from '@/components/merchants/tabs/TasksTab'
import { TicketsTab } from '@/components/merchants/tabs/TicketsTab'
import { TransactionsTab } from '@/components/merchants/tabs/TransactionsTab'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRealtimeMerchantChannel } from '@/hooks/useRealtimeMerchantChannel'

const TABS = ['activity', 'contacts', 'tickets', 'transactions', 'tasks'] as const

export default function MerchantsPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as (typeof TABS)[number]) || 'activity'

  const isConnected = useRealtimeMerchantChannel(id)

  const {
    data: merchant,
    isLoading,
    error,
  } = useQuery({
    queryKey: id ? queryKeys.merchants.detail(id) : ['merchants', 'detail', 'none'],
    queryFn: () => getMerchant(id!),
    enabled: !!id,
  })

  const onTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="flex h-full">
      <MerchantList selectedId={id} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!id && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <Building2 className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a merchant to view details.</p>
          </div>
        )}

        {id && isLoading && (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {id && error && (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Couldn't load merchant</AlertTitle>
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          </div>
        )}

        {id && merchant && (
          <>
            <MerchantHeader merchant={merchant} onTabChange={onTabChange} />
            <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="flex items-center justify-between border-b px-4">
                <TabsList className="h-10 bg-transparent p-0">
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                </TabsList>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                  {isConnected ? 'live' : 'connecting'}
                </span>
              </div>
              <TabsContent value="activity" className="min-h-0 flex-1">
                <ActivityTab merchantId={id} />
              </TabsContent>
              <TabsContent value="contacts" className="min-h-0 flex-1">
                <ContactsTab merchantId={id} />
              </TabsContent>
              <TabsContent value="tickets" className="min-h-0 flex-1">
                <TicketsTab merchantId={id} />
              </TabsContent>
              <TabsContent value="transactions" className="min-h-0 flex-1">
                <TransactionsTab merchantId={id} />
              </TabsContent>
              <TabsContent value="tasks" className="min-h-0 flex-1">
                <TasksTab merchantId={id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
