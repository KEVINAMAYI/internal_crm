import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { listMerchants } from '@/api/merchants'
import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

export function MerchantCombobox({
  value,
  onChange,
  placeholder = 'No merchant (unlinked)',
}: {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 250)

  const { data } = useQuery({
    queryKey: queryKeys.merchants.list({ q: debouncedQ || undefined, page: 0 }),
    queryFn: () => listMerchants({ q: debouncedQ || undefined, pageSize: 20 }),
    enabled: open,
  })

  const selected = data?.data.find((m) => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selected ? selected.dba_name || selected.legal_name : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search merchants…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No merchants found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onChange(''); setOpen(false) }}>
                <Check className={cn('size-4', value ? 'opacity-0' : 'opacity-100')} />
                No merchant (unlinked)
              </CommandItem>
              {data?.data.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={() => {
                    onChange(m.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                  {m.dba_name || m.legal_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
