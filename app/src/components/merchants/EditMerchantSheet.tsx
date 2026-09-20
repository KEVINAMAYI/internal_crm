import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { listProfiles } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import { updateMerchant, type MerchantRow } from '@/api/merchants'
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

export function EditMerchantSheet({
  merchant,
  open,
  onOpenChange,
}: {
  merchant: MerchantRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [legalName, setLegalName] = useState(merchant.legal_name)
  const [dbaName, setDbaName] = useState(merchant.dba_name ?? '')
  const [mcc, setMcc] = useState(merchant.mcc ?? '')
  const [ownerId, setOwnerId] = useState(merchant.owner_id ?? '')
  const [website, setWebsite] = useState(merchant.website ?? '')
  const [country, setCountry] = useState(merchant.country ?? '')

  useEffect(() => {
    if (open) {
      setLegalName(merchant.legal_name)
      setDbaName(merchant.dba_name ?? '')
      setMcc(merchant.mcc ?? '')
      setOwnerId(merchant.owner_id ?? '')
      setWebsite(merchant.website ?? '')
      setCountry(merchant.country ?? '')
    }
  }, [open, merchant])

  const { data: profiles } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateMerchant(merchant.id, {
        legal_name: legalName,
        dba_name: dbaName || null,
        mcc: mcc || null,
        owner_id: ownerId || null,
        website: website || null,
        country: country || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchants.detail(merchant.id) })
      queryClient.invalidateQueries({ queryKey: ['merchants', 'list'] })
      toast.success('Merchant updated')
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error("You don't have permission to do that", { description: error.message })
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Merchant</SheetTitle>
          <SheetDescription>Update {merchant.legal_name}'s details.</SheetDescription>
        </SheetHeader>
        <form
          id="edit-merchant-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-legal-name">Legal name *</Label>
            <Input id="edit-legal-name" required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-dba-name">DBA name</Label>
            <Input id="edit-dba-name" value={dbaName} onChange={(e) => setDbaName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-mcc">MCC</Label>
              <Input id="edit-mcc" value={mcc} onChange={(e) => setMcc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
              <Input id="edit-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-website">Website</Label>
            <Input id="edit-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
          <Button type="submit" form="edit-merchant-form" disabled={mutation.isPending || !legalName}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
