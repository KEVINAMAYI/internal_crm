import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthProvider'
import { getProfile } from '@/api/profiles'
import { queryKeys } from '@/api/queryKeys'

export function useMyProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.profiles.me(user?.id),
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
  })
}
