import { LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useMyProfile } from '@/hooks/useMyProfile'
import { useTheme } from '@/hooks/useTheme'
import { formatDate, initials } from '@/lib/format'
import { roleLabel } from '@/lib/roles'

export default function ProfilePage() {
  const { role, signOut } = useAuth()
  const { data: profile, isLoading } = useMyProfile()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="mx-auto max-w-2xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details and preferences.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="size-12">
            <AvatarFallback>{profile ? initials(profile.full_name) : '…'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{isLoading ? 'Loading…' : profile?.full_name}</CardTitle>
            <CardDescription>{profile?.email}</CardDescription>
          </div>
          <Badge variant="secondary" className="ml-auto font-normal">
            {roleLabel[role]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Member since</div>
              <div>{profile ? formatDate(profile.created_at) : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div>{profile?.is_active ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">Appearance</div>
            <div className="text-muted-foreground">Toggle light / dark theme</div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={() => signOut()}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  )
}
