import { useQuery } from '@tanstack/react-query'
import { Building2, CheckSquare2, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalSearch } from '@/api/search'
import { queryKeys } from '@/api/queryKeys'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 200)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const { data } = useQuery({
    queryKey: queryKeys.search.global(debounced),
    queryFn: () => globalSearch(debounced),
    enabled: open && debounced.trim().length > 0,
  })

  const go = (path: string) => {
    onOpenChange(false)
    setQuery('')
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search merchants, tickets, tasks…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!data || (!data.merchants.length && !data.tickets.length && !data.tasks.length) ? (
            <CommandEmpty>{query ? 'No results found.' : 'Start typing to search…'}</CommandEmpty>
          ) : null}

          {!!data?.merchants.length && (
            <CommandGroup heading="Merchants">
              {data.merchants.map((m) => (
                <CommandItem key={m.id} value={`merchant-${m.id}`} onSelect={() => go(`/merchants/${m.id}`)}>
                  <Building2 className="size-4 text-muted-foreground" />
                  <span>{m.dba_name || m.legal_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!data?.tickets.length && (
            <CommandGroup heading="Tickets">
              {data.tickets.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`ticket-${t.id}`}
                  onSelect={() => go(`/merchants/${t.merchant_id}?tab=tickets&ticket=${t.id}`)}
                >
                  <Ticket className="size-4 text-muted-foreground" />
                  <span>{t.subject}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!data?.tasks.length && (
            <CommandGroup heading="Tasks">
              {data.tasks.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`task-${t.id}`}
                  onSelect={() => go(t.merchant_id ? `/merchants/${t.merchant_id}?tab=tasks` : '/tasks?view=unlinked')}
                >
                  <CheckSquare2 className="size-4 text-muted-foreground" />
                  <span>{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
