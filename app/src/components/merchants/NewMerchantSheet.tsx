import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { createMerchant } from '@/api/merchants'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
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

const STATUS_OPTIONS = ['lead', 'onboarding', 'active', 'suspended', 'churned'] as const

export function NewMerchantSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [legalName, setLegalName] = useState('')
  const [dbaName, setDbaName] = useState('')
  const [mcc, setMcc] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('lead')
  const [ownerId, setOwnerId] = useState<string>(user?.id ?? '')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: createMerchant,
    onSuccess: (merchant) => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success(`${merchant.legal_name} created`)
      onOpenChange(false)
      resetForm()
      onCreated(merchant.id)
    },
    onError: (error: Error) => {
      toast.error("Couldn't create merchant", { description: error.message })
    },
  })

  const resetForm = () => {
    setLegalName('')
    setDbaName('')
    setMcc('')
    setStatus('lead')
    setOwnerId(user?.id ?? '')
    setWebsite('')
    setCountry('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      legal_name: legalName,
      dba_name: dbaName || null,
      mcc: mcc || null,
      status,
      owner_id: ownerId || null,
      website: website || null,
      country: country || null,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New Merchant</SheetTitle>
          <SheetDescription>Create a merchant record. You can edit details later.</SheetDescription>
        </SheetHeader>
        <form
          id="new-merchant-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="legal-name">Legal name *</Label>
            <Input id="legal-name" required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dba-name">DBA name</Label>
            <Input id="dba-name" value={dbaName} onChange={(e) => setDbaName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mcc">MCC</Label>
              <Input id="mcc" value={mcc} onChange={(e) => setMcc(e.target.value)} placeholder="5411" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-full">
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
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
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
          <Button type="submit" form="new-merchant-form" disabled={mutation.isPending || !legalName}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Create merchant
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
