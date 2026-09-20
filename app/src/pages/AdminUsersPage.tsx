import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listProfiles, updateProfile } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { formatDate, initials } from '@/lib/format'
import { ALL_ROLES, type UserRole } from '@/lib/roles'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()

  const { data: profiles, isLoading } = useQuery({
    queryKey: queryKeys.profiles.all(),
    queryFn: listProfiles,
  })

  const mutation = useMutation({
    mutationFn: (vars: { id: string; patch: { role?: UserRole; is_active?: boolean } }) =>
      updateProfile(vars.id, vars.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all() })
      toast.success('User updated')
    },
    onError: (error: Error) => {
      toast.error("You don't have permission to do that", { description: error.message })
    },
  })

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Manage roles and active status for all users.</p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!!profiles?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="flex items-center gap-2 font-medium">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  {p.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Select
                    value={p.role}
                    onValueChange={(v) => mutation.mutate({ id: p.id, patch: { role: v as UserRole } })}
                  >
                    <SelectTrigger className="h-8 w-32 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => mutation.mutate({ id: p.id, patch: { is_active: v } })}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
